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
    expect(chillState(device('Off','Cooling'))).toMatchObject({state:'off',setting:'cooling',statusIcon:'power',modeIcon:'snow'});
    expect(chillState(device('Standby','Heating'))).toMatchObject({state:'idle',setting:'heating',statusIcon:'clock',modeIcon:'heat'});
    expect(chillState(device('On','Heating'))).toMatchObject({state:'on',setting:'heating',statusIcon:'tick'});
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
