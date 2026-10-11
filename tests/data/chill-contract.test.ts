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
        const indicatorTone=row.state==='maintaining'?setting:activity;
        const activityIcon=row.icon==='mode'?(setting==='cooling'?'snow':setting==='heating'?'heat':'tick'):row.icon;
        const data=snapshot(status,mode),device=data.chills[0];
        expect(chillState(device)).toMatchObject({state:row.state,activity,indicatorTone,activityIcon,setting});
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

describe('heating-system conflict while Chill is switched off',()=>{
  function conflict(power?:string,climate='off',status='WARNING_NOT_COOLING_HEATING_SYSTEM_IS_HEATING',indexed=false){
    const {hass,registry}=createDemo('cooling');
    const entries=registry.entities.filter(e=>e.device_id==='demo-chill-1');
    for(const entry of entries){
      if(entry.unique_id?.endsWith(':chills.status'))hass.states[entry.entity_id].state=status;
      if(entry.entity_id.startsWith('climate.'))hass.states[entry.entity_id].state=climate;
    }
    if(power!==undefined){
      const id='binary_sensor.chill_power',source=entries.find(e=>e.unique_id?.endsWith(':chills.status'))!;
      registry.entities.push({...source,entity_id:id,unique_id:source.unique_id!.replace('chills.status',indexed?'chills.0.isOn.value':'chills.isOn.value')});
      hass.states[id]={entity_id:id,state:power,attributes:{}};
    }
    return buildSnapshot(hass,registry,{type:'custom:quatt-chill-card'});
  }
  it.each(['off','OFF','false','0'])('uses explicit power %s even with a cached cooling climate state',power=>{
    for(const indexed of [false,true])for(const status of ['WARNING_NOT_COOLING_HEATING_SYSTEM_IS_HEATING','Warning not cooling heating system is heating']){
      const data=conflict(power,'cool',status,indexed);
      expect(data.chills[0].metrics.power?.value).toBe(0);
      expect(chillState(data.chills[0])).toMatchObject({state:'off',activity:'neutral',indicatorTone:'neutral',activityIcon:'power',statusIcon:'power',statusText:'Off'});
      expect(data.status.some(row=>row.key==='demo-chill-1-warning')).toBe(false);
      expect(data.chills[0].available).toBe(true);
    }
  });
  it.each([undefined,'unknown','unavailable'])('falls back to climate Off when power is %s',power=>{
    expect(chillState(conflict(power).chills[0]).state).toBe('off');
    for(const climate of ['cool','unknown','unavailable'])expect(chillState(conflict(power,climate).chills[0]).state).toBe('warning');
  });
  it('keeps the warning when explicit power is on despite climate Off',()=>{
    const data=conflict('on');
    expect(chillState(data.chills[0]).state).toBe('warning');
    expect(data.status.some(row=>row.key==='demo-chill-1-warning')).toBe(true);
  });
  it.each(['WARNING_DISCONNECTED','WARNING_NEW_REASON','ERROR_NEW_REASON','FAULT_NEW_REASON'])('preserves %s with power off',status=>{
    const data=conflict('off','off',status);
    expect(chillState(data.chills[0])).toMatchObject({state:status==='WARNING_DISCONNECTED'?'offline':'warning',activityIcon:'warning',statusText:status});
    expect(data.status.some(row=>row.key.startsWith('demo-chill-1-'))).toBe(true);
  });
  it('keeps unavailable devices offline',()=>{
    const data=conflict('off'),device=data.chills[0];
    device.available=false;
    expect(chillState(device)).toMatchObject({state:'offline',activityIcon:'warning'});
  });
});
