import { css, html, nothing } from 'lit';
import { BaseCard } from '../base-card';
import { icon } from '../ui';
import type { QuattDevice } from '../types';
export class QuattChillCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-chill-card'}; }
  getCardSize(){return this.config?6+Math.max(0,Math.ceil(this.snapshot.chills.length/3)-1)*5:6;}
  static styles=[BaseCard.styles,css`
    ha-card{min-height:410px}.rooms{display:grid;grid-template-columns:repeat(var(--columns,2),minmax(0,1fr));gap:24px 0}.room{min-width:0;border-left:1px solid var(--qc-line);padding:0 16px}.room.row-start{padding-left:0;border-left:0}.room:last-child{padding-right:0}
    h3{font-size:13px;font-weight:600;margin:0 0 16px;overflow-wrap:anywhere}.unit-icon{color:var(--qc-cool);display:block;margin-bottom:10px}.unit-icon .icon{width:28px;height:42px;stroke-width:1.3}
    .temperature .value{font-size:23px}.temperature>.label{display:block;font-size:11px}.fields{display:grid;gap:17px;margin-top:20px}.warning{margin-top:12px;color:var(--qc-warning);font-size:12px}
    .rooms.stacked,.rooms.compact{grid-template-columns:1fr;gap:0}.stacked .room,.compact .room{padding:16px 0;border-left:0;border-top:1px solid var(--qc-line)}.stacked .room:first-child,.compact .room:first-child{padding-top:0;border-top:0}
    .stacked .room,.compact .room{display:grid;grid-template-columns:1fr auto;gap:0 12px}.stacked .unit-icon{grid-row:2}.stacked .fields,.compact .fields{grid-column:1/-1;grid-template-columns:repeat(2,minmax(0,1fr))}.stacked .temperature{grid-row:2;align-self:center}
    .compact .unit-icon{display:none}.compact .temperature .value{font-size:20px}.compact .device-field>.icon{display:none}.compact .fields{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .rooms.three .device-field>.icon{display:none}.rooms.three .room{padding:0 9px}.rooms.three .row-start{padding-left:0}.rooms.three .temperature .value{font-size:19px}
    @container(max-width:350px){.room{padding:0 10px}.device-field{gap:8px}.device-field .value{font-size:14px}.device-field .label{font-size:10px}.temperature .value{font-size:20px}}
  `];
  private room(d:QuattDevice,index:number,columns:number) {
    const m=d.metrics,status=m.status?.text||(!d.available?'Unavailable':'Status unavailable');
    return html`<article class=${`room${index%columns===0?' row-start':''}`} aria-label=${d.name}><h3>${d.name}</h3><span class="unit-icon">${icon('chill')}</span>
      <div class="temperature">${this.value(m.roomTemperature,`${d.name} temperature`)}<span class="label">Current temperature</span></div><div class="fields">
      ${this.deviceField('Target temperature',m.targetTemperature,'thermometer')}${this.deviceField('Fan speed',m.fanMode,'fan')}${this.deviceField('Status',{...m.status,value:null,text:status,unit:''},d.available?'dot':'warning')}${this.deviceField('Mode',m.mode,m.mode?.text?.toLowerCase().includes('heat')?'heat':'snow')}
      </div>${this.on(m.waterWarning)?html`<p class="warning">Water tank needs attention</p>`:nothing}</article>`;
  }
  protected render() {
    const rooms=this.snapshot.chills.filter(d=>!this.config.device||d.id===this.config.device),columns=Math.min(3,Math.max(1,rooms.length));
    return html`<ha-card>${this.renderHeader('Chill rooms')}${this.renderNotice()}${rooms.length?html`<div class=${`rooms ${this.config.layout||'columns'} ${columns===3?'three':''}`} style=${`--columns:${columns}`}>${rooms.map((d,i)=>this.room(d,i,columns))}</div>`:html`<p class="empty">No Chill units found. Chill telemetry requires the Quatt Remote Mobile API.</p>`}</ha-card>`;
  }
}
