import { css, html, nothing } from 'lit';
import { BaseCard } from '../base-card';
import { icon } from '../ui';
import type { QuattDevice } from '../types';
export class QuattChillCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-chill-card'}; }
  getCardSize(){return this.config?6+Math.max(0,Math.ceil(this.snapshot.chills.length/3)-1)*5:6;}
  static styles=[BaseCard.styles,css`
    ha-card{min-height:410px}.rooms{display:grid;grid-template-columns:repeat(var(--columns,2),minmax(0,1fr));gap:24px 0}.room{min-width:0;border-left:1px solid var(--qc-line);padding:0 16px}.room.row-start{padding-left:0;border-left:0}.room:last-child{padding-right:0}
    h3{font-size:13px;font-weight:600;margin:0 0 16px;overflow-wrap:anywhere}.summary{text-align:center}.unit-icon{color:var(--qc-cool);display:grid;place-items:center;width:48px;height:52px;margin:0 auto 10px;padding:5px;border:0;border-radius:8px;background:transparent}.unit-icon .icon{width:28px;height:42px;stroke-width:1.3}
    button.unit-icon:hover:not(:disabled){background:var(--qc-subtle)}
    .temperature .value{font-size:23px}.temperature>.label{display:block;font-size:11px}.fields{display:grid;gap:17px;margin-top:20px}.warning{margin-top:12px;color:var(--qc-warning);font-size:12px}
    .rooms.stacked,.rooms.compact{grid-template-columns:1fr;gap:0}.stacked .room,.compact .room{padding:16px 0;border-left:0;border-top:1px solid var(--qc-line)}.stacked .room:first-child,.compact .room:first-child{padding-top:0;border-top:0}
    .stacked .fields,.compact .fields{grid-template-columns:repeat(2,minmax(0,1fr))}
    .compact .temperature .value{font-size:20px}.compact .device-field>.icon{display:none}.compact .fields{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .rooms.three .device-field>.icon{display:none}.rooms.three .room{padding:0 9px}.rooms.three .row-start{padding-left:0}.rooms.three .temperature .value{font-size:19px}
    .rooms.single.columns h3{text-align:center}.rooms.single.columns .summary{margin:20px 0 26px}.rooms.single.columns .fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 18px}
    ha-card.single-device{min-height:0}ha-card.custom-fields{min-height:0}.fields:empty{display:none}
    @container(max-width:350px){.room{padding:0 10px}.device-field{gap:8px}.device-field .value{font-size:14px}.device-field .label{font-size:10px}.temperature .value{font-size:20px}}
  `];
  private controlIcon(d:QuattDevice) {
    if(this.config.show_controls===false)return html`<span class="unit-icon">${icon('chill')}</span>`;
    const entity=d.climateEntityId&&this.hass.states[d.climateEntityId];
    const available=d.available&&entity&&!['unknown','unavailable'].includes(entity.state);
    const hint=!d.climateEntityId?'Controls require one enabled Chill climate entity.':!available?'Unit unavailable':`Control ${d.name}`;
    return html`<button class="unit-icon" ?disabled=${!available} aria-label=${`Control ${d.name}`} title=${hint} aria-haspopup="dialog"
      @click=${()=>this.openControls(d.id)}>${icon('chill')}</button>`;
  }
  private openControls(deviceId:string) {
    const d=this.snapshot.chills.find(device=>device.id===deviceId);
    const entity=d?.climateEntityId&&this.hass.states[d.climateEntityId];
    if(this.config.show_controls===false||!d?.available||!entity||['unknown','unavailable'].includes(entity.state))return;
    this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:entity.entity_id},bubbles:true,composed:true}));
  }
  private room(d:QuattDevice,index:number,columns:number) {
    const m=d.metrics,status=m.status?.text||(!d.available?'Unavailable':'Status unavailable');
    return html`<article class=${`room${index%columns===0?' row-start':''}`} aria-label=${d.name}><h3>${d.name}</h3><div class="summary">${this.controlIcon(d)}
      ${this.showField('roomTemperature')?html`<div class="temperature">${this.value(m.roomTemperature,`${d.name} temperature`)}<span class="label">Current temperature</span></div>`:nothing}</div><div class="fields">
      ${this.selectedField('targetTemperature','Target temperature',m.targetTemperature,'thermometer')}${this.selectedField('fanMode','Fan speed',m.fanMode,'fan')}${this.selectedField('status','Status',{...m.status,value:null,text:status,unit:''},d.available?'dot':'warning')}${this.selectedField('mode','Mode',m.mode,m.mode?.text?.toLowerCase().includes('heat')?'heat':'snow')}
      </div>${this.showField('waterWarning')&&this.on(m.waterWarning)?html`<p class="warning">Water tank needs attention</p>`:nothing}</article>`;
  }
  protected render() {
    const rooms=this.snapshot.chills.filter(d=>!this.config.device||d.id===this.config.device),columns=Math.min(3,Math.max(1,rooms.length));
    return html`<ha-card class=${`${rooms.length===1?'single-device':''} ${this.config.fields?'custom-fields':''}`}>${this.renderHeader('Chill rooms')}${this.renderNotice()}${rooms.length?html`<div class=${`rooms ${this.config.layout||'columns'} ${columns===3?'three':''} ${rooms.length===1?'single':''}`} style=${`--columns:${columns}`}>${rooms.map((d,i)=>this.room(d,i,columns))}</div>`:html`<p class="empty">No Chill units found. Chill telemetry requires the Quatt Remote Mobile API.</p>`}</ha-card>`;
  }
}
