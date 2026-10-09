import { css, html } from 'lit';
import { BaseCard } from '../base-card';
import { icon } from '../ui';
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
    @container(max-width:350px){.node .value{font-size:16px}.flow{grid-template-columns:1fr 16px 1fr 16px 1fr}.arrow{width:16px}.symbol .icon{width:43px}.circle .icon{width:27px}}
  `];
  protected render() {
    const m=this.snapshot.system;
    return html`<ha-card>${this.renderHeader('Overview')}${this.renderNotice()}
      <div class="flow" aria-label="Heat pump electricity input, COP and heat output">
        <div class="node"><span class="symbol circle electric">${icon('electric')}</span>${this.value(m.electricPower,'Electric input','value',2)}<span class="label">Electric input</span></div>
        <svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12h21m-5-5 5 5-5 5"/></svg>
        <div class="node"><span class="symbol">${icon('pump')}</span>${this.value(m.cop,'Reported COP')}<span class="label">COP</span></div>
        <svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12h21m-5-5 5 5-5 5"/></svg>
        <div class="node"><span class="symbol circle heat">${icon('heat')}</span>${this.value(m.heatPower,'Heat output','value',2)}<span class="label">Heat output</span></div>
      </div><div class="stat-grid">${this.deviceField('Room',m.roomTemperature,'home')}${this.deviceField('Target',m.targetTemperature,'thermometer')}${this.deviceField('Outside',m.outdoorTemperature,'sun')}${this.deviceField('Water flow',m.flowRate,'water')}</div>
      <div class="mode">${this.reading(m.mode)}</div></ha-card>`;
  }
}
