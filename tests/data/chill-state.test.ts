import {describe,it,expect} from 'vitest';
import {chillState} from '../../src/data/chill-state';
import type {QuattDevice} from '../../src/types';

function device(status?:string,mode?:string,available=true):QuattDevice {
  return {id:'test',name:'Room',kind:'chill',available,metrics:{
    status:{value:null,text:status??null,unit:''},mode:{value:null,text:mode??null,unit:''},
  }};
}
describe('Chill icon state',()=>{
  it('keeps selected cooling/heating separate from off and standby status',()=>{
    expect(chillState(device('Off','Cooling'))).toMatchObject({state:'off',setting:'cooling',activity:'neutral',activityIcon:'power',statusIcon:'power',modeIcon:'snow'});
    expect(chillState(device('Standby','Heating'))).toMatchObject({state:'idle',setting:'heating',statusIcon:'power',modeIcon:'heat'});
    expect(chillState(device('Cooling','Heating'))).toMatchObject({activity:'cooling',activityIcon:'snow'});
    expect(chillState(device('On','Heating'))).toMatchObject({state:'on',setting:'heating',activity:'heating',activityIcon:'heat',statusIcon:'tick'});
  });
  it('never fabricates an active status or a mode from missing or unfamiliar reports',()=>{
    expect(chillState(device(undefined,'Cooling'))).toMatchObject({state:'unknown',setting:'cooling',statusIcon:'question'});
    expect(chillState(device('Heating'))).toMatchObject({state:'on',setting:'neutral',modeIcon:'question'});
    expect(chillState(device('Starting','Dry'))).toMatchObject({state:'unknown',setting:'neutral',statusText:'Starting',modeText:'Dry'});
  });
  it('gives unavailable telemetry precedence over cached active reports',()=>{
    expect(chillState(device('On','Cooling',false))).toMatchObject({state:'offline',statusIcon:'warning',statusText:'Unavailable'});
    expect(chillState(device('Offline','Heating'))).toMatchObject({state:'offline'});
  });
});

describe('reported Quatt working states',()=>{
  it('renders On working plus Cooling as a blue snowflake, never a question mark',()=>{
    expect(chillState(device('On working','Cooling'))).toMatchObject({state:'on',activity:'cooling',activityIcon:'snow'});
  });
});

describe('Chill API and display spelling compatibility',()=>{
 it.each(['On working','ON_WORKING',' on   WORKING ','on_working'])('recognizes active cooling from %s',status=>{
  expect(chillState(device(status,'COOLING'))).toMatchObject({state:'on',activity:'cooling',activityIcon:'snow'});
  expect(chillState(device(status,'HEATING'))).toMatchObject({state:'on',activity:'heating',activityIcon:'heat'});
 });
 it.each(['On idle','ON_IDLE','On standby','ON_STANDBY','Idle','Standby'])('keeps %s neutral even with cooling selected',status=>{
  expect(chillState(device(status,'Cooling'))).toMatchObject({state:'idle',activity:'neutral',activityIcon:'power'});
 });
 it('does not infer active cooling from a selected mode or a new unknown on-state',()=>{
  expect(chillState(device('On starting','Cooling'))).toMatchObject({state:'unknown',activityIcon:'question'});
  expect(chillState(device('On working',undefined))).toMatchObject({state:'on',activity:'neutral',activityIcon:'tick'});
  expect(chillState(device('On working','Cooling',false))).toMatchObject({state:'offline',activityIcon:'warning'});
 });
});
