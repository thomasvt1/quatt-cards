import type { CardConfig, CardType } from './types';

export interface FieldOption { key: string; label: string; default?: boolean; }
const field=(key:string,label:string,enabled=true):FieldOption=>({key,label,default:enabled});
const power=[field('electricPower','Electric input'),field('cop','COP'),field('heatPower','Heat output')];
const comfort=[field('roomTemperature','Room temperature'),field('targetTemperature','Target temperature'),field('outdoorTemperature','Outside temperature'),field('flowRate','Water flow')];
export const cardFields:Record<CardType,FieldOption[]>={
  'custom:quatt-overview-card': [...power,...comfort,field('supplyTemperature','Supply temperature',false),field('mode','Operating mode'),
    field('heatBattery.charge','Heat battery · charge'),field('heatBattery.showerMinutes','Heat battery · shower time'),field('heatBattery.status','Heat battery · status'),
    field('heatBattery.topTemperature','Heat battery · top temperature',false),field('heatBattery.middleTemperature','Heat battery · middle temperature',false),field('heatBattery.bottomTemperature','Heat battery · bottom temperature',false),
    field('heatBattery.charging','Heat battery · charging',false),field('heatBattery.hotWater','Heat battery · hot-water use',false),field('heatCharger.heaterPower','Heat charger · electric input',false),field('heatCharger.waterPressure','Heat charger · water pressure',false)],
  'custom:quatt-heat-pump-card': [...power,field('returnTemperature','Water in'),field('supplyTemperature','Water out'),field('status','Operating status',false),field('compressorSpeed','Compressor speed'),field('outdoorTemperature','Outside temperature')],
  'custom:quatt-heat-battery-card': [field('charge','Thermal charge'),field('showerMinutes','Shower time'),field('topTemperature','Top temperature'),field('middleTemperature','Middle temperature'),field('bottomTemperature','Bottom temperature'),field('status','Operating status'),field('heaterPower','Charger input'),field('waterPressure','Water pressure'),field('charging','Storage charging'),field('hotWater','Hot-water use'),field('boost','Boost')],
  'custom:quatt-chill-card': [field('roomTemperature','Room temperature'),field('targetTemperature','Target temperature'),field('fanMode','Fan speed'),field('status','Operating status'),field('mode','Operating mode'),field('waterWarning','Water tank warning')],
  'custom:quatt-history-card': [...power,field('mode','Operating-mode timeline')],
  'custom:quatt-status-card': [field('mode','Operating mode'),field('connectivity','Connectivity and availability'),field('defrost','Defrost'),field('heatBattery','Heat battery and hot water'),field('limits','COP limits and silent mode'),field('alerts','Faults and water warnings')],
};
export function fieldVisible(config:CardConfig,key:string):boolean {
  return config.fields?.[key] ?? cardFields[config.type]?.find(f=>f.key===key)?.default ?? true;
}
export function validateFields(config:Pick<CardConfig,'type'> & {fields?:unknown}) {
  if(config.fields===undefined)return;
  if(!config.fields||typeof config.fields!=='object'||Array.isArray(config.fields))throw new Error('fields must map field names to true or false.');
  const allowed=new Set(cardFields[config.type]?.map(f=>f.key));
  for(const [key,value] of Object.entries(config.fields)){
    if(!allowed.has(key))throw new Error(`Unknown field: ${key}. Choose a field listed in the card editor.`);
    if(typeof value!=='boolean')throw new Error(`Field ${key} must be true or false.`);
  }
}
export function statusField(key:string):string {
  if(key==='mode')return 'mode';
  if(key==='no-defrost'||key.endsWith('-defrost'))return 'defrost';
  if(key==='controller'||key==='pumps-connected'||key==='chills-available'||key.endsWith('-offline'))return 'connectivity';
  if(key.startsWith('battery-')||key==='hot-water')return 'heatBattery';
  if(key==='silent-system'||key.endsWith('-silent')||key.endsWith('-limited'))return 'limits';
  return 'alerts';
}
