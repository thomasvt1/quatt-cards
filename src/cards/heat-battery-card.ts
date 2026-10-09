import { css, html, nothing } from 'lit';
import { BaseCard } from '../base-card';
import { icon } from '../ui';
export class QuattHeatBatteryCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-heat-battery-card'}; }
  static styles=[BaseCard.styles,css`
    ha-card{min-height:385px;display:flex;flex-direction:column}.charge{display:grid;grid-template-columns:70px minmax(0,1fr);gap:18px;align-items:center;margin:18px 0 28px}
    .tank .icon{width:70px;height:119px;stroke-width:.5}.charge .value{font-size:31px}.charge-title{margin-bottom:7px}
    .meter{height:10px;border-radius:5px;background:var(--qc-line);overflow:hidden}.fill{height:100%;background:var(--qc-heat);border-radius:inherit}
    .shower{font-size:12px;margin-top:10px}.shower .value{font-size:12px;font-weight:400}
    .temperatures{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:20px 0;border-top:1px solid var(--qc-line)}.temperatures .stat+.stat{border-left:1px solid var(--qc-line);padding-left:10px}
    .temperatures .value{font-size:14px}.temperatures .label{font-size:11px}.state-line{margin-top:auto;padding-top:18px;font-size:13px}.state-line .icon{width:22px;height:22px;color:var(--qc-good)}
    .details{margin-top:15px;font-size:12px;color:var(--qc-secondary)}summary{cursor:pointer}.details .stat-grid{margin-top:14px}.details .value{font-size:13px}
    @container(max-width:350px){.charge{grid-template-columns:60px minmax(0,1fr);gap:14px}.tank .icon{width:60px;height:110px}.charge .value{font-size:28px}.shower .value{font-size:12px}}
  `];
  protected render() {
    const s=this.snapshot,device=s.heatBattery,m=device?.metrics,c=s.heatCharger?.metrics;
    if(!m||!device)return html`<ha-card>${this.renderHeader('Heat battery')}${this.renderNotice()}<p class="empty">No heat battery found. This card shows Quatt all-electric hot-water storage.</p></ha-card>`;
    const charge=m.charge?.value;
    return html`<ha-card>${this.renderHeader('Heat battery')}${this.renderNotice()}<div class="charge"><span class="tank">${icon('tank')}</span><div>
      <div class="charge-title">${this.value(charge!=null?m.charge:m.showerMinutes,charge!=null?'Thermal charge':'Shower time remaining','value',0)}</div>
      ${charge!=null?html`<div class="meter" role="meter" aria-label="Thermal charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${charge}><div class="fill" style=${`width:${charge}%`}></div></div><div class="shower">${this.value(m.showerMinutes,'Shower time','value',0)} shower time</div>`:html`<span class="label">Shower time remaining</span>`}
    </div></div><div class="temperatures">${this.metric('Top',m.topTemperature)}${this.metric('Middle',m.middleTemperature)}${this.metric('Bottom',m.bottomTemperature)}</div>
    <div class="state-line">${icon(device.available?'check':'warning')}<span>${!device.available?'Unavailable':m.status?.text|| (this.on(m.charging)?'Charging':'Status unavailable')}</span></div>
    ${c||m.charging||m.hotWater||m.boost?html`<details class="details"><summary>Storage details</summary><div class="stat-grid">${this.metric('Charger input',c?.heaterPower||c?.electricPower,true)}${this.metric('Water pressure',c?.waterPressure,true)}${this.metric('Storage charging',m.charging,true)}${this.metric('Hot-water use',m.hotWater,true)}${this.metric('Boost',m.boost,true)}</div></details>`:nothing}
    </ha-card>`;
  }
}
