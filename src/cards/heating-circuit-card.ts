import { css, html, nothing } from 'lit';
import { BaseCard } from '../base-card';
import { circuitReadings } from '../data/circuit';
import type { Reading } from '../types';
import { icon } from '../ui';

export class QuattHeatingCircuitCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-heating-circuit-card'}; }
  getCardSize() { return 6; }
  static styles=[BaseCard.styles,css`
    :host{--qc-supply:var(--qc-heating-override,var(--quatt-supply-color,#e34d59));--qc-return:var(--qc-cooling-override,var(--quatt-return-color,#00a9ed))}
    .ob-header{margin-bottom:14px}.summary{display:flex;flex-wrap:wrap;gap:8px 20px;margin-bottom:14px}
    .summary-item{display:flex;align-items:center;gap:7px;min-width:0}.summary-item .label{font-size:13px}
    .summary-item .value{font-size:var(--qc-value-size,17px)}.summary-item>.icon{width:20px;height:22px}
    .summary-item.electric>.icon{color:var(--qc-return)}.summary-item.heat>.icon{color:var(--qc-supply)}
    .diagram{width:100%}.loop{position:relative;display:grid;grid-template-columns:90px minmax(0,1fr) 90px;grid-template-rows:50px auto 48px 51px;padding:0 12px;isolation:isolate}
    .equipment{display:contents}.unit{grid-row:2;text-align:center;min-width:0;position:relative;padding-top:26px;align-self:stretch}.pump{grid-column:1}.home{grid-column:3}
    .unit .icon{display:block;margin:auto;width:70px;height:62px;max-width:100%;stroke-width:1.05}
    .unit.home .icon{width:62px;stroke-width:1.3}.unit-name{position:relative;display:table;margin:3px auto 0;background:var(--qc-background,var(--ha-card-background,var(--card-background-color,#fff)));padding:0 4px;font-size:12px;line-height:1.35;overflow-wrap:anywhere;max-width:100%}
    .home .unit-name{transform:translateX(-8px);background:transparent}
    .unit.offline .icon{color:var(--qc-secondary)}.unavailable{position:relative;font-size:11px;color:var(--qc-secondary);display:block;background:var(--qc-background,var(--ha-card-background,var(--card-background-color,#fff)))}
    .pipes{position:absolute;pointer-events:none;z-index:-1}.supply-pipe{top:50px;left:57px;right:57px;height:28px;border:3px solid var(--qc-supply);border-bottom:0;border-radius:8px 8px 0 0}
    .return-pipe{top:130.25px;bottom:85px;left:55.5px;right:42.5833px;border:3px solid var(--qc-return);border-top:0;border-radius:0 0 8px 8px}
    .pump::before{content:'';position:absolute;top:77.67px;left:calc(50% - 1.5px);height:4px;border-left:3px solid var(--qc-return);z-index:-1}
    .loop:not(.ordered) .pump::before,.loop:not(.ordered) .home::after{display:none}
    .supply-reading{grid-row:1;grid-column:1/-1;height:50px;text-align:center;display:grid;justify-items:center;align-content:start}
    .inline-readings{grid-row:3;grid-column:1/-1;display:flex;justify-content:center;align-items:center;gap:12px;font-size:13px;padding-top:24px;height:48px;white-space:nowrap}
    .inline-readings .value{font-size:var(--qc-value-size,13px);font-weight:500}.delta{display:flex;gap:4px}
    .return-reading{grid-row:4;grid-column:1/-1;display:grid;justify-items:center;text-align:center;min-height:51px;padding-top:7px}.return-reading .label,.supply-reading .label{font-size:12px}
    .storage{--thermal-gap:38px;grid-row:2;grid-column:2;display:flex;justify-content:center;align-items:flex-start;gap:38px;padding:26px 10px 24px;min-width:0;min-height:185px}
    .charger{display:flex;flex-direction:column;align-items:center;position:relative;flex:0 0 85px;min-width:0;text-align:center}
    .relationship{position:absolute;bottom:100%;height:26px;left:50%;border-left:2px dashed var(--qc-secondary)}
    .charger-label{font-size:12px;white-space:nowrap}.thermal{width:100%;height:67px;position:relative;display:grid;place-items:center}
    .thermal>.icon{width:46px;height:58px}.thermal-line{position:absolute;width:calc(50% + var(--thermal-gap) - 30px);height:16px;left:calc(50% + 21px);top:26px;color:var(--qc-heat)}
    .thermal-shaft{position:absolute;top:7px;left:1px;right:1px;border-top:2px dashed currentColor}
    .thermal-line::before,.thermal-line::after{content:'';position:absolute;top:4px;width:6px;height:6px;border-top:2px solid currentColor;border-right:2px solid currentColor}
    .thermal-line::before{left:1px;transform:rotate(-135deg)}.thermal-line::after{right:1px;transform:rotate(45deg)}
    .charger-input{display:flex;justify-content:center;flex-wrap:wrap;gap:0 4px;margin-top:4px;font-size:12px}.charger-input .value{font-size:var(--qc-value-size,13px);font-weight:500}
    .battery{display:flex;gap:10px;align-items:flex-start;min-width:0;flex:0 1 190px;padding-top:20px;position:relative}.battery>.icon{width:42px;height:88px;stroke-width:1.05;flex:none}
    .battery-data{min-width:0;flex:1}.battery-title{position:absolute;top:0;left:0;font-size:12px;white-space:nowrap}
    .charge .value{font-size:var(--qc-value-size,23px);line-height:1.25}.bar{height:7px;background:var(--qc-line);border-radius:8px;margin:8px 0 10px;overflow:hidden}.bar>span{display:block;height:100%;background:var(--qc-heat);border-radius:inherit}
    .tank-reading{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:4px}.tank-reading .value{font-size:var(--qc-value-size,13px);white-space:nowrap}.tank-reading .label{font-size:11px}
    .loop:not(.has-storage) .unit{min-height:155px}
    .extra{display:flex;flex-wrap:wrap;gap:12px 24px;margin-top:14px}.extra:empty{display:none}
    @container(max-width:620px){
      .summary{gap:8px 14px}.summary-item{gap:5px}.summary-item .label{font-size:12px}.summary-item .value{font-size:var(--qc-value-size,15px)}
      .loop{grid-template-columns:76px minmax(0,1fr) 76px;grid-template-rows:50px auto auto 48px 51px;padding:0 4px}.supply-pipe{top:107px;left:70px;right:60px;height:0;border:0;border-top:3px solid var(--qc-supply);border-radius:0}.supply-reading{transform:translateY(30px)}
      .inline-readings{grid-row:4}.return-reading{grid-row:5}
      .storage{--thermal-gap:28px;grid-row:3;grid-column:1/-1;margin:0 8px;padding:35px 0 30px;gap:28px;min-height:190px}
      .has-storage .unit{min-height:140px}.unit .icon{width:62px}.return-pipe{left:4px;right:4px;top:135px}
      .home::after{content:'';position:absolute;top:57px;left:calc(50% + 18px);right:0;height:30px;border-right:3px solid var(--qc-return);border-top:3px solid var(--qc-return);border-radius:0 8px 0 0;z-index:-1}
      .pump::before{top:57px;left:0;width:10px;height:30px;border-top:3px solid var(--qc-return);border-radius:8px 0 0 0}
      .relationship{height:118px;}.charger{flex-basis:80px}.battery{flex-basis:165px;gap:7px}.battery>.icon{width:35px}
    }
    @container(max-width:380px){.summary-item>.icon{width:17px}.summary{gap:6px 12px}.summary-item .label{font-size:11px}.summary-item .value{font-size:var(--qc-value-size,14px)}.storage{--thermal-gap:22px;gap:22px;margin:0 6px}.charger{flex-basis:75px}.battery{flex-basis:150px}.tank-reading{gap:4px}.tank-reading .value{font-size:var(--qc-value-size,12px)}}
  `];
  private summary(key:string,label:string,reading:Reading|undefined,symbol:string,tone='') {
    return this.showField(key)?html`<div class=${`summary-item ${tone}`}>${icon(symbol)}<span class="label">${label}</span>${this.value(reading,label,'value',key==='cop'?1:2)}</div>`:nothing;
  }
  private tankReading(key:string,label:string,reading?:Reading) {
    return this.showField(`heatBattery.${key}`)&&reading?html`<div class="tank-reading"><span class="label">${label}</span>${this.value(reading,`Heat battery ${label}`)}</div>`:nothing;
  }
  protected renderContent() {
    const snapshot=this.snapshot,{pumps,ordered,supply,returnTemperature,delta}=circuitReadings(snapshot,this.config);
    const battery=snapshot.heatBattery,charger=snapshot.heatCharger,m=battery?.metrics;
    const duo=pumps.length===2;

    return html`<ha-card>${this.renderHeader('Heating circuit')}${this.renderNotice()}
      <div class="summary">${this.summary('electricPower','HP input',snapshot.system.electricPower,'electric','electric')}${this.summary('heatPower','HP output',snapshot.system.heatPower,'heat','heat')}${this.summary('cop','HP COP',snapshot.system.cop,'fan')}</div>
      ${pumps.length?html`<div class="diagram"><section class=${`loop ${battery||charger?'has-storage':''} ${ordered?'ordered':''}`} aria-label="Heat pumps and home heating circuit">
        ${ordered?html`<div class="pipes supply-pipe" aria-hidden="true"></div><div class="pipes return-pipe" aria-hidden="true"></div>`:nothing}
        ${this.showField('supplyTemperature')?html`<div class="supply-reading"><span class="label">Supply</span>${this.value(supply,'Supply')}</div>`:nothing}
        <div class="equipment">${duo?html`<div class=${`unit pump duo ${pumps.every(p=>!p.available)?'offline':''}`}>${icon('pump-duo')}<span class="unit-name" title=${pumps.map(p=>p.name).join(' + ')}>Quatt Duo</span>${pumps.filter(p=>!p.available).map(p=>html`<span class="unavailable">${p.name} unavailable</span>`)}</div>`:pumps.map(p=>html`<div class=${`unit pump ${p.available?'':'offline'}`}>${icon('pump')}<span class="unit-name" title=${p.name}>${p.name}</span>${!p.available?html`<span class="unavailable">Unavailable</span>`:nothing}</div>`)}<div class="unit home">${icon('home')}<span class="unit-name">Home</span></div></div>
      ${battery||charger?html`<section class="storage" aria-label="Heat storage">${charger?html`<div class="charger">${ordered?html`<span class="relationship" aria-hidden="true" title="System relationship, not a water pipe"></span>`:nothing}<span class="charger-label">Heat Charger</span><div class="thermal" title="Thermal connection; arrows do not indicate live flow">${icon('heat-charger')}${battery?html`<span class="thermal-line" aria-hidden="true"><span class="thermal-shaft"></span></span>`:nothing}</div>${this.showField('heatCharger.heaterPower')&&charger.metrics.heaterPower?html`<div class="charger-input">${this.value(charger.metrics.heaterPower,'Heat Charger electric input')}<span class="label">input</span></div>`:nothing}</div>`:nothing}
        ${battery?html`<div class="battery">${icon('tank')}<div class="battery-data"><div class="battery-title">Heat Battery</div>${this.showField('heatBattery.charge')?html`<div class="charge">${this.value(m?.charge,'Heat battery charge')}</div>${m?.charge?.value!=null?html`<div class="bar" role="meter" aria-label="Heat battery charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${m.charge.value}><span style=${`width:${m.charge.value}%`}></span></div>`:nothing}`:nothing}${this.tankReading('topTemperature','Top',m?.topTemperature)}${this.tankReading('middleTemperature','Middle',m?.middleTemperature)}${this.tankReading('bottomTemperature','Bottom',m?.bottomTemperature)}${this.tankReading('showerMinutes','Shower',m?.showerMinutes)}</div></div>`:nothing}</section>`:nothing}
        <div class="inline-readings">${this.showField('flowRate')?this.value(snapshot.system.flowRate,'Water flow'):nothing}${this.showField('deltaTemperature')?html`<span class="delta" title="Calculated: final heat pump outlet minus first heat pump inlet">ΔT ${this.value(delta,'Temperature difference')}</span>`:nothing}</div>
        <div class="return-reading">${this.showField('returnTemperature')?html`<span class="label">Return</span>${this.value(returnTemperature,'Return')}`:nothing}</div>
      </section></div>${!ordered?html`<p class="caption">Pump order unavailable. Circuit connections and endpoint temperatures cannot be determined.</p>`:nothing}`:html`<p class="empty">No heat pump readings found. Select a Quatt installation.</p>`}
      <div class="extra">${charger&&this.showField('heatCharger.waterPressure')?this.metric('Heating pressure',charger.metrics.waterPressure,true):nothing}</div>
    </ha-card>`;
  }
}
