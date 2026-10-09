import { css, html, nothing, svg } from 'lit';
import { BaseCard } from '../base-card';
import { historyValueAt, loadHistory, type HistoryPoint, type HistoryResult, type HistorySource } from '../history';
import type { CardConfig } from '../types';
import { historyModes } from '../data/modes';

type Series = HistorySource & { label: string; color: string };

export class QuattHistoryCard extends BaseCard {
  static properties = { width: { state: true }, rangeHours: { state: true }, selectedTime: { state: true }, history: { state: true }, loading: { state: true } };
  private width = 900;
  private rangeHours = 24;
  private selectedTime: number | null = null;
  private history?: HistoryResult;
  private loading = false;
  private observer?: ResizeObserver;
  private resizeFrame = 0;
  private requestSignature = '';
  private historyConnectionKey?: object;
  private generation = 0;

  static styles = [BaseCard.styles, css`
    ha-card{min-height:410px}.mode-legend{display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--qc-secondary);margin:10px 0}.mode-legend span{display:flex;align-items:center;gap:5px}.mode-legend i{width:8px;height:8px;border-radius:50%;background:var(--color)}
    .ob-header { margin-bottom:12px; }
    .topline { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
    .period { color:var(--qc-secondary); font-size:12px; }
    .ranges { display:flex; flex-shrink:0; gap:2px; padding:3px; background:var(--qc-subtle); border-radius:8px; }
    .ranges button { border:0; background:transparent; padding:5px 9px; border-radius:5px; font-size:12px; }
    .ranges button[aria-pressed=true] { background:var(--ha-card-background,var(--card-background-color,#fff)); color:var(--primary-color,#0288d1); }
    .chart { border-radius:4px; touch-action:pan-y; }
    .chart svg { display:block; width:100%; overflow:visible; }
    .chart text { font-family:inherit; font-size:11px; fill:var(--qc-secondary); }
    .axis { stroke:var(--qc-line); stroke-width:1; }
    .line { fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
    .selected { stroke:var(--primary-text-color,#202530); stroke-width:1; stroke-opacity:.5; }
    .legend { display:flex; flex-wrap:wrap; gap:8px 18px; font-size:12px; color:var(--qc-secondary); margin-top:12px; }
    .legend button { display:flex; gap:6px; align-items:center; padding:0; border:0; background:none; color:inherit; font-size:inherit; }
    .dot { width:8px; height:8px; border-radius:50%; background:var(--color); }
    .inspector { border-top:1px solid var(--qc-line); margin-top:14px; padding-top:11px; display:flex; gap:6px 18px; flex-wrap:wrap; font-size:12px; }
    .inspector strong { font-weight:600; }
    .inspector button { border:0; padding:0; background:none; color:var(--qc-secondary); font-size:inherit; }
    .value { color:var(--primary-text-color,#202530); }
    .inspect-hint,.footnote { color:var(--qc-secondary); font-size:11px; margin:11px 0 0; }
    .footnote { line-height:1.5; }
    .empty { min-height:200px; display:grid; place-content:center; gap:8px; text-align:center; color:var(--qc-secondary); font-size:13px; padding:10px; }
    .empty strong { color:var(--primary-text-color,#202530); font-size:16px; }
    @container(max-width:450px) { .topline{margin-bottom:7px;gap:8px;} .period{font-size:11px;} .ranges button{padding:5px 8px;} .legend{gap:8px 13px;} .inspector{gap:7px 12px;} }
  `];

  static getStubConfig() { return { type: 'custom:quatt-history-card', hours: 24 }; }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: 12, rows: 'auto', min_columns: 6, min_rows: 5 }; }
  setConfig(config: CardConfig) {
    super.setConfig(config);
    this.rangeHours = Math.min(48, Math.max(1, Number.isFinite(config.hours) ? config.hours! : 24));
    this.requestSignature = ''; this.generation++;
  }
  connectedCallback() {
    super.connectedCallback();
    this.requestSignature = '';
    this.observer = new ResizeObserver(entries => {
      const measured = Math.max(260, Math.floor(entries[0].contentRect.width - 40));
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame=requestAnimationFrame(()=>{if(this.isConnected&&measured!==this.width)this.width=measured;});
    });
    this.observer.observe(this);
  }
  disconnectedCallback() { this.generation++; cancelAnimationFrame(this.resizeFrame); this.observer?.disconnect(); super.disconnectedCallback(); }
  protected updated() { queueMicrotask(()=>{void this.refreshHistory();}); }

  private get series(): Series[] {
    const definitions = [
      { role: 'heatPower', label: 'Heat output', color: 'var(--qc-heat)', kind: 'power' },
      { role: 'electricPower', label: 'Electric input', color: 'var(--qc-electric)', kind: 'power' },
      { role: 'cop', label: 'COP', color: 'var(--qc-good)', kind: 'cop' },
      { role: 'mode', label: 'Mode', color: 'var(--qc-secondary)', kind: 'mode' },
    ] as const;
    return definitions.flatMap(definition => {
      const reading = this.snapshot.system[definition.role];
      if (!reading?.entityId || !this.showField(definition.role)) return [];
      const unit = this.hass.states[reading.entityId]?.attributes.unit_of_measurement;
      return [{ ...definition, entityId: reading.entityId, unit: typeof unit === 'string' ? unit : reading.unit }];
    });
  }
  private async refreshHistory() {
    if (!this.isConnected || !this.config) return;
    const sources = this.series;
    const key = this.hass.connection || this.hass.callApi || this.hass;
    const signature = JSON.stringify([sources, this.rangeHours, Math.floor(Date.now() / 60_000)]);
    if (signature === this.requestSignature && key === this.historyConnectionKey) return;
    const changedSource = this.historyConnectionKey !== key || this.history && sources.some(source => !(source.entityId in this.history!.series));
    this.historyConnectionKey = key; this.requestSignature = signature;
    const generation = ++this.generation;
    if (changedSource) this.history = undefined;
    this.loading = true;
    const result = await loadHistory(this.hass, sources, this.rangeHours);
    if (!this.isConnected || generation !== this.generation) return;
    this.history = result; this.loading = false;
    if (this.selectedTime != null) this.selectedTime = Math.max(result.start, Math.min(result.end, this.selectedTime));
  }
  private get plotLeft() { return this.width < 450 ? 43 : 56; }
  private get plotRight() { return this.width - 9; }
  private x(time: number) {
    const result = this.history!;
    return this.plotLeft + (time - result.start) / (result.end - result.start) * (this.plotRight - this.plotLeft);
  }
  private timeLabel(time: number, full = false) {
    const format: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: this.hass.config?.time_zone };
    const preference = this.hass.locale?.time_format;
    if (preference === '12' || preference === '24') format.hour12 = preference === '12';
    if (full) { format.month = 'short'; format.day = 'numeric'; format.timeZoneName = 'short'; }
    try { return new Intl.DateTimeFormat(this.hass.locale?.language || this.hass.language || 'en', format).format(time); }
    catch { return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(time); }
  }
  private linePath(points: HistoryPoint[], y: (value: number) => number) {
    let previous: HistoryPoint | undefined;
    const segments: string[] = [];
    for (const point of points) {
      const x = this.x(point.time).toFixed(2);
      if (previous?.value != null) segments.push(`L${x},${y(previous.value).toFixed(2)}`);
      if (point.value != null) segments.push(`${previous?.value != null ? 'L' : 'M'}${x},${y(point.value).toFixed(2)}`);
      previous = point;
    }
    return segments.join(' ');
  }
  private renderPlot(series: Series[], top: number, height: number, label: string) {
    const values = series.flatMap(series => (this.history!.series[series.entityId] || []).flatMap(point => point.value == null ? [] : [point.value]));
    const min = values.reduce((lowest, value) => Math.min(lowest, value), 0);
    const peak = values.reduce((highest, value) => Math.max(highest, value), 0);
    const max = peak === min ? min + 1 : peak + (peak - min) * .08;
    const y = (value: number) => top + height - (value - min) / (max - min) * height;
    return svg`<text x="0" y=${top - 10}>${label}</text>
      ${[min, (max + min) / 2, max].map(value => svg`<line class="axis" x1=${this.plotLeft} x2=${this.plotRight} y1=${y(value)} y2=${y(value)}/><text x=${this.plotLeft - 8} y=${y(value) + 3} text-anchor="end">${this.format(value, '', 1)}</text>`)}
      ${series.map(series => svg`<path class="line" data-series=${series.kind} d=${this.linePath(this.history!.series[series.entityId] || [], y)} stroke=${series.color}/>`)}
      ${!values.length ? svg`<text x=${(this.plotLeft + this.plotRight) / 2} y=${top + height / 2} text-anchor="middle">No recorded measurements</text>` : nothing}`;
  }
  private setTime(event: PointerEvent) {
    if (!this.history) return;
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * this.width;
    const fraction = Math.max(0, Math.min(1, (x - this.plotLeft) / (this.plotRight - this.plotLeft)));
    this.selectedTime = this.history.start + fraction * (this.history.end - this.history.start);
  }
  private key(event: KeyboardEvent) {
    if (!this.history) return;
    const { start, end } = this.history;
    const step = (end - start) / 96;
    let time = this.selectedTime ?? end;
    if (event.key === 'ArrowLeft') time -= step;
    else if (event.key === 'ArrowRight') time += step;
    else if (event.key === 'Home') time = start;
    else if (event.key === 'End') time = end;
    else if (event.key === 'Escape') { event.preventDefault(); this.selectedTime = null; return; }
    else return;
    event.preventDefault(); this.selectedTime = Math.max(start, Math.min(end, time));
  }
  private selectRange(hours: number) { this.rangeHours = hours; }
  private modeSegments() {
    const source=this.series.find(s=>s.kind==='mode');
    const points=source&&this.history?.series[source.entityId]||[];
    const segments:{start:number;end:number;value:number}[]=[];
    for(let i=0;i<points.length-1;i++){
      const point=points[i],end=points[i+1].time;
      if(point.value==null||!historyModes[point.value]||end<=point.time)continue;
      const previous=segments.at(-1);
      if(previous&&previous.value===point.value&&previous.end===point.time)previous.end=end;
      else segments.push({start:point.time,end,value:point.value});
    }
    return segments;
  }
  private inspectedValue(source:Series,time:number){
    const value=historyValueAt(this.history?.series[source.entityId]||[],time);
    return source.kind==='mode'?(value==null?'—':historyModes[value]?.label||'—'):this.format(value,source.kind==='power'?'kW':'',2);
  }

  protected render() {
    const sources = this.series;
    const result = this.history;
    const hasData = result && sources.some(s=>(result.series[s.entityId]||[]).some(p=>p.value!=null));
    const powers = sources.filter(source => source.kind === 'power'), cops = sources.filter(source => source.kind === 'cop');
    const compact = this.width < 450;
    const powerTop = 25, powerHeight = compact ? 94 : 114;
    const copTop = powers.length ? powerTop + powerHeight + 38 : powerTop, copHeight = compact ? 43 : 53;
    const chartBottom = cops.length ? copTop + copHeight : powers.length ? powerTop + powerHeight : powerTop;
    const modeSegments=this.modeSegments(),hasMode=modeSegments.length>0;
    const chartHeight = chartBottom + (hasMode?60:30);
    const selected = this.selectedTime ?? result?.end ?? Date.now();
    const inspected = result ? `${this.timeLabel(selected, true)}. ${sources.map(source => `${source.label} ${this.inspectedValue(source,selected)}`).join('. ')}` : '';
    const rangeChoices = [6, 12, 24];
    if (!rangeChoices.includes(this.rangeHours)) rangeChoices.push(this.rangeHours);
    rangeChoices.sort((a, b) => a - b);
    return html`<ha-card>
      ${this.renderHeader('Heating history')}${this.renderNotice()}
      <div class="topline"><span class="period">Last ${this.format(this.rangeHours, 'hours', 0)}</span><div class="ranges" role="group" aria-label="History range">${rangeChoices.map(hours => html`<button aria-pressed=${hours === this.rangeHours} @click=${() => this.selectRange(hours)}>${hours}h</button>`)}</div></div>
      ${hasData ? html`<div class="chart" tabindex="0" role="slider" aria-label="Inspect heating history. Use left and right arrow keys to move through recorded measurements." aria-valuemin="0" aria-valuemax=${Math.round((result.end - result.start) / 60_000)} aria-valuenow=${Math.round((selected - result.start) / 60_000)} aria-valuetext=${inspected} aria-busy=${this.loading}
        @focus=${() => { this.selectedTime ??= result.end; }} @pointermove=${(event: PointerEvent) => { if (event.pointerType === 'mouse') this.setTime(event); }} @pointerdown=${(event: PointerEvent) => this.setTime(event)} @keydown=${(event: KeyboardEvent) => this.key(event)}>
        <svg viewBox=${`0 0 ${this.width} ${chartHeight}`} aria-hidden="true">
          ${powers.length ? this.renderPlot(powers, powerTop, powerHeight, 'kW') : nothing}
          ${cops.length ? this.renderPlot(cops, copTop, copHeight, 'COP') : nothing}
          ${Array.from({ length: compact ? 3 : 5 }, (_, i) => i / (compact ? 2 : 4)).map(fraction => {
            const time = result.start + fraction * (result.end - result.start), x = this.x(time);
            return svg`<line class="axis" x1=${x} x2=${x} y1=${powerTop} y2=${chartBottom} stroke-opacity=".45"/><text x=${x} y=${chartBottom + 24} text-anchor=${fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}>${this.timeLabel(time)}</text>`;
          })}
          ${hasMode?svg`<g class="mode-strip"><text x="0" y=${chartBottom+48}>Mode</text><rect class="mode-track" x=${this.plotLeft} y=${chartBottom+40} width=${this.plotRight-this.plotLeft} height="10" rx="5" fill="var(--qc-subtle)"/>${modeSegments.map(s=>svg`<rect class="mode-segment" x=${this.x(s.start)} y=${chartBottom+40} width=${this.x(s.end)-this.x(s.start)} height="10" fill=${historyModes[s.value].color}><title>${historyModes[s.value].label}</title></rect>`)}</g>`:nothing}
          ${this.selectedTime != null ? svg`<line class="selected" x1=${this.x(selected)} x2=${this.x(selected)} y1=${powerTop} y2=${chartBottom}/>` : nothing}
        </svg>
      </div>
      <div class="legend" aria-label="Chart series">${sources.filter(s=>s.kind!=='mode').map(source => html`<button @click=${() => this.moreInfo(source.entityId)} aria-label=${`Open ${source.label} sensor details`}><i class="dot" style=${`--color:${source.color}`}></i>${source.label}</button>`)}</div>
      ${hasMode?html`<div class="mode-legend" aria-label="Operating modes">${[...new Set(modeSegments.map(s=>s.value))].map(value=>html`<span><i style=${`--color:${historyModes[value].color}`}></i>${historyModes[value].label}</span>`)}</div>`:nothing}
      ${this.selectedTime != null ? html`<div class="inspector"><strong>${this.timeLabel(selected, true)}</strong>${sources.map(source => html`<button @click=${() => this.moreInfo(source.entityId)}>${source.label} <span class="value">${this.inspectedValue(source,selected)}</span></button>`)}</div>` : html`<p class="inspect-hint">Touch or use arrow keys to inspect a measurement.</p>`}
      <details class="footnote"><summary>Recorded measurements</summary>States are held until their next update. Unavailable periods remain gaps. COP is reported by Quatt.</details>` : html`<div class="empty" role="status"><strong>${this.loading ? 'Loading history…' : 'History unavailable'}</strong><span>${this.loading ? 'Reading recorded Quatt measurements.' : result?.error || (sources.length ? 'No measurements were recorded in this period. Check Recorder and the selected sensors.' : 'No supported power or COP sensors are available.')}</span></div>`}
    </ha-card>`;
  }
}
