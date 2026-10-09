import { css, html, nothing } from 'lit';
import { BaseCard } from '../base-card';
import { icon } from '../ui';
import type { MetricRole, Reading, QuattDevice } from '../types';
export class QuattOverviewCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-overview-card'}; }
  static styles=[BaseCard.styles,css`
    ha-card{min-height:385px;display:flex;flex-direction:column}
    .flow{display:grid;grid-template-columns:1fr 23px 1fr 23px 1fr;align-items:start;margin:20px 0 24px}
    .node{display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;min-width:0}
    .node .value{font-size:18px;white-space:nowrap}.node .label{font-size:11px}
    .symbol{height:47px;display:grid;place-items:center;margin-bottom:6px}.symbol .icon{width:49px;height:42px;stroke-width:1.1}
    .circle{width:47px;border:1.5px solid currentColor;border-radius:50%}.circle .icon{width:27px;height:27px;stroke-width:1.6}
    .electric{color:var(--qc-electric)}.heat{color:var(--qc-heat)}
    .arrow{width:23px;height:24px;margin-top:12px;fill:none;stroke:currentColor;stroke-width:1.5}
    .stat-grid{margin:0;padding:20px 0;border-top:1px solid var(--qc-line);gap:20px 14px}
    .device-field{gap:9px}.device-field .label{order:-1;font-size:12px}.device-field .value{font-size:15px}
    .mode{margin-top:auto;padding-top:18px;color:var(--qc-secondary);font-size:12px}
    .flow.partial{grid-template-columns:repeat(var(--count),minmax(0,1fr))}
    .battery{border-top:1px solid var(--qc-line);padding-top:18px;margin-top:4px}
    .battery-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}.battery-header .icon{width:23px;height:36px;color:var(--qc-heat)}
    .battery-status{margin-left:auto;width:44px;height:36px;padding:0;border:0;background:transparent;display:grid;place-items:center;border-radius:6px;flex-shrink:0}
    .status-dot{width:9px;height:9px;border-radius:50%;background:var(--disabled-text-color,#9e9e9e)}
    .status-dot.on{background:var(--success-color,#43a047)}.status-dot.off{background:var(--disabled-text-color,#9e9e9e)}
    button.battery-status:hover{background:var(--qc-subtle)}
    h3{font-size:14px;font-weight:600;margin:0}.battery-header .label{font-size:11px}
    .battery-readings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.battery-readings .stat{gap:3px}.battery-readings .value{font-size:16px}
    .charge-track{height:6px;border-radius:3px;background:var(--qc-line);overflow:hidden;margin-top:14px}.charge-fill{height:100%;background:var(--qc-heat);border-radius:inherit}
    ha-card.custom-fields{min-height:0}
    @container(max-width:350px){.node .value{font-size:16px}.flow{grid-template-columns:1fr 16px 1fr 16px 1fr}.arrow{width:16px}.symbol .icon{width:43px}.circle .icon{width:27px}}
  `];
  private batteryStatus(battery:QuattDevice) {
    const reading=battery.metrics.status,text=battery.available?this.reading(reading):'Unavailable';
    const normalized=text.trim().toLowerCase();
    const state=!battery.available?'unknown':['on','true','1'].includes(normalized)?'on':['off','false','0'].includes(normalized)?'off':'unknown';
    const label=`Heat battery status: ${text==='—'?'Unavailable':text}`;
    const dot=html`<span class=${`status-dot ${state}`} aria-hidden="true"></span>`;
    return reading?.entityId&&/^(sensor|binary_sensor)\./.test(reading.entityId)
      ? html`<button class="battery-status" title=${label} aria-label=${`${label}. Show details`} @click=${()=>this.moreInfo(reading.entityId)}>${dot}</button>`
      : html`<span class="battery-status" role="img" title=${label} aria-label=${label}>${dot}</span>`;
  }
  protected render() {
    const s=this.snapshot,m=s.system;
    const nodes=[{key:'electricPower' as const,label:'Electric input',symbol:'electric',style:'circle electric',digits:2},{key:'cop' as const,label:'COP',symbol:'pump',style:'',digits:1},{key:'heatPower' as const,label:'Heat output',symbol:'heat',style:'circle heat',digits:2}].filter(n=>this.showField(n.key));
    const readings: [MetricRole,string,string][]=[['roomTemperature','Room','home'],['targetTemperature','Target','thermometer'],['outdoorTemperature','Outside','sun'],['flowRate','Water flow','water'],['supplyTemperature','Supply','thermometer']];
    const visible=readings.filter(([key])=>this.showField(key));
    const b=s.heatBattery,charge=b?.metrics.charge?.value;
    const batteryFields:[MetricRole,string][]=[['charge','Thermal charge'],['showerMinutes','Shower time'],['status','Status'],['topTemperature','Top'],['middleTemperature','Middle'],['bottomTemperature','Bottom'],['charging','Charging'],['hotWater','Hot-water use']];
    const selectedBattery=batteryFields.filter(([key])=>this.showField(`heatBattery.${key}`)&&b?.metrics[key]);
    const chargerFields:[MetricRole,string][]=[['heaterPower','Charger input'],['waterPressure','Water pressure']];
    const selectedCharger=chargerFields.filter(([key])=>this.showField(`heatCharger.${key}`)&&s.heatCharger?.metrics[key]);
    const minimal=this.config.heat_battery_layout==='minimal';
    const compactBattery:[string,string,Reading|undefined,string][]=[];
    if(minimal&&b){
      const labels:Partial<Record<MetricRole,string>>={charge:'Heat battery',status:'Battery status',topTemperature:'Tank top',middleTemperature:'Tank middle',bottomTemperature:'Tank bottom',charging:'Battery charging'};
      for(const [key,label] of selectedBattery)compactBattery.push([`heatBattery.${key}`,labels[key]||label,key==='status'&&!b.available?{value:null,text:'Unavailable',unit:''}:b.metrics[key],key.toLowerCase().includes('temperature')?'thermometer':key==='showerMinutes'||key==='hotWater'?'water':'tank']);
      for(const [key,label] of selectedCharger)compactBattery.push([`heatCharger.${key}`,label,s.heatCharger?.metrics[key],key==='heaterPower'?'electric':'water']);
    }
    return html`<ha-card class=${this.config.fields||minimal?'custom-fields':''}>${this.renderHeader('Overview')}${this.renderNotice()}
      ${nodes.length?html`<div class=${`flow ${nodes.length<3?'partial':''}`} style=${`--count:${nodes.length}`} aria-label="Heat pump measurements">
        ${nodes.map((n,i)=>html`${i&&nodes.length===3?html`<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12h21m-5-5 5 5-5 5"/></svg>`:nothing}<div class="node" data-field=${n.key}><span class=${`symbol ${n.style}`}>${icon(n.symbol)}</span>${this.value(m[n.key],n.key==='cop'?'Reported COP':n.label,'value',n.digits)}<span class="label">${n.label}</span></div>`)}
      </div>`:nothing}
      ${visible.length||compactBattery.length?html`<div class="stat-grid">${visible.map(([key,label,symbol])=>this.deviceField(label,m[key],symbol))}${compactBattery.map(([,label,reading,symbol])=>this.deviceField(label,reading,symbol))}</div>`:nothing}
      ${!minimal&&b&&(selectedBattery.length||selectedCharger.length)?html`<section class="battery" aria-label="Heat battery"><div class="battery-header">${icon('tank')}<h3>Heat battery</h3>${this.showField('heatBattery.status')?this.batteryStatus(b):nothing}</div>
        ${selectedBattery.some(([key])=>key!=='status')||selectedCharger.length?html`<div class="battery-readings">${selectedBattery.filter(([key])=>key!=='status').map(([key,label])=>this.metric(label,b.metrics[key]))}${selectedCharger.map(([key,label])=>this.metric(label,s.heatCharger?.metrics[key]))}</div>`:nothing}
        ${this.showField('heatBattery.charge')&&charge!=null?html`<div class="charge-track" role="meter" aria-label="Heat battery charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${charge}><div class="charge-fill" style=${`width:${charge}%`}></div></div>`:nothing}
      </section>`:nothing}
      ${this.showField('mode')?html`<div class="mode">${this.reading(m.mode)}</div>`:nothing}
      </ha-card>`;
  }
}
