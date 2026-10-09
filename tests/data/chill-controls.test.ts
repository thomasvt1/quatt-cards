import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../../src/data';
import { createDemo } from '../../src/demo/fixtures';
import type { CardConfig } from '../../src/types';

const config: CardConfig={type:'custom:quatt-chill-card'};
describe('Chill control targets',()=>{
  it('keeps each renamed climate entity bound to its registry device',()=>{
    const {hass,registry}=createDemo();
    const entry=registry.entities.find(e=>e.device_id==='demo-chill-1'&&e.entity_id.startsWith('climate.'))!;
    const previous=entry.entity_id;entry.entity_id='climate.renamed_room';
    hass.states[entry.entity_id]={...hass.states[previous],entity_id:entry.entity_id};delete hass.states[previous];
    const rooms=buildSnapshot(hass,registry,config).chills;
    expect(rooms[0].climateEntityId).toBe('climate.renamed_room');
    expect(rooms[1].climateEntityId).not.toBe(rooms[0].climateEntityId);
  });
  it('supports indexed legacy Chill climate keys',()=>{
    const {hass,registry}=createDemo();
    registry.entities.filter(e=>e.entity_id.startsWith('climate.')).forEach((e,i)=>{e.unique_id=`${e.config_entry_id}chills.${i}`;});
    expect(buildSnapshot(hass,registry,config).chills.every(d=>d.climateEntityId?.startsWith('climate.'))).toBe(true);
  });
  it('does not use disabled, foreign or ambiguous climate targets',()=>{
    for(const scenario of ['disabled','foreign','duplicate'] as const){
      const {hass,registry}=createDemo();
      const entry=registry.entities.find(e=>e.device_id==='demo-chill-1'&&e.entity_id.startsWith('climate.'))!;
      if(scenario==='disabled')entry.disabled_by='user';
      if(scenario==='foreign')entry.platform='other';
      if(scenario==='duplicate')registry.entities.push({...entry,entity_id:'climate.duplicate'});
      expect(buildSnapshot(hass,registry,config).chills[0].climateEntityId).toBeUndefined();
    }
  });
  it('reading overrides cannot redirect controls to another unit',()=>{
    const {hass,registry}=createDemo();
    const before=buildSnapshot(hass,registry,config).chills;
    const after=buildSnapshot(hass,registry,{...config,device:before[0].id,entities:{targetTemperature:before[1].climateEntityId!}});
    expect(after.chills[0].climateEntityId).toBe(before[0].climateEntityId);
  });
  it('keeps offline status authoritative even with cached climate readings',()=>{
    const {hass,registry}=createDemo('offline');
    const room=buildSnapshot(hass,registry,config).chills[1];
    expect(room.climateEntityId).toBeTruthy();expect(room.available).toBe(false);
  });
});
