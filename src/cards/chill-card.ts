import { css, html, nothing } from 'lit';
import { BaseCard } from '../base-card';
import { icon } from '../ui';
import { chillState } from '../data/chill-state';
import type { QuattDevice } from '../types';
export class QuattChillCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-chill-card'}; }
  getCardSize(){return this.config?5+Math.max(0,Math.ceil(this.snapshot.chills.length/3)-1)*4:5;}
  static styles=[BaseCard.styles,css`
    :host{align-self:start}ha-card{min-height:0}.rooms{display:grid;grid-template-columns:repeat(var(--columns,2),minmax(0,1fr));gap:24px 0}.room{min-width:0;border-left:1px solid var(--qc-line);padding:0 16px}.room.row-start{padding-left:0;border-left:0}.room:last-child{padding-right:0}
    h3{font-size:13px;font-weight:600;margin:0 0 16px;overflow-wrap:anywhere}.summary{text-align:center}
    .unit-icon{--ring-color:var(--qc-secondary);color:var(--ring-color);position:relative;display:grid;place-items:center;width:60px;height:60px;margin:0 auto 12px;padding:7px;border:2.5px solid var(--ring-color);border-radius:50%;background:transparent}
    .unit-icon.cooling{--ring-color:var(--quatt-chill-cooling-color,#00a9ed)}.unit-icon.heating{--ring-color:var(--quatt-chill-heating-color,#e34d59)}
    .unit-icon>.icon{width:25px;height:38px;stroke-width:1.3}.unit-icon.off>.icon,.unit-icon.idle>.icon,.unit-icon.unknown>.icon{color:var(--qc-secondary)}
    .icon-badge{position:absolute;display:grid;place-items:center;width:20px;height:20px;border:2px solid var(--ha-card-background,var(--card-background-color,#fff));border-radius:50%;background:var(--ha-card-background,var(--card-background-color,#fff))}
    .icon-badge .icon{width:14px;height:14px;stroke-width:2}.status-badge{right:-5px;bottom:-3px;background:var(--ring-color);color:var(--ha-card-background,var(--card-background-color,#fff))}
    .off .status-badge,.idle .status-badge,.unknown .status-badge{background:var(--qc-secondary)}.offline .status-badge,.warning .status-badge{background:var(--qc-warning)}
    button.unit-icon:disabled{opacity:1}.icon-description{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    button.unit-icon:hover:not(:disabled){background:var(--qc-subtle)}
    .temperature .value{font-size:23px}.temperature>.label{display:block;font-size:11px}.fields{display:grid;gap:17px;margin-top:20px}p.warning{margin-top:12px;color:var(--qc-warning);font-size:12px}
    .rooms.stacked,.rooms.compact{grid-template-columns:1fr;gap:0}.stacked .room,.compact .room{padding:16px 0;border-left:0;border-top:1px solid var(--qc-line)}.stacked .room:first-child,.compact .room:first-child{padding-top:0;border-top:0}
    .stacked .fields,.compact .fields{grid-template-columns:repeat(2,minmax(0,1fr))}
    .compact .temperature .value{font-size:20px}.compact .device-field>.icon{display:none}.compact .fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .rooms.three .device-field>.icon{display:none}.rooms.three .room{padding:0 9px}.rooms.three .row-start{padding-left:0}.rooms.three .temperature .value{font-size:19px}
    .rooms.single.columns h3{text-align:center}.rooms.single.columns .summary{margin:20px 0 26px}.rooms.single.columns .fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 18px}
    ha-card.single-device{min-height:0}ha-card.custom-fields{min-height:0}.fields:empty{display:none}
    @container(max-width:350px){.room{padding:0 10px}.device-field{gap:8px}.device-field .value{font-size:14px}.device-field .label{font-size:10px}.temperature .value{font-size:20px}}
  `];
  private controlIcon(d:QuattDevice) {
    const state=chillState(d),showStatus=this.showField('status'),showMode=this.showField('mode');
    const description=[showStatus?`Status: ${state.statusText}`:'',showMode?`Mode: ${state.modeText}`:''].filter(Boolean).join(' · ');
    const tone=showMode?(showStatus?state.activity:state.setting):'neutral';
    const badge=showStatus?(showMode?state.activityIcon:state.statusIcon):state.modeIcon;
    const classes=`unit-icon ${tone} ${showStatus?state.state:''}`;
    const content=html`${icon('chill')}${showStatus||showMode?html`<span class="icon-badge status-badge" aria-hidden="true">${icon(badge)}</span>`:nothing}`;
    if(this.config.show_controls===false)return html`<span class=${classes} role="img" aria-label=${`${d.name}${description?`: ${description}`:''}`} title=${description}>${content}</span>`;
    const entity=d.climateEntityId&&this.hass.states[d.climateEntityId];
    const available=d.available&&entity&&!['unknown','unavailable'].includes(entity.state);
    const hint=!d.climateEntityId?'Controls require one enabled Chill climate entity.':!available?'Unit unavailable':`Control ${d.name}`;
    const descriptionId=`chill-state-${d.id}`;
    return html`<button class=${classes} ?disabled=${!available} aria-label=${`Control ${d.name}`} aria-describedby=${descriptionId} title=${[hint,description].filter(Boolean).join(' · ')} aria-haspopup="dialog"
      @click=${()=>this.openControls(d.id)}>${content}</button><span class="icon-description" id=${descriptionId}>${description}</span>`;
  }
  private openControls(deviceId:string) {
    const d=this.snapshot.chills.find(device=>device.id===deviceId);
    const entity=d?.climateEntityId&&this.hass.states[d.climateEntityId];
    if(this.config.show_controls===false||!d?.available||!entity||['unknown','unavailable'].includes(entity.state))return;
    this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:entity.entity_id},bubbles:true,composed:true}));
  }
  private room(d:QuattDevice,index:number,columns:number) {
    const m=d.metrics;
    return html`<article class=${`room${index%columns===0?' row-start':''}`} aria-label=${d.name}><h3>${d.name}</h3><div class="summary">${this.controlIcon(d)}
      ${this.showField('roomTemperature')?html`<div class="temperature">${this.value(m.roomTemperature,`${d.name} temperature`)}<span class="label">Current temperature</span></div>`:nothing}</div><div class="fields">
      ${this.selectedField('targetTemperature','Target temperature',m.targetTemperature,'thermometer')}${this.selectedField('fanMode','Fan speed',m.fanMode,'fan')}
      </div>${this.showField('waterWarning')&&this.on(m.waterWarning)?html`<p class="warning">Water tank needs attention</p>`:nothing}</article>`;
  }
  protected render() {
    const rooms=this.snapshot.chills.filter(d=>!this.config.device||d.id===this.config.device),columns=Math.min(3,Math.max(1,rooms.length));
    return html`<ha-card class=${`${rooms.length===1?'single-device':''} ${this.config.fields?'custom-fields':''}`}>${this.renderHeader('Chill rooms')}${this.renderNotice()}${rooms.length?html`<div class=${`rooms ${this.config.layout||'columns'} ${columns===3?'three':''} ${rooms.length===1?'single':''}`} style=${`--columns:${columns}`}>${rooms.map((d,i)=>this.room(d,i,columns))}</div>`:html`<p class="empty">No Chill units found. Chill telemetry requires the Quatt Remote Mobile API.</p>`}</ha-card>`;
  }
}
