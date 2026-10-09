import { QuattHeatingCircuitCard } from './cards/heating-circuit-card';
import { QuattOverviewCard } from './cards/overview-card';
import { QuattHistoryCard } from './cards/history-card';
import { QuattHeatPumpCard } from './cards/heat-pump-card';
import { QuattHeatBatteryCard } from './cards/heat-battery-card';
import { QuattChillCard } from './cards/chill-card';
import { QuattStatusCard } from './cards/status-card';
import { QuattCardEditor } from './editor';

const cards=[
  ['quatt-heating-circuit-card',QuattHeatingCircuitCard,'Quatt Heating Circuit','Heat-pump circuit, Heat Charger and thermal storage.'],
  ['quatt-overview-card',QuattOverviewCard,'Quatt Overview','Heat output, electricity input, COP and comfort.'],
  ['quatt-history-card',QuattHistoryCard,'Quatt Performance','Measured heat, electricity and COP over time.'],
  ['quatt-heat-pump-card',QuattHeatPumpCard,'Quatt Heat Pumps','Compare heat-pump readings and operating states.'],
  ['quatt-heat-battery-card',QuattHeatBatteryCard,'Quatt Heat Battery','Thermal charge, shower time and storage temperatures.'],
  ['quatt-chill-card',QuattChillCard,'Quatt Chill Rooms','Room readings and access to native Chill controls.'],
  ['quatt-status-card',QuattStatusCard,'Quatt Status','Operating mode, connectivity, protection and alerts.'],
] as const;
declare global { interface Window { customCards?: {type:string;name:string;description:string;preview:boolean}[]; } }
for(const [type,element,name,description] of cards) {
  if(!customElements.get(type)) customElements.define(type,element);
  window.customCards||=[];
  if(!window.customCards.some(card=>card.type===type)) window.customCards.push({type,name,description,preview:true});
}
if(!customElements.get('quatt-card-editor')) customElements.define('quatt-card-editor',QuattCardEditor);
console.info('QUATT CARDS 0.6.2 · Heating insights and Chill controls');
