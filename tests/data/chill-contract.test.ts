import {describe,it,expect} from 'vitest';
import {buildSnapshot} from '../../src/data';
import {chillState} from '../../src/data/chill-state';
import {createDemo} from '../../src/demo/fixtures';
import {chillStates,displayStatus} from '../fixtures/chill-states';

function snapshot(status:string,mode:string,unavailable=false){
  const {hass,registry}=createDemo('cooling');
  for(const entry of registry.entities.filter(e=>e.device_id==='demo-chill-1')){
    const entity=hass.states[entry.entity_id];
    if(unavailable)entity.state='unavailable';
    else if(entry.unique_id?.endsWith(':chills.status'))entity.state=status;
    else if(entry.unique_id?.endsWith(':chills.mode'))entity.state=mode;
  }
  return buildSnapshot(hass,registry,{type:'custom:quatt-chill-card'});
}

describe('complete known Chill status contract through HA discovery',()=>{
  it.each(chillStates)('$status survives formatting, mode changes and unavailable telemetry',row=>{
    for(const status of [row.status,displayStatus(row.status),` ${row.status.toLowerCase().replaceAll('_','  ')} `]){
      for(const mode of ['Cooling','Heating','COOL','HEAT','unknown','unavailable','','Dry']){
        const setting=/^cool/i.test(mode)?'cooling':/^heat/i.test(mode)?'heating':'neutral';
        const activity=row.activity==='mode'?setting:row.activity;
        const activityIcon=row.icon==='mode'?(setting==='cooling'?'snow':setting==='heating'?'heat':'tick'):row.icon;
        const data=snapshot(status,mode),device=data.chills[0];
        expect(chillState(device)).toMatchObject({state:row.state,activity,activityIcon,setting});
        expect(device.available).toBe(row.state!=='offline');
        expect(chillState(snapshot(status,mode,true).chills[0])).toMatchObject({state:'offline',activity:'neutral',activityIcon:'warning'});
        if(row.status==='WARNING_DISCONNECTED')expect(data.status).toContainEqual(expect.objectContaining({key:'demo-chill-1-offline',detail:status.trim()}));
        if(row.state==='warning')expect(data.status).toContainEqual(expect.objectContaining({key:'demo-chill-1-warning',tone:'warning',detail:status.trim()}));
      }
    }
  });
  it.each(['WARNING_NEW_REASON','Warning','ERROR_NEW_REASON','Error','FAULT_NEW_REASON','Fault'])('preserves explicit diagnostic %s without claiming active cooling',status=>{
    const device=snapshot(status,'Cooling').chills[0];
    expect(chillState(device)).toMatchObject({state:'warning',activity:'neutral',activityIcon:'warning',statusText:status});
  });
  it.each(['unknown','unavailable','none','null','','ON_NEW_STATE','ON_STARTING','NOT_COOLING','WARNINGISH','ERRORLESS'])('does not fabricate activity for %s',status=>{
    expect(chillState(snapshot(status,'Cooling').chills[0])).toMatchObject({state:'unknown',activity:'neutral',activityIcon:'question'});
  });
});
