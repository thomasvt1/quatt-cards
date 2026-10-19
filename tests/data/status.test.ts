import {describe,it,expect} from 'vitest';
import {createDemo} from '../../src/demo/fixtures';
import {buildSnapshot} from '../../src/data';
import {buildStatus} from '../../src/data/status';

function snapshot(){const {hass,registry}=createDemo();return buildSnapshot(hass,registry,{type:'custom:quatt-status-card'});}
describe('separate battery and charger status',()=>{
 it('combines the storage status and charging flag into one battery row',()=>{
  const s=snapshot();
  s.heatBattery!.metrics.status={value:null,text:'Charging',unit:'',entityId:'sensor.battery_status'};
  s.heatBattery!.metrics.charging={value:1,text:null,unit:'',entityId:'binary_sensor.charging'};
  const rows=buildStatus(s),battery=rows.filter(r=>r.key.startsWith('battery-'));
  expect(battery).toHaveLength(1);expect(battery[0]).toMatchObject({title:'Heat battery charging',entityId:'binary_sensor.charging'});
  expect(rows.find(r=>r.key==='charger-status')).toMatchObject({title:'Heat charger',detail:'Electrical input: 0 W',icon:'heat-charger'});
 });
 it('uses charger telemetry independently and does not label battery charging as charger activity',()=>{
  const s=snapshot();s.heatBattery!.metrics.charging!.value=0;s.heatBattery!.metrics.status!.text='Off';
  s.heatCharger!.metrics.heaterPower!.value=1200;
  const rows=buildStatus(s);expect(rows.find(r=>r.key==='battery-status')?.title).toBe('Heat battery off');
  expect(rows.find(r=>r.key==='charger-status')?.detail).toBe('Electrical input: 1200 W');
  s.heatCharger!.metrics.heaterPower!.value=null;
  expect(buildStatus(s).find(r=>r.key==='charger-status')?.detail).toBe('Electrical input unavailable');
 });
 it('preserves offline alerts without positive battery or charger status rows',()=>{
  const s=snapshot();s.heatBattery!.available=false;s.heatBattery!.metrics.charging!.value=1;s.heatCharger!.available=false;
  const rows=buildStatus(s);expect(rows.some(r=>['battery-status','charger-status'].includes(r.key))).toBe(false);
  expect(rows.filter(r=>r.key.endsWith('-offline'))).toHaveLength(2);
  s.heatBattery=undefined;s.heatCharger=undefined;
  expect(buildStatus(s).some(r=>['battery-status','charger-status'].includes(r.key))).toBe(false);
 });
});
