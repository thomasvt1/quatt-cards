import {describe,it,expect} from 'vitest';
import {historyMode} from '../../src/data/modes';
import {normalizeHistory} from '../../src/history';
import {buildSnapshot} from '../../src/data';
import {createDemo} from '../../src/demo/fixtures';
describe('reported operating state',()=>{
 it('recognizes current CIC descriptions and known numeric codes only',()=>{
   expect(historyMode('Heating - heatpump only')).toBe(2);
   expect(historyMode('6')).toBe(6);expect(historyMode('Standby')).toBe(0);
   for(const raw of ['','unknown','unavailable','Charge - normal','some future mode',123,null])expect(historyMode(raw)).toBeNull();
 });
 it('preserves missing mode intervals and their boundary timestamps',()=>{
   const source={entityId:'sensor.mode',kind:'mode' as const};
   const r=normalizeHistory([[{entity_id:'sensor.mode',state:'Standby',last_changed:1000},{state:'unavailable',last_changed:1010},{state:'Heating - heatpump only',last_changed:1020}]], [source],1000000,1030000);
   expect(r.series['sensor.mode']).toEqual([{time:1000000,value:0},{time:1010000,value:null},{time:1020000,value:2},{time:1030000,value:2}]);
 });
 it('requires explicit negative defrost reports before declaring no defrost',()=>{
   const {hass,registry}=createDemo();const config={type:'custom:quatt-status-card' as const};
   expect(buildSnapshot(hass,registry,config).status.some(s=>s.key==='no-defrost')).toBe(true);
   const entry=registry.entities.find(e=>e.unique_id?.endsWith('hp1.computedDefrost'))!;
   hass.states[entry.entity_id]={...hass.states[entry.entity_id],state:'unavailable'};
   expect(buildSnapshot(hass,registry,config).status.some(s=>s.key==='no-defrost')).toBe(false);
 });
});
