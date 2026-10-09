import {test,expect} from './fixtures';
import {cardFields} from '../../src/fields';
import type {HomeAssistant} from '../../src/types';
type Card=HTMLElement&{hass:HomeAssistant};

test('Chill working reports render the cooling/heating badge and preserve off, idle and unknown states',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.demo.setScenario('cooling'));
 const card=page.locator('quatt-chill-card'),control=card.getByRole('button',{name:'Control Living room',exact:true});
 await expect(control).toHaveClass(/cooling on/);await expect(control.locator('.icon-snow')).toHaveCount(1);
 await expect(control.locator('.icon-question')).toHaveCount(0);await expect(control).toHaveAccessibleDescription('Status: On working · Mode: Cooling');
 expect(await control.evaluate(e=>getComputedStyle(e).color)).toBe('rgb(0, 169, 237)');
 for(const [status,mode,state,tone,icon] of [['ON_WORKING','HEATING','on','heating','heat'],['On idle','Cooling','idle','neutral','power'],['Off','Cooling','off','neutral','power'],['Starting','Cooling','unknown','neutral','question'],['Offline','Cooling','offline','neutral','warning'],['On working','Cooling','on','cooling','snow']]){
  await card.evaluate((e,{status,mode})=>{const c=e as Card,states={...c.hass.states};for(const [id,s] of Object.entries(states))if(id.includes('demo-chill-uuid-1')){if(id.endsWith('_status'))states[id]={...s,state:status};if(id.endsWith('_mode'))states[id]={...s,state:mode};}c.hass={...c.hass,states};},{status,mode});
  await expect(control).toHaveClass(new RegExp(`${tone} ${state}`));await expect(control.locator(`.status-badge .icon-${icon}`)).toHaveCount(1);
 }
 await card.screenshot({path:'.impeccable/review/chill-working-regression.png'});
});

test('every card honors an entirely hidden field selection and restores available readings',async({page})=>{
 await page.goto('/');
 for(const [type,fields] of Object.entries(cardFields)){
  const off=Object.fromEntries(fields.map(f=>[f.key,false]));
  await page.evaluate(({type,fields})=>window.demo.setConfig(type,{fields}),{type,fields:off});
  const card=page.locator(type.slice(7));
  await expect(card.getByText('No fields selected. Choose Displayed fields in the card editor.',{exact:true})).toBeVisible();
  await expect(card.getByRole('button',{name:/Show details/})).toHaveCount(0);
  await page.evaluate(({type,fields})=>window.demo.setConfig(type,{fields}),{type,fields:Object.fromEntries(fields.map(f=>[f.key,true]))});
  await expect(card.getByText('No fields selected. Choose Displayed fields in the card editor.',{exact:true})).toHaveCount(0);
 }
 await page.evaluate(()=>document.addEventListener('hass-more-info',e=>{document.body.dataset.entity=(e as CustomEvent).detail.entityId;}));
 await page.locator('quatt-status-card').getByRole('button',{name:/Reported system operating mode Show details/}).click();
 await expect(page.locator('body')).toHaveAttribute('data-entity',/supervisorycontrolmode$/);
 await page.locator('quatt-overview-card').getByRole('button',{name:/Heat battery status:.*Show details/}).click();
 await expect(page.locator('body')).toHaveAttribute('data-entity',/heatbatterystatus$/);
});

test('battery missing charge, status and optional sensors stay truthful',async({page})=>{
 await page.goto('/');const card=page.locator('quatt-heat-battery-card');
 await page.evaluate(()=>{window.demo.setScenario('partial');window.demo.setConfig('heat-battery',{fields:{showerMinutes:false}});});
 await expect(card.getByText('Thermal charge unavailable',{exact:true})).toBeVisible();await expect(card.getByRole('meter')).toHaveCount(0);
 await card.evaluate(e=>{const c=e as Card,states={...c.hass.states};for(const [id,s] of Object.entries(states)){if(id.endsWith('heatbatterystatus'))states[id]={...s,state:'unavailable'};if(id.endsWith('isheatbatterycharging'))states[id]={...s,state:'on'};}c.hass={...c.hass,states};});
 await expect(card.locator('.state-line')).toHaveText('Charging');
 await card.evaluate(e=>{const c=e as Card,states={...c.hass.states};for(const [id,s] of Object.entries(states))if(id.endsWith('isheatbatterycharging'))states[id]={...s,state:'off'};c.hass={...c.hass,states};});
 await expect(card.locator('.state-line')).toHaveText('Status unavailable');
 await card.evaluate(e=>{const c=e as Card,states={...c.hass.states};for(const [id,s] of Object.entries(states))if(id.includes('heat_battery'))states[id]={...s,state:'unavailable'};c.hass={...c.hass,states};});
 await expect(card.locator('.state-line')).toHaveText('Unavailable');
});

test('pump status opt-in handles defrost, offline, unknown status and unknown device selection',async({page})=>{
 await page.goto('/');const card=page.locator('quatt-heat-pump-card');
 await page.evaluate(()=>{window.demo.setConfig('heat-pump',{fields:{status:true}});window.demo.setScenario('defrost');});
 await expect(card.getByText('Defrost reported',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('offline'));await expect(card.getByText('Unavailable',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('heating'));
 await card.evaluate(e=>{const c=e as Card,states={...c.hass.states};for(const [id,s] of Object.entries(states))if(id.endsWith('heatpumps_0_status'))states[id]={...s,state:'unknown'};c.hass={...c.hass,states};});
 await expect(card.getByText('Status unavailable',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setConfig('heat-pump',{device:'missing-device'}));await expect(card.getByText(/No heat pump readings found/)).toBeVisible();
 await page.evaluate(()=>window.demo.setConfig('chill',{device:'missing-device'}));await expect(page.locator('quatt-chill-card').getByText(/No Chill units found/)).toBeVisible();
});

test('overview exposes optional charger and storage readings in both layouts',async({page})=>{
 await page.goto('/');const card=page.locator('quatt-overview-card');
 const fields=Object.fromEntries(cardFields['custom:quatt-overview-card'].map(f=>[f.key,true]));
 await page.evaluate(fields=>window.demo.setConfig('overview',{fields,heat_battery_layout:'minimal'}),fields);
 for(const label of ['Tank top','Tank middle','Tank bottom','Charger input','Water pressure','Hot-water use'])await expect(card.getByText(label,{exact:true})).toBeVisible();
 await card.evaluate(e=>{const c=e as Card,states={...c.hass.states};for(const [id,s] of Object.entries(states))if(id.includes('heat_battery'))states[id]={...s,state:'unavailable'};c.hass={...c.hass,states};});
 await expect(card.getByText('Unavailable',{exact:true})).toBeVisible();
 await page.evaluate(()=>{window.demo.setScenario('heating');window.demo.setConfig('overview',{heat_battery_layout:'detailed'});});
 await expect(card.getByText('Charger input',{exact:true})).toBeVisible();
});

test('circuit optional readings, missing devices and uncertain topology do not fabricate pipes or values',async({page})=>{
 await page.goto('/');const card=page.locator('quatt-heating-circuit-card');
 await page.evaluate(()=>window.demo.setConfig('heating-circuit',{fields:{'heatCharger.waterPressure':true,'heatBattery.middleTemperature':true,'heatBattery.showerMinutes':true}}));
 await expect(card.getByText('Heating pressure',{exact:true})).toBeVisible();await expect(card.getByText('Middle',{exact:true})).toBeVisible();await expect(card.getByText('Shower',{exact:true})).toBeVisible();
 await card.evaluate(e=>{const c=e as Card;const entities=Object.fromEntries(Object.entries(c.hass.entities!).filter(([,r])=>r.device_id!=='demo-heat-battery'));c.hass={...c.hass,connection:{},callWS:undefined,entities};});
 await expect(card.locator('.battery')).toHaveCount(0);await expect(card.locator('.thermal-line')).toHaveCount(0);await expect(card.getByText('Heat Charger',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('heating'));
 await card.evaluate(e=>{const c=e as Card;const entities=Object.fromEntries(Object.entries(c.hass.entities!).filter(([,r])=>r.device_id!=='demo-heat-charger'));c.hass={...c.hass,connection:{},callWS:undefined,entities};});
 await expect(card.locator('.charger')).toHaveCount(0);await expect(card.getByRole('meter')).toBeVisible();
 await card.evaluate(e=>{const c=e as Card;const entities=Object.fromEntries(Object.entries(c.hass.entities!).filter(([,r])=>r.device_id!=='demo-hp-1'));c.hass={...c.hass,connection:{},callWS:undefined,entities};});
 await expect(card.getByText(/Pump order unavailable/)).toBeVisible();await expect(card.locator('.pipes')).toHaveCount(0);await expect(card.locator('.delta')).toContainText('—');
});
