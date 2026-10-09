import { LitElement, html, type PropertyValues, type CSSResultGroup } from 'lit';
import type { CardConfig, HomeAssistant, RegistryData, Snapshot, Reading } from './types';
import { buildSnapshot } from './data';
import { loadRegistry, watchRegistry } from './connection';
import { cardStyles, icon } from './ui';

export abstract class BaseCard extends LitElement {
  static styles: CSSResultGroup = cardStyles;
  protected config!: CardConfig;
  private _hass?: HomeAssistant;
  protected registry: RegistryData = { entities: [], devices: [] };
  private cached?: Snapshot;
  private registryError = '';
  private registryLoading = false;
  private registryLoaded = false;
  private connectionKey?: object;
  private registryStop?: () => void;
  private contextStop?: () => void;
  private timer?: ReturnType<typeof setInterval>;
  private registryGeneration = 0;
  private trackedIds = new Set<string>();

  get hass(): HomeAssistant { return this._hass || { states: {} }; }
  set hass(value: HomeAssistant) {
    const old = this._hass;
    this._hass = value;
    const key = value.connection || value.callWS || value;
    if(this.connectionKey !== key) {
      this.connectionKey = key; this.registryStop?.(); this.registryStop = undefined;
      this.registryLoaded = false; this.registryGeneration++; this.cached = undefined;
    }
    const relevant = !old || !this.cached || old.locale !== value.locale || old.language !== value.language || old.config !== value.config || old.themes !== value.themes
      || [...this.trackedIds].some(id => old.states[id] !== value.states[id]);
    if (!this.registryLoaded) void this.ensureRegistry();
    if (relevant) this.invalidate();
  }
  protected get snapshot(): Snapshot {
    if (!this.cached) {
      this.cached = buildSnapshot(this.hass, this.registry, this.config, new Date());
      this.trackedIds = new Set(this.registry.entities.filter(e => e.platform === 'quatt').map(e => e.entity_id));
      for (const e of Object.values(this.config?.entities || {})) this.trackedIds.add(e);

      const visit = (v: unknown): void => {
        if (!v || typeof v !== 'object') return;
        for (const [key, val] of Object.entries(v)) {
          if ((key === 'entityId' || key.endsWith('_entity')) && typeof val === 'string') this.trackedIds.add(val);
          else if (typeof val === 'object') visit(val);
        }
      };
      visit(this.cached);
    }
    return this.cached;
  }
  setConfig(config: CardConfig) {
    if (!config || !config.type?.startsWith('custom:quatt-')) throw new Error('Select a Quatt card type.');
    if (config.entities && (typeof config.entities !== 'object' || Array.isArray(config.entities))) throw new Error('entities must map data roles to entity IDs.');
    if (config.layout && !['columns','stacked','compact'].includes(config.layout)) throw new Error('layout must be columns, stacked, or compact.');
    if (config.show_controls !== undefined && typeof config.show_controls !== 'boolean') throw new Error('show_controls must be true or false.');
    if (config.hours !== undefined && (!Number.isFinite(config.hours) || config.hours < 1 || config.hours > 48)) throw new Error('hours must be between 1 and 48.');
    this.config = { ...config, entities: { ...config.entities } };
    this.invalidate();
  }
  static getConfigElement() { return document.createElement('quatt-card-editor'); }
  static getStubConfig() { return { type: `custom:${this.name}` }; }
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, rows: 'auto', min_columns: 6, min_rows: 3 }; }
  connectedCallback() {
    super.connectedCallback();
    const request = new CustomEvent('context-request', { bubbles: true, composed: true });
    Object.assign(request, { context: 'states', subscribe: true,
      callback: (states: HomeAssistant['states'], unsubscribe?: () => void) => {
        if (unsubscribe) this.contextStop = unsubscribe;
        if (this._hass) this.hass = { ...this._hass, states };
      },
    });
    this.dispatchEvent(request);
    this.timer = setInterval(() => this.invalidate(), 60_000);
    void this.ensureRegistry();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.timer); this.contextStop?.(); this.contextStop = undefined;
    this.registryStop?.(); this.registryStop = undefined; this.registryGeneration++;
  }
  private async ensureRegistry() {
    if (!this._hass || !this.isConnected || this.registryLoading) return;
    this.registryLoading = true;
    const generation = this.registryGeneration;
    if (!this.registryStop) this.registryStop = watchRegistry(this._hass, () => { void this.ensureRegistry(); });
    try {
      const registry = await loadRegistry(this._hass);
      if (generation !== this.registryGeneration) return;
      this.registry = registry; this.registryLoaded = true; this.registryError = ''; this.invalidate();
    } catch { this.registryError = 'Could not read the entity registry. Reload the dashboard to retry.'; this.invalidate(); }
    finally {
      this.registryLoading = false;
      if(generation !== this.registryGeneration && this.isConnected) void this.ensureRegistry();
    }
  }
  protected invalidate() { this.cached = undefined; this.requestUpdate(); }
  protected shouldUpdate(_changed: PropertyValues) { return Boolean(this.config && this._hass); }
  protected format(value: number | null, unit: string, digits = 1) {
    if (value == null || !Number.isFinite(value)) return '—';
    if (unit === 'W' && Math.abs(value) >= 1000) { value /= 1000; unit = 'kW'; }
    else if (unit === 'W') digits = 0;
    const locale = this.hass.locale?.language || this.hass.language || 'en';
    const format = this.hass.locale?.number_format;
    const numberLocale = format === 'decimal_comma' ? 'de' : format === 'comma_decimal' ? 'en' : format === 'space_comma' ? 'fr' : locale;
    let number: string;
    try { number = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: digits }).format(value); }
    catch { number = value.toFixed(digits); }
    return `${number}${unit ? ` ${unit}` : ''}`;
  }
  protected moreInfo(entityId?: string) {
    if (!entityId || !/^(sensor|binary_sensor)\./.test(entityId)) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
  }
  protected reading(reading?: Reading, digits = 1) {
    if (reading?.entityId?.startsWith('binary_sensor.') && reading.value != null) return reading.value === 1 ? 'On' : 'Off';
    return reading?.value != null ? this.format(reading.value, reading.unit, digits) : reading?.text || '—';
  }
  protected value(reading: Reading | undefined, label: string, className = 'value', digits = 1) {
    const text = this.reading(reading, digits);
    return reading?.entityId && /^(sensor|binary_sensor)\./.test(reading.entityId)
      ? html`<button class=${`reading ${className}`} aria-label=${`${label}: ${text}. Show details`} @click=${()=>this.moreInfo(reading.entityId)}>${text}</button>`
      : html`<span class=${className}>${text}</span>`;
  }
  protected metric(label: string, reading?: Reading, optional = false, digits = 1) {
    if (optional && !reading) return html``;
    return html`<div class="stat"><span class="label">${label}</span>${this.value(reading,label,'value',digits)}</div>`;
  }
  protected deviceField(label: string, reading: Reading | undefined, symbol: string, tone = '', digits = 1) {
    return html`<div class=${`device-field ${tone}`}>${icon(symbol)}<div>${this.value(reading,label,'value',digits)}<span class="label">${label}</span></div></div>`;
  }
  protected on(reading?: Reading) { return reading?.value === 1 || ['on','true','yes','connected'].includes(reading?.text?.toLowerCase() || ''); }
  protected renderHeader(defaultTitle: string, subtitle?: string) {
    return html`<div class="ob-header"><h2>${this.config.title || defaultTitle}</h2>${subtitle ? html`<span class="subtitle">${subtitle}</span>` : ''}</div>`;
  }
  protected renderNotice() {
    const error = this.registryError || this.snapshot.error;
    if (error) return html`<div class="notice error" role="status">${error}</div>`;
    return this.snapshot.warnings.length ? html`<details class="notice"><summary>Data availability</summary>${this.snapshot.warnings.map(w => html`<p>${w}</p>`)}</details>` : html``;
  }
}
