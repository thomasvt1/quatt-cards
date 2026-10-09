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
    .stacked .summary{display:flex;align-items:center;justify-content:space-between;gap:16px}.stacked .unit-icon{margin:0}.stacked .fields,.compact .fields{grid-column:1/-1;grid-template-columns:repeat(2,minmax(0,1fr))}
    .compact .room{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 12px;align-items:start}.compact .summary{text-align:right}.compact .warning{grid-column:1/-1}
    .compact .unit-icon{display:none}.compact .temperature .value{font-size:20px}.compact .device-field>.icon{display:none}.compact .fields{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .rooms.three .device-field>.icon{display:none}.rooms.three .room{padding:0 9px}.rooms.three .row-start{padding-left:0}.rooms.three .temperature .value{font-size:19px}
    .rooms.single.columns h3{text-align:center}.rooms.single.columns .summary{display:flex;justify-content:center;align-items:center;gap:16px;margin:20px 0 26px}.rooms.single.columns .unit-icon{margin:0}.rooms.single.columns .fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 18px}
    ha-card.single-device{min-height:0}
    .controls{grid-column:1/-1;margin-top:20px;padding-top:14px;border-top:1px solid var(--qc-line)}
    .control-button{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;border:1px solid var(--qc-line);border-radius:8px;background:transparent;font-size:13px;font-weight:500;padding:8px;overflow-wrap:anywhere}
    .control-button:hover:not(:disabled){background:var(--qc-subtle)}.control-button .icon{width:18px;height:18px}
    .control-note{margin:8px 0 0;font-size:11px;color:var(--qc-secondary);text-align:center;overflow-wrap:anywhere}
    .rooms.three .control-button .icon{display:none}
    @container(max-width:350px){.room{padding:0 10px}.device-field{gap:8px}.device-field .value{font-size:14px}.device-field .label{font-size:10px}.temperature .value{font-size:20px}}
  `];
  private controls(d:QuattDevice) {
    if(this.config.show_controls===false)return nothing;
    const entity=d.climateEntityId&&this.hass.states[d.climateEntityId];
    const available=d.available&&entity&&!['unknown','unavailable'].includes(entity.state);
    return html`<div class="controls">${d.climateEntityId?html`
      <button class="control-button" ?disabled=${!available} aria-label=${`Control ${d.name}`} aria-haspopup="dialog"
        @click=${()=>this.openControls(d.id)}>${icon('controls')}<span>Controls</span></button>
      ${!available?html`<p class="control-note">Unit unavailable</p>`:nothing}
    `:html`<p class="control-note">Controls require one enabled Chill climate entity.</p>`}</div>`;
  }
  private openControls(deviceId:string) {
    const d=this.snapshot.chills.find(device=>device.id===deviceId);
    const entity=d?.climateEntityId&&this.hass.states[d.climateEntityId];
    if(this.config.show_controls===false||!d?.available||!entity||['unknown','unavailable'].includes(entity.state))return;
    this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:entity.entity_id},bubbles:true,composed:true}));
  }
  private room(d:QuattDevice,index:number,columns:number) {
    const m=d.metrics,status=m.status?.text||(!d.available?'Unavailable':'Status unavailable');
    return html`<article class=${`room${index%columns===0?' row-start':''}`} aria-label=${d.name}><h3>${d.name}</h3><div class="summary"><span class="unit-icon">${icon('chill')}</span>
      <div class="temperature">${this.value(m.roomTemperature,`${d.name} temperature`)}<span class="label">Current temperature</span></div></div><div class="fields">
      ${this.deviceField('Target temperature',m.targetTemperature,'thermometer')}${this.deviceField('Fan speed',m.fanMode,'fan')}${this.deviceField('Status',{...m.status,value:null,text:status,unit:''},d.available?'dot':'warning')}${this.deviceField('Mode',m.mode,m.mode?.text?.toLowerCase().includes('heat')?'heat':'snow')}
      </div>${this.on(m.waterWarning)?html`<p class="warning">Water tank needs attention</p>`:nothing}${this.controls(d)}</article>`;
  }
  protected render() {
    const rooms=this.snapshot.chills.filter(d=>!this.config.device||d.id===this.config.device),columns=Math.min(3,Math.max(1,rooms.length));
    return html`<ha-card class=${rooms.length===1?'single-device':''}>${this.renderHeader('Chill rooms')}${this.renderNotice()}${rooms.length?html`<div class=${`rooms ${this.config.layout||'columns'} ${columns===3?'three':''} ${rooms.length===1?'single':''}`} style=${`--columns:${columns}`}>${rooms.map((d,i)=>this.room(d,i,columns))}</div>`:html`<p class="empty">No Chill units found. Chill telemetry requires the Quatt Remote Mobile API.</p>`}</ha-card>`;
  }
}
