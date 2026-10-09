import { css, html, nothing, svg } from 'lit';
import { BaseCard } from '../base-card';
import { circuitReadings } from '../data/circuit';
import type { Reading } from '../types';
import { icon } from '../ui';

export class QuattHeatingCircuitCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-heating-circuit-card'}; }
  getCardSize() { return 6; }
  static styles=[BaseCard.styles,css`
    :host{--qc-supply:var(--quatt-supply-color,#e34d59);--qc-return:var(--quatt-return-color,#00a9ed)}
    .ob-header{margin-bottom:14px}.summary{display:flex;flex-wrap:wrap;gap:8px 20px;margin-bottom:14px}
    .summary-item{display:flex;align-items:center;gap:7px;min-width:0}.summary-item .label{font-size:13px}
    .summary-item .value{font-size:17px}.summary-item>.icon{width:20px;height:22px}
    .summary-item.electric>.icon{color:var(--qc-return)}.summary-item.heat>.icon{color:var(--qc-supply)}
    .diagram{display:flex;align-items:flex-start;gap:12px}.loop{flex:1;min-width:0;position:relative;padding:0 12px;height:235px}
    .equipment{display:grid;grid-template-columns:repeat(var(--units),minmax(0,1fr));gap:26px;position:relative;padding-top:50px}
    .unit{text-align:center;min-width:0;position:relative}.unit .icon{width:82px;height:62px;max-width:100%;stroke-width:1.05;background:var(--ha-card-background,var(--card-background-color,#fff))}
    .unit.home .icon{width:62px;stroke-width:1.3}.unit-name{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.35;overflow-wrap:anywhere;margin-top:3px}
    .unit.offline .icon{color:var(--qc-secondary)}.unavailable{font-size:11px;color:var(--qc-secondary);display:block}
    .pipes{position:absolute;inset:80px 12px auto;width:calc(100% - 24px);height:100px;overflow:visible;pointer-events:none}
    .pipes path{fill:none;stroke-width:3;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}
    .supply-pipe{stroke:var(--qc-supply)}.return-pipe{stroke:var(--qc-return)}
    .supply-reading{position:absolute;left:calc(100% - 100% / var(--units));transform:translateX(-50%);top:0;text-align:center;display:grid;justify-items:center}
    .inline-readings{position:absolute;top:155px;left:0;width:100%;display:flex;justify-content:center;align-items:center;gap:12px;font-size:13px;white-space:nowrap}
    .inline-readings .value{font-size:13px;font-weight:500}.delta{display:flex;gap:4px}
    .return-reading{position:absolute;top:195px;left:0;width:100%;display:grid;justify-items:center;text-align:center;min-height:39px}.return-reading .label,.supply-reading .label{font-size:12px}
    .storage{display:flex;align-items:flex-start;gap:16px;flex:0 0 38%;padding-top:45px;min-width:270px}
    .charger{display:flex;flex-direction:column;align-items:center;position:relative;flex:1 0 98px;min-width:0;text-align:center;padding-top:4px}
    .charger-label{font-size:12px;white-space:nowrap}.thermal{width:100%;height:42px;position:relative;color:var(--qc-heat);display:grid;place-items:start center}
    .thermal>.icon{width:20px;height:24px}.thermal-line{position:absolute;width:100%;height:14px;bottom:0;overflow:visible}
    .thermal-line path{fill:none;stroke:currentColor;stroke-width:2;vector-effect:non-scaling-stroke}
    .charger-input{display:flex;justify-content:center;flex-wrap:wrap;gap:0 4px;margin-top:4px;font-size:12px}.charger-input .value{font-size:13px;font-weight:500}
    .battery{display:flex;gap:10px;align-items:flex-start;min-width:0;flex:1 0 150px}.battery>.icon{width:48px;height:105px;stroke-width:1.05;flex:none}
    .battery-data{min-width:0;flex:1}.battery-title{font-size:12px;white-space:nowrap;margin-bottom:4px}
    .charge .value{font-size:23px;line-height:1.25}.bar{height:7px;background:var(--qc-line);border-radius:8px;margin:8px 0 10px;overflow:hidden}.bar>span{display:block;height:100%;background:var(--qc-heat);border-radius:inherit}
    .tank-reading{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:4px}.tank-reading .value{font-size:13px;white-space:nowrap}.tank-reading .label{font-size:11px}
    .extra{display:flex;flex-wrap:wrap;gap:12px 24px;margin-top:14px}.extra:empty{display:none}
    @container(max-width:720px){.diagram{flex-direction:column;gap:0}.loop{flex:none;width:100%}.storage{flex:initial;width:100%;min-width:0;justify-content:center;padding-top:20px;margin-top:12px;border-top:1px solid var(--qc-line);gap:20px}.charger{flex:0 0 110px;padding-top:10px}.battery{flex:0 1 175px}.battery>.icon{height:98px;width:44px}.summary{gap:8px 14px}.summary-item{gap:5px}.summary-item .label{font-size:12px}.summary-item .value{font-size:15px}}
    @container(max-width:380px){.summary-item>.icon{width:17px}.summary{gap:6px 12px}.summary-item .label{font-size:11px}.summary-item .value{font-size:14px}.equipment{gap:18px}.unit .icon{width:58px;height:62px}.storage{gap:16px}.charger{flex-basis:98px}}
  `];
  private summary(key:string,label:string,reading:Reading|undefined,symbol:string,tone='') {
    return this.showField(key)?html`<div class=${`summary-item ${tone}`}>${icon(symbol)}<span class="label">${label}</span>${this.value(reading,label,'value',key==='cop'?1:2)}</div>`:nothing;
  }
  private tankReading(key:string,label:string,reading?:Reading) {
    return this.showField(`heatBattery.${key}`)&&reading?html`<div class="tank-reading"><span class="label">${label}</span>${this.value(reading,`Heat battery ${label}`)}</div>`:nothing;
  }
  protected render() {
    const snapshot=this.snapshot,{pumps,ordered,supply,returnTemperature,delta}=circuitReadings(snapshot,this.config);
    const battery=snapshot.heatBattery,charger=snapshot.heatCharger,m=battery?.metrics;
    const count=pumps.length+1,first=50/count,last=100-50/count;
    return html`<ha-card>${this.renderHeader('Heating circuit')}${this.renderNotice()}
      <div class="summary">${this.summary('electricPower','HP input',snapshot.system.electricPower,'electric','electric')}${this.summary('heatPower','HP output',snapshot.system.heatPower,'heat','heat')}${this.summary('cop','HP COP',snapshot.system.cop,'fan')}</div>
      ${pumps.length?html`<div class="diagram"><section class="loop" style=${`--units:${count}`} aria-label="Heat pumps and home heating circuit">
        ${ordered?svg`<svg class="pipes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="supply-pipe" d=${`M${first} 0 H${last}`}/><path class="return-pipe" d=${`M${last} 62 V93 Q${last} 100 ${last-3} 100 H3 Q0 100 0 93 V7 Q0 0 3 0 H${first}`}/></svg>`:nothing}
        ${this.showField('supplyTemperature')?html`<div class="supply-reading"><span class="label">Supply</span>${this.value(supply,'Supply')}</div>`:nothing}
        <div class="equipment">${pumps.map(p=>html`<div class=${`unit pump ${p.available?'':'offline'}`}>${icon('pump')}<span class="unit-name" title=${p.name}>${p.name}</span>${!p.available?html`<span class="unavailable">Unavailable</span>`:nothing}</div>`)}<div class="unit home">${icon('home')}<span class="unit-name">Home</span></div></div>
        <div class="inline-readings">${this.showField('flowRate')?this.value(snapshot.system.flowRate,'Water flow'):nothing}${this.showField('deltaTemperature')?html`<span class="delta" title="Calculated: final heat pump outlet minus first heat pump inlet">ΔT ${this.value(delta,'Temperature difference')}</span>`:nothing}</div>
        <div class="return-reading">${this.showField('returnTemperature')?html`<span class="label">Return</span>${this.value(returnTemperature,'Return')}`:nothing}</div>
      </section>${battery||charger?html`<section class="storage" aria-label="Heat storage">${charger?html`<div class="charger"><span class="charger-label">Heat Charger</span><div class="thermal" title="Thermal connection; arrows do not indicate live flow">${icon('heat')}${battery?svg`<svg class="thermal-line" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 7H98" stroke-dasharray="5 4"/><path d="m7 2-5 5 5 5m86-10 5 5-5 5"/></svg>`:nothing}</div>${this.showField('heatCharger.heaterPower')&&charger.metrics.heaterPower?html`<div class="charger-input">${this.value(charger.metrics.heaterPower,'Heat Charger electric input')}<span class="label">input</span></div>`:nothing}</div>`:nothing}
        ${battery?html`<div class="battery">${icon('tank')}<div class="battery-data"><div class="battery-title">Heat Battery</div>${this.showField('heatBattery.charge')?html`<div class="charge">${this.value(m?.charge,'Heat battery charge')}</div>${m?.charge?.value!=null?html`<div class="bar" role="meter" aria-label="Heat battery charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${m.charge.value}><span style=${`width:${m.charge.value}%`}></span></div>`:nothing}`:nothing}${this.tankReading('topTemperature','Top',m?.topTemperature)}${this.tankReading('middleTemperature','Middle',m?.middleTemperature)}${this.tankReading('bottomTemperature','Bottom',m?.bottomTemperature)}${this.tankReading('showerMinutes','Shower',m?.showerMinutes)}</div></div>`:nothing}</section>`:nothing}</div>${!ordered?html`<p class="caption">Pump order unavailable. Circuit connections and endpoint temperatures cannot be determined.</p>`:nothing}`:html`<p class="empty">No heat pump readings found. Select a Quatt installation.</p>`}
      <div class="extra">${charger&&this.showField('heatCharger.waterPressure')?this.metric('Heating pressure',charger.metrics.waterPressure,true):nothing}</div>
    </ha-card>`;
  }
}
