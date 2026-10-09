import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../../src/data';
import { circuitReadings, pumpPosition } from '../../src/data/circuit';
import { createDemo } from '../../src/demo/fixtures';
import type { CardConfig } from '../../src/types';
const config:CardConfig={type:'custom:quatt-heating-circuit-card'};
describe('heating circuit endpoints',()=>{
  it('orders renamed pumps independently of registry order and keeps Charger inlet separate',()=>{
    const {hass,registry}=createDemo();registry.entities.reverse();registry.devices.reverse();
    registry.devices.find(d=>d.id==='demo-hp-1')!.name_by_user='Z first';
    registry.devices.find(d=>d.id==='demo-hp-2')!.name_by_user='A second';
    const firstOutlet=registry.entities.find(e=>e.unique_id?.endsWith(':hp1.temperatureWaterOut'))!;
    hass.states[firstOutlet.entity_id].state='32.8';
    const chargerIn=registry.entities.find(e=>e.unique_id?.endsWith(':hc.chHeatExchangerInletTemperature'))!;
    hass.states[chargerIn.entity_id].state='61';
    const result=circuitReadings(buildSnapshot(hass,registry,config),config);
    expect(result.pumps.map(p=>p.name)).toEqual(['Z first','A second']);
    expect(result.supply?.value).toBe(35.2);expect(result.returnTemperature?.value).toBe(30.4);
    expect(result.delta?.value).toBeCloseTo(4.8);
  });
  it('uses one pump endpoints and normalizes Fahrenheit before calculating delta',()=>{
    const {hass,registry}=createDemo('single');
    const inlet=registry.entities.find(e=>e.unique_id?.endsWith(':hp1.temperatureWaterIn'))!;
    hass.states[inlet.entity_id].state='86';hass.states[inlet.entity_id].attributes.unit_of_measurement='°F';
    const result=circuitReadings(buildSnapshot(hass,registry,config),config);
    expect(result.pumps).toHaveLength(1);expect(result.ordered).toBe(true);expect(result.delta?.value).toBeCloseTo(5.2);
  });
  it('retains offline pumps without substituting earlier outlets or fabricating delta',()=>{
    const {hass,registry}=createDemo('offline');
    const result=circuitReadings(buildSnapshot(hass,registry,config),config);
    expect(result.pumps).toHaveLength(2);expect(result.supply?.value).toBeNull();expect(result.delta).toBeUndefined();
  });
  it('handles legacy identifiers and remote order; refuses contradictory keys',()=>{
    const {hass,registry}=createDemo();
    for(const e of registry.entities)e.unique_id=e.config_entry_id+e.unique_id!.split(':').at(-1)!;
    expect(circuitReadings(buildSnapshot(hass,registry,config),config).ordered).toBe(true);
    expect(pumpPosition(['heatPumps.1.status'])).toBe(2);
    expect(pumpPosition(['hp1.power','hp2.power'])).toBeUndefined();
  });
  it('uses explicit endpoint overrides and preserves negative delta',()=>{
    const {hass,registry}=createDemo();
    hass.states['sensor.supply']={entity_id:'sensor.supply',state:'18',attributes:{unit_of_measurement:'°C'}};
    hass.states['sensor.return']={entity_id:'sensor.return',state:'22',attributes:{unit_of_measurement:'°C'}};
    const configured={...config,entities:{supplyTemperature:'sensor.supply',returnTemperature:'sensor.return'}};
    const result=circuitReadings(buildSnapshot(hass,registry,configured),configured);
    expect(result.delta?.value).toBe(-4);
  });
  it('does not mistake a lone hp2 or contradictory order for a known single-pump circuit',()=>{
    const {hass,registry}=createDemo();registry.entities=registry.entities.filter(e=>e.device_id!=='demo-hp-1');
    const result=circuitReadings(buildSnapshot(hass,registry,config),config);
    expect(result.ordered).toBe(false);expect(result.supply).toBeUndefined();expect(result.delta).toBeUndefined();
  });
});
