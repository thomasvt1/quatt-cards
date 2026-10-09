import {describe,it,expect} from 'vitest';
import {cardFields,fieldVisible,statusField,validateFields} from '../../src/fields';
import type {CardConfig,CardType} from '../../src/types';

describe('displayed fields',()=>{
 it('preserves defaults while allowing partial overrides and opt-in overview details',()=>{
  const config:CardConfig={type:'custom:quatt-overview-card',fields:{cop:false,'heatBattery.topTemperature':true}};
  expect(fieldVisible(config,'cop')).toBe(false);
  expect(fieldVisible(config,'heatPower')).toBe(true);
  expect(fieldVisible(config,'heatBattery.charge')).toBe(true);
  expect(fieldVisible(config,'heatBattery.topTemperature')).toBe(true);
  expect(fieldVisible(config,'heatBattery.bottomTemperature')).toBe(false);
 });
 it('rejects malformed and unsupported YAML selections',()=>{
  for(const fields of [null,[],{cop:'false'},{unknown:true}])expect(()=>validateFields({type:'custom:quatt-overview-card',fields})).toThrow();
 });
 it('gives each card a unique, valid field catalog and permits hiding all fields',()=>{
  for(const [type,fields] of Object.entries(cardFields)){
   expect(new Set(fields.map(f=>f.key)).size).toBe(fields.length);
   const config:CardConfig={type:type as CardType,fields:Object.fromEntries(fields.map(f=>[f.key,false]))};
   expect(()=>validateFields(config)).not.toThrow();
   expect(fields.some(f=>fieldVisible(config,f.key))).toBe(false);
  }
 });
 it('uses stable status categories independent of device names',()=>{
  expect(statusField('arbitrary-id-offline')).toBe('connectivity');
  expect(statusField('arbitrary-id-defrost')).toBe('defrost');
  expect(statusField('arbitrary-id-limited')).toBe('limits');
  expect(statusField('battery-charging')).toBe('heatBattery');
  expect(statusField('arbitrary-id-water')).toBe('alerts');
 });
});
