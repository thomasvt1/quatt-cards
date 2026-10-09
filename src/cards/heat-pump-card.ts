import { css, html, nothing } from 'lit';
import { BaseCard } from '../base-card';
import type { QuattDevice } from '../types';
export class QuattHeatPumpCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-heat-pump-card'}; }
  getCardSize() { return this.config?6+Math.max(0,Math.ceil(this.snapshot.heatPumps.length/3)-1)*5:6; }
  static styles=[BaseCard.styles,css`
    ha-card{min-height:385px}.units{display:grid;grid-template-columns:repeat(var(--columns,2),minmax(0,1fr));gap:24px 0}
    .unit{min-width:0;padding:0 14px;border-left:1px solid var(--qc-line)}.unit.row-start{padding-left:0;border-left:0}.unit:last-child{padding-right:0}
    h3{margin:0 0 16px;font-size:13px;font-weight:600;overflow-wrap:anywhere}
    .fields{display:grid;gap:14px}
    .units.single.columns .fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 18px}
    .units.single.columns h3{margin-bottom:24px}
    ha-card.single-device{min-height:0}ha-card.custom-fields{min-height:0}.fields:empty{display:none}
    .units.stacked,.units.compact{grid-template-columns:1fr;gap:0}.stacked .unit,.compact .unit{padding:15px 0;border-left:0;border-top:1px solid var(--qc-line)}.stacked .unit:first-child,.compact .unit:first-child{padding-top:0;border:0}
    .stacked .fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.compact .fields{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.compact .device-field>.icon{display:none}.compact h3{margin-bottom:12px}
    @container(max-width:360px){.unit{padding:0 10px}.device-field{gap:7px}.device-field>.icon{width:19px}.device-field .value{font-size:14px}.device-field .label{font-size:10px}.fields{gap:15px}}
    .units.three .device-field>.icon{display:none}.units.three .unit{padding-right:8px;padding-left:10px}.units.three .row-start{padding-left:0}
  `];
  private unit(device:QuattDevice,index:number,columns:number) {
    const m=device.metrics,status=!device.available?'Unavailable':this.on(m.defrost)?'Defrost reported':m.status?.text||'Status unavailable';
    return html`<article class=${`unit${index%columns===0?' row-start':''}`} aria-label=${device.name}><h3>${device.name}</h3><div class="fields">
      ${this.selectedField('heatPower','Thermal output',m.heatPower,'pump','heat',2)}${this.selectedField('electricPower','Electric input',m.electricPower,'electric','electric',2)}${this.selectedField('cop','COP',m.cop,'fan')}${this.selectedField('returnTemperature','Water in',m.returnTemperature,'thermometer')}${this.selectedField('supplyTemperature','Water out',m.supplyTemperature,'thermometer')}
      ${this.selectedField('status','Status',{...m.status,value:null,text:status,unit:''},!device.available?'warning':this.on(m.defrost)?'snow':'dot','heat')}
    </div>${this.showField('compressorSpeed')&&m.compressorSpeed||this.showField('outdoorTemperature')&&m.outdoorTemperature?html`<details class="detail-readings"><summary>More readings</summary><div class="stat-grid">${this.showField('compressorSpeed')?this.metric('Compressor',m.compressorSpeed,true):nothing}${this.showField('outdoorTemperature')?this.metric('Outside',m.outdoorTemperature,true):nothing}</div></details>`:nothing}</article>`;
  }
  protected render() {
    const devices=this.snapshot.heatPumps.filter(d=>!this.config.device||d.id===this.config.device),columns=Math.min(3,Math.max(1,devices.length));
    return html`<ha-card class=${`${devices.length===1?'single-device':''} ${this.config.fields?'custom-fields':''}`}>${this.renderHeader('Heat pumps')}${this.renderNotice()}${devices.length?html`<div class=${`units ${this.config.layout||'columns'} ${columns===3?'three':''} ${devices.length===1?'single':''}`} style=${`--columns:${columns}`}>${devices.map((d,i)=>this.unit(d,i,columns))}</div>`:html`<p class="empty">No heat pump readings found. Select a Quatt installation${this.config.device?' or another device':''}.</p>`}</ha-card>`;
  }
}
