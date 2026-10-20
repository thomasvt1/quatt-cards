import { css, html, nothing } from 'lit';
import { BaseCard } from '../base-card';
import { icon } from '../ui';
import type { CardConfig, MetricRole, QuattDevice } from '../types';
export class QuattHeatBatteryCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-heat-battery-card'}; }
  setConfig(config: CardConfig) {
    super.setConfig(config);
    this.toggleAttribute('slim',config.layout==='slim');
  }
  getCardSize() { return this.config?.layout==='slim' ? 2 : super.getCardSize(); }
  getGridOptions() {
    if (this.config?.layout==='slim') return {...super.getGridOptions(),min_rows:2};
    return super.getGridOptions();
  }
  static styles=[BaseCard.styles,css`
    ha-card{min-height:385px;display:flex;flex-direction:column}.charge{display:grid;grid-template-columns:70px minmax(0,1fr);gap:18px;align-items:center;margin:18px 0 28px}
    .tank .icon{width:70px;height:119px;stroke-width:.5}.charge .value{font-size:var(--qc-value-size,31px)}.charge-title{margin-bottom:7px}
    .meter{height:10px;border-radius:5px;background:var(--qc-line);overflow:hidden}.fill{height:100%;background:var(--qc-heat);border-radius:inherit}
    .shower{font-size:12px;margin-top:10px}.shower .value{font-size:var(--qc-value-size,12px);font-weight:400}
    .temperatures{display:grid;grid-template-columns:repeat(var(--count,3),minmax(0,1fr));padding:20px 0;border-top:1px solid var(--qc-line)}.temperatures .stat{align-items:center;text-align:center;padding:0 8px}.temperatures .stat+.stat{border-left:1px solid var(--qc-line)}
    .temperatures .value{font-size:var(--qc-value-size,14px)}.temperatures .label{font-size:11px}
    .battery-heading{display:flex;align-items:center;gap:10px;margin-bottom:18px}.battery-heading .ob-header{flex:1;min-width:0;margin-bottom:0}
    .details{margin-top:15px;font-size:12px;color:var(--qc-secondary)}summary{cursor:pointer}.details .stat-grid{margin-top:14px}.details .value{font-size:var(--qc-value-size,13px)}
    @container(max-width:350px){.charge{grid-template-columns:60px minmax(0,1fr);gap:14px}.tank .icon{width:60px;height:110px}.charge .value{font-size:var(--qc-value-size,28px)}.shower .value{font-size:var(--qc-value-size,12px)}}
    ha-card.custom-fields{min-height:0}
    :host([slim]){align-self:start}
    ha-card.slim-card{min-height:0;padding:var(--qc-padding,12px 14px)}
    .slim-summary{display:grid;grid-template-columns:44px minmax(0,1fr) auto;grid-template-rows:auto auto auto;gap:3px 12px;align-items:center;min-height:64px}
    .slim-tank{grid-column:1;grid-row:1/4;display:grid;place-items:center}.slim-tank .icon{width:38px;height:64px;stroke-width:.65}
    .slim-title{grid-column:2;grid-row:1;margin:0;font-size:var(--qc-title-size,14px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .slim-summary .battery-status{grid-column:3;grid-row:1;width:32px;height:24px;justify-self:end}
    .slim-shower{grid-column:2;grid-row:2;font-size:12px;color:var(--qc-secondary);min-width:0;overflow-wrap:anywhere}
    .slim-shower .reading{font-size:inherit;color:inherit}
    .slim-charge{grid-column:3;grid-row:2;font-size:var(--qc-value-size,23px);line-height:1.2;justify-self:end;white-space:nowrap}
    .slim-summary .meter{grid-column:2/4;grid-row:3;height:6px;margin-top:3px}
    @container(max-width:330px){.slim-summary{gap:3px 8px;grid-template-columns:38px minmax(0,1fr) auto}.slim-title{font-size:var(--qc-title-size,13px)}.slim-charge{font-size:var(--qc-value-size,21px)}.slim-shower{font-size:11px}}

  `];
  private slimMeter(charge: number | null | undefined) {
    if (charge == null) return nothing;
    return html`<div class="meter" role="meter" aria-label="Thermal charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${charge}><div class="fill" style=${`width:${charge}%`}></div></div>`;
  }

  private slimReadings(device: QuattDevice) {
    if (!this.showField('charge') && !this.showField('showerMinutes')) return nothing;
    if (!device.available) return html`<span class="slim-shower">Unavailable</span>`;
    const m=device.metrics;
    return html`${this.showField('showerMinutes')?html`<span class="slim-shower">${this.value(m.showerMinutes,'Shower time','reading',0)} shower time</span>`:nothing}
      ${this.showField('charge')?this.value(m.charge,'Thermal charge','value slim-charge',0):nothing}
      ${this.showField('charge')?this.slimMeter(m.charge?.value):nothing}`;
  }

  private slimBattery(device: QuattDevice) {
    return html`<ha-card class="slim-card">${this.renderNotice()}<div class="slim-summary">
      <span class="slim-tank">${icon('tank')}</span>
      <h2 class="slim-title" title=${this.config.title||'Heat battery'}>${this.config.title||'Heat battery'}</h2>
      ${this.showField('status')?this.batteryStatus(device):nothing}
      ${this.slimReadings(device)}
    </div></ha-card>`;
  }

  protected render() {
    const s=this.snapshot,device=s.heatBattery,m=device?.metrics,c=s.heatCharger?.metrics;
    if(!m||!device)return html`<ha-card class=${this.config.layout==='slim'?'slim-card':''}>${this.renderHeader('Heat battery')}${this.renderNotice()}<p class="empty">No heat battery found. This card shows Quatt all-electric hot-water storage.</p></ha-card>`;
    if(this.config.layout==='slim')return this.slimBattery(device);
    const charge=this.showField('charge')?m.charge?.value:undefined;
    const temperatures: [MetricRole,string][]=[['topTemperature','Top'],['middleTemperature','Middle'],['bottomTemperature','Bottom']];
    const selected=temperatures.filter(([key])=>this.showField(key));
    const details: [MetricRole,string,typeof m.charge][]=[['heaterPower','Charger input',c?.heaterPower||c?.electricPower],['waterPressure','Water pressure',c?.waterPressure],['charging','Storage charging',m.charging],['hotWater','Hot-water use',m.hotWater],['boost','Boost',m.boost]];
    const selectedDetails=details.filter(([key,,reading])=>this.showField(key)&&reading);
    return html`<ha-card class=${this.config.fields?'custom-fields':''}><div class="battery-heading">${this.renderHeader('Heat battery')}${this.showField('status')?this.batteryStatus(device):nothing}</div>${this.renderNotice()}${this.showField('charge')||this.showField('showerMinutes')?html`<div class="charge"><span class="tank">${icon('tank')}</span><div>
      <div class="charge-title">${this.value(charge!=null?m.charge:this.showField('showerMinutes')?m.showerMinutes:undefined,charge!=null?'Thermal charge':this.showField('showerMinutes')?'Shower time remaining':'Thermal charge','value',0)}</div>
      ${charge!=null?html`<div class="meter" role="meter" aria-label="Thermal charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${charge}><div class="fill" style=${`width:${charge}%`}></div></div>${this.showField('showerMinutes')?html`<div class="shower">${this.value(m.showerMinutes,'Shower time','value',0)} shower time</div>`:nothing}`:html`<span class="label">${this.showField('showerMinutes')?'Shower time remaining':'Thermal charge unavailable'}</span>`}
    </div></div>`:nothing}${selected.length?html`<div class="temperatures" style=${`--count:${selected.length}`}>${selected.map(([key,label])=>this.metric(label,m[key]))}</div>`:nothing}

    ${selectedDetails.length?html`<details class="details"><summary>Storage details</summary><div class="stat-grid">${selectedDetails.map(([,label,reading])=>this.metric(label,reading,true))}</div></details>`:nothing}
    </ha-card>`;
  }
}
