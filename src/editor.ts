import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { loadRegistry, watchRegistry } from './connection';
import { buildSnapshot } from './data';
import { cardFields, fieldVisible } from './fields';
import type { CardConfig, HomeAssistant, MetricRole, RegistryData } from './types';

type Override = readonly [key: MetricRole, label: string, help?: string];
const energy: Override[] = [
  ['heatPower', 'Heat output', 'Delivered thermal power, separate from electricity consumption.'],
  ['electricPower', 'Electrical input'],
  ['cop', 'Coefficient of performance', 'Use the reported COP sensor. The card does not calculate a replacement.'],
];
const temperatures: Override[] = [
  ['roomTemperature', 'Room temperature'], ['targetTemperature', 'Target temperature'],
  ['outdoorTemperature', 'Outdoor temperature'], ['supplyTemperature', 'Supply temperature'],
  ['returnTemperature', 'Return temperature'], ['flowRate', 'Water flow'],
];
const pump: Override[] = [
  ...energy, ['supplyTemperature', 'Supply temperature'], ['returnTemperature', 'Return temperature'],
  ['compressorSpeed', 'Compressor speed'], ['outdoorTemperature', 'Outdoor temperature'],
  ['status', 'Operating status'], ['connected', 'Connectivity'], ['defrost', 'Defrosting'],
];
const battery: Override[] = [
  ['charge', 'Thermal charge level', 'Thermal storage percentage, not electrical battery charge.'],
  ['showerMinutes', 'Available shower time'], ['topTemperature', 'Top temperature'],
  ['middleTemperature', 'Middle temperature'], ['bottomTemperature', 'Bottom temperature'],
  ['charging', 'Charging'], ['hotWater', 'Hot water in use'], ['boost', 'Boost'],
];
const chill: Override[] = [
  ['roomTemperature', 'Room temperature'], ['targetTemperature', 'Target temperature'],
  ['fanMode', 'Fan mode'], ['mode', 'Operating mode'], ['status', 'Operating status'],
  ['connected', 'Connectivity'], ['waterWarning', 'Water tank warning'],
];
const status: Override[] = [
  ['mode', 'Operating mode'], ['connected', 'Connectivity'], ['silent', 'Silent mode'],
];

/** Read-only discovery. Configuration events are handled by the Lovelace editor. */
export class QuattCardEditor extends LitElement {
  static properties = {
    hass: { attribute: false }, config: { attribute: false },
    registry: { state: true }, registryError: { state: true },
  };
  declare hass?: HomeAssistant;
  declare config?: CardConfig;
  private registry: RegistryData = { entities: [], devices: [] };
  private registryError = '';
  private registryConnection?: object;
  private registryStop?: () => void;
  private registryLoaded = false;
  private registryPending = false;
  private generation = 0;

  setConfig(config: CardConfig) {
    this.config = { ...config, entities: config.entities ? { ...config.entities } : undefined };
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.hass && !this.registryLoaded && !this.registryPending) void this.refreshRegistry();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.generation++;
    this.registryPending = false;
    this.registryLoaded = false;
    this.registryStop?.();
    this.registryStop = undefined;
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('hass') && this.hass) {
      const key = this.hass.connection || this.hass.callWS || this.hass;
      if (this.registryConnection !== key) {
        this.generation++;
        this.registryPending = false;
        this.registryLoaded = false;
        this.registryStop?.();
        this.registryStop = undefined;
        this.registryConnection = key;
      }
      if (!this.registryPending && !this.registryLoaded) void this.refreshRegistry();
    }
  }

  private async refreshRegistry() {
    const hass = this.hass;
    if (!hass || !this.isConnected) return;
    const generation = ++this.generation;
    this.registryPending = true;
    this.registryConnection = hass.connection || hass.callWS || hass;
    if (!this.registryStop) this.registryStop = watchRegistry(hass, () => { void this.refreshRegistry(); });
    try {
      const registry = await loadRegistry(hass);
      if (generation !== this.generation) return;
      this.registry = registry;
      this.registryError = '';
      this.registryLoaded = true;
    } catch {
      if (generation !== this.generation) return;
      this.registryError = 'Discovery is unavailable. You can still enter entity IDs or use the YAML editor.';
      this.registryLoaded = true;
    } finally {
      if (generation === this.generation) this.registryPending = false;
    }
  }

  private updateConfig(key: keyof CardConfig, value: string | number | boolean | undefined) {
    if (!this.config) return;
    const config = { ...this.config };
    if (key === 'integration_id' && value !== config.integration_id) delete config.device;
    if (value === '' || value === undefined) delete config[key];
    else Object.assign(config, { [key]: value });
    this.emitConfig(config);
  }

  private updateEntity(key: MetricRole, value: string) {
    if (!this.config) return;
    const entities = { ...this.config.entities };
    if (value.trim()) entities[key] = value.trim();
    else delete entities[key];
    const config = { ...this.config };
    if (Object.keys(entities).length) config.entities = entities;
    else delete config.entities;
    this.emitConfig(config);
  }

  private emitConfig(config: CardConfig) {
    this.config = config;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
  }

  private inputValue(event: Event) { return (event.target as HTMLInputElement).value; }
  private toggleField(key:string,enabled:boolean) {
    if(!this.config)return;
    this.emitConfig({...this.config,fields:{...this.config.fields,[key]:enabled}});
  }
  private resetFields() {
    if(!this.config)return;
    const config={...this.config};delete config.fields;this.emitConfig(config);
  }

  private entityField([key, label, help]: Override) {
    return html`<label class="field" for=${key}>
      <span id=${`${key}-label`}>${label}</span>
      <input id=${key} type="text" list="entities" .value=${this.config?.entities?.[key] ?? ''}
        placeholder="Automatic" spellcheck="false" autocomplete="off"
        aria-labelledby=${`${key}-label`} aria-describedby=${help ? `${key}-help` : nothing}
        @change=${(event: Event) => this.updateEntity(key, this.inputValue(event))} />
      ${help ? html`<small id=${`${key}-help`}>${help}</small>` : nothing}
    </label>`;
  }

  render() {
    const config = this.config;
    if (!config) return nothing;
    const isPump = config.type === 'custom:quatt-heat-pump-card';
    const isChill = config.type === 'custom:quatt-chill-card';
    const isDevice = isPump || isChill;
    const isBattery = config.type === 'custom:quatt-heat-battery-card';
    const isHistory = config.type === 'custom:quatt-history-card';
    const isStatus = config.type === 'custom:quatt-status-card';
    const snapshot = this.hass ? buildSnapshot(this.hass, this.registry, { ...config, device: undefined, entities: undefined }) : undefined;
    const installations = snapshot?.installations ?? [];
    const devices = (isPump ? snapshot?.heatPumps : snapshot?.chills) ?? [];
    const overrides = isPump ? pump : isChill ? chill : isBattery ? battery : isHistory ? [...energy,['mode','Operating mode'] as Override] : isStatus ? status : [...energy, ...temperatures.filter(([role])=>!['supplyTemperature','returnTemperature'].includes(role)), ['mode', 'Operating mode'] as Override];
    const stateIds = Object.keys(this.hass?.states ?? {}).filter(id => id.startsWith('sensor.') || id.startsWith('binary_sensor.')).sort();

    return html`<div class="editor">
      <p class="intro">Select your Quatt installation. Leave entity fields empty for automatic discovery.</p>
      ${this.registryError ? html`<p class="notice" role="status">${this.registryError}</p>` : nothing}
      <label class="field" for="title"><span>Title</span>
        <input id="title" .value=${config.title ?? ''} placeholder="Default card title"
          @change=${(event: Event) => this.updateConfig('title', this.inputValue(event))} />
      </label>
      <label class="field" for="integration"><span id="integration-label">Quatt installation</span>
        <select id="integration" aria-labelledby="integration-label"
          @change=${(event: Event) => this.updateConfig('integration_id', this.inputValue(event))}>
          <option value="" .selected=${!config.integration_id}>Automatic</option>
          ${installations.map(item => html`<option value=${item.id} .selected=${config.integration_id === item.id}>${item.name} · ${item.id}</option>`)}
          ${config.integration_id && !installations.some(item => item.id === config.integration_id)
            ? html`<option value=${config.integration_id} .selected=${true}>${config.integration_id} (unavailable)</option>` : nothing}
        </select>
      </label>
      ${isDevice ? html`
        <label class="field" for="device"><span id="device-label">${isPump ? 'Heat pump device' : 'Chill device'}</span>
          <select id="device" aria-labelledby="device-label" aria-describedby="device-help"
            @change=${(event: Event) => this.updateConfig('device', this.inputValue(event))}>
            <option value="" .selected=${!config.device}>All devices</option>
            ${devices.map(device => html`<option value=${device.id} .selected=${config.device === device.id}>${device.name}</option>`)}
            ${config.device && !devices.some(device => device.id === config.device)
              ? html`<option value=${config.device} .selected=${true}>${config.device} (unavailable)</option>` : nothing}
          </select>
          <small id="device-help">Show all units in this installation, or select one device.</small>
        </label>
        <label class="field" for="layout"><span id="layout-label">Layout</span>
          <select id="layout" aria-labelledby="layout-label" aria-describedby="layout-help"
            @change=${(event: Event) => this.updateConfig('layout', this.inputValue(event))}>
            <option value="columns" .selected=${(config.layout ?? 'columns') === 'columns'}>C · Columns (default)</option>
            <option value="stacked" .selected=${config.layout === 'stacked'}>A · Stacked</option>
            <option value="compact" .selected=${config.layout === 'compact'}>B · Compact</option>
          </select>
          <small id="layout-help">Columns shows up to three units per row. Additional units wrap onto a new row.</small>
        </label>` : nothing}
      ${config.type==='custom:quatt-overview-card'?html`<label class="field" for="heat-battery-layout"><span>Heat battery layout</span>
        <select id="heat-battery-layout" aria-label="Heat battery layout" @change=${(event:Event)=>this.updateConfig('heat_battery_layout',this.inputValue(event))}>
          <option value="detailed" .selected=${config.heat_battery_layout!=='minimal'}>Detailed · separate section</option>
          <option value="minimal" .selected=${config.heat_battery_layout==='minimal'}>Minimal · alongside other readings</option>
        </select><small>Minimal adds the selected battery readings to the Room, Target, Outside, and Water flow grid. Choose readings under Displayed fields.</small>
      </label>`:nothing}
      ${isChill ? html`<label class="field" for="show-controls"><span>Unit controls</span>
        <select id="show-controls" aria-label="Unit controls" @change=${(event:Event)=>this.updateConfig('show_controls',this.inputValue(event)==='true')}>
          <option value="true" .selected=${config.show_controls!==false}>Show Controls button</option>
          <option value="false" .selected=${config.show_controls===false}>Hide controls (display only)</option>
        </select><small>Open each unit’s Home Assistant climate panel for temperature, mode, and fan controls.</small>
      </label>`:nothing}
      ${isHistory ? html`<label class="field" for="hours"><span id="hours-label">History range</span>
        <select id="hours" aria-labelledby="hours-label" @change=${(event: Event) => this.updateConfig('hours', Number(this.inputValue(event)))}>
          ${[6, 12, 24, 48].map(hours => html`<option value=${hours} .selected=${(config.hours ?? 24) === hours}>Last ${hours} hours</option>`)}
        </select>
      </label>` : nothing}
      <details><summary>Displayed fields</summary>
        <p class="help">Choose which readings to show. Missing optional equipment is omitted. Hiding a field does not change the equipment.</p>
        <div class="field-options">${(cardFields[config.type]||[]).map(field=>html`<label class="field-option"><input type="checkbox" aria-label=${field.label} .checked=${fieldVisible(config,field.key)} @change=${(event:Event)=>this.toggleField(field.key,(event.target as HTMLInputElement).checked)} /><span>${field.label}</span></label>`)}</div>
        <button class="reset-fields" @click=${()=>this.resetFields()}>Reset displayed fields</button>
      </details>
      <details><summary>Entity overrides</summary>
        <p class="help">Optional sensor sources. Empty fields restore automatic discovery. ${isDevice ? 'Overrides apply only to the selected device.' : isBattery ? 'Overrides apply to this installation’s thermal heat battery.' : 'Overrides apply to this card’s system readings.'}</p>
        ${isDevice && !config.device
          ? html`<p class="help">Select one device before adding overrides.</p>`
          : overrides.map(field => this.entityField(field))}
      </details>
      <datalist id="entities">${stateIds.map(id => html`<option value=${id}>${String(this.hass?.states[id].attributes.friendly_name ?? id)}</option>`)}</datalist>
    </div>`;
  }

  static styles = css`
    :host { display: block; color: var(--primary-text-color, #202523); font-family: var(--paper-font-body1_-_font-family, inherit); }
    .editor { display: grid; gap: 16px; padding: 4px 0 12px; }
    p { margin: 0; line-height: 1.5; }
    .intro, .help, small { color: var(--secondary-text-color, #68716b); font-size: 13px; }
    .field { display: grid; gap: 7px; font-size: 14px; min-width: 0; }
    .field > span { font-weight: 500; }
    input, select { box-sizing: border-box; width: 100%; min-height: 44px; min-width: 0; border: 1px solid var(--divider-color, #d4dcd6); border-radius: 8px; padding: 10px 12px; color: var(--primary-text-color, #202523); background: var(--card-background-color, #fff); font: inherit; }
    input:focus-visible, select:focus-visible, summary:focus-visible { outline: 2px solid var(--primary-color, #327965); outline-offset: 2px; }
    small { line-height: 1.4; }
    .notice { padding: 12px; border: 1px solid var(--divider-color, #d4dcd6); border-radius: 8px; font-size: 13px; }
    details { border-top: 1px solid var(--divider-color, #d4dcd6); padding-top: 8px; }
    details > .field, details > .help { margin-top: 16px; }
    summary { min-height: 44px; display: list-item; align-content: center; cursor: pointer; font-weight: 500; font-size: 14px; }
    .field-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px;margin-top:8px}
    .field-option{display:flex;align-items:center;gap:10px;min-height:44px;min-width:0;font-size:13px;cursor:pointer}.field-option span{overflow-wrap:anywhere}
    .field-option input{width:18px;height:18px;min-height:18px;flex:none;padding:0;accent-color:var(--primary-color,#327965)}
    .reset-fields{font:inherit;font-size:13px;color:var(--primary-text-color,#202523);background:transparent;border:1px solid var(--divider-color,#d4dcd6);border-radius:8px;min-height:44px;padding:8px 12px;margin-top:8px;cursor:pointer}
    .reset-fields:focus-visible{outline:2px solid var(--primary-color,#327965);outline-offset:2px}
    @media(max-width:450px){.field-options{grid-template-columns:1fr}}
  `;
}
