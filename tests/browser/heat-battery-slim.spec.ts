import {test,expect} from './fixtures';

test('Heat Battery slim layout is selectable and keeps native sensor details',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.demo.showEditor('heat-battery'));
 const editor=page.locator('quatt-card-editor'),card=page.locator('quatt-heat-battery-card');
 await editor.getByLabel('Layout',{exact:true}).selectOption('slim');
 await expect(card.getByRole('heading',{name:'Heat battery',exact:true})).toBeVisible();
 await expect(card.getByRole('meter',{name:'Thermal charge'})).toHaveAttribute('aria-valuenow','74');
 await expect(card.getByText('shower time',{exact:false})).toBeVisible();
 await expect(card.getByText('Top',{exact:true})).toHaveCount(0);
 await expect(card.getByText('Storage details',{exact:true})).toHaveCount(0);
 expect((await card.boundingBox())!.height).toBeLessThanOrEqual(112);
 await page.evaluate(()=>{document.addEventListener('hass-more-info',event=>{document.body.dataset.entity=(event as CustomEvent).detail.entityId;});});
 const charge=card.getByRole('button',{name:/Thermal charge: 74/});await charge.focus();await charge.press('Enter');
 await expect(page.locator('body')).toHaveAttribute('data-entity',/^sensor\./);
 await editor.getByLabel('Layout',{exact:true}).selectOption('columns');
 await expect(card.getByText('Top',{exact:true})).toBeVisible();
});

test('offline slim battery does not display stale charge or shower readings',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.demo.setConfig('heat-battery',{layout:'slim'}));
 const card=page.locator('quatt-heat-battery-card');
 await card.evaluate(element=>{
  const card=element as HTMLElement & {hass:import('../../src/types').HomeAssistant};
  const id='sensor.demo_heat_battery_alleStatus_heatbatterystatus'.toLowerCase();
  card.hass={...card.hass,states:{...card.hass.states,[id]:{...card.hass.states[id],state:'offline'}}};
 });
 await expect(card.getByRole('meter')).toHaveCount(0);
 await expect(card.getByText('74 %',{exact:true})).toHaveCount(0);
 await expect(card.getByText('Unavailable',{exact:true})).toBeVisible();
});

test('slim editor shows relevant fields and preserves detailed field choices',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{window.demo.setConfig('heat-battery',{layout:'slim',fields:{topTemperature:false}});window.demo.showEditor('heat-battery');});
 const editor=page.locator('quatt-card-editor'),card=page.locator('quatt-heat-battery-card');
 await editor.getByText('Displayed fields',{exact:true}).click();
 await expect(editor.getByRole('checkbox',{name:'Top temperature',exact:true})).toHaveCount(0);
 for(const name of ['Thermal charge','Shower time','Operating status'])await editor.getByRole('checkbox',{name,exact:true}).uncheck();
 await expect(card.getByText(/No fields selected/)).toBeVisible();
 await expect(card.getByRole('meter')).toHaveCount(0);
 await expect(card.getByRole('button')).toHaveCount(0);
 await editor.getByLabel('Layout',{exact:true}).selectOption('columns');
 await expect(editor.getByRole('checkbox',{name:'Top temperature',exact:true})).not.toBeChecked();
});

test('missing battery retains the slim empty layout',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{window.demo.setConfig('heat-battery',{layout:'slim'});window.demo.setScenario('missing');});
 const card=page.locator('quatt-heat-battery-card');
 await expect(card.getByText(/No heat battery found/)).toBeVisible();
 expect((await card.boundingBox())!.height).toBeLessThan(200);
});

for(const width of [320,390,1440])for(const theme of ['light','dark'] as const)test(`slim battery fits ${width} ${theme} with appearance overrides`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');
 await page.evaluate(theme=>{window.demo.setTheme(theme);window.demo.setConfig('heat-battery',{layout:'slim'});},theme);
 const card=page.locator('quatt-heat-battery-card');await expect(card.getByRole('meter')).toBeVisible();
 expect((await card.boundingBox())!.height).toBeLessThanOrEqual(112);
 expect(await card.locator('ha-card').evaluate(e=>e.scrollWidth>e.clientWidth+1)).toBe(false);
 await page.evaluate(()=>window.demo.setConfig('heat-battery',{title:'A very long Heat Battery title for upstairs',appearance:{background:'#20303c',text_color:'#ffffff',secondary_text_color:'#b0bec5',padding:12,border_radius:16,value_size:22}}));
 await expect(card.locator('ha-card')).toHaveCSS('background-color','rgb(32, 48, 60)');
 expect(await card.locator('ha-card').evaluate(e=>e.scrollWidth>e.clientWidth+1)).toBe(false);
});

test('slim battery shows green/grey status and distinguishes missing charge from zero',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.demo.setConfig('heat-battery',{layout:'slim'}));
 const card=page.locator('quatt-heat-battery-card');
 const setState=async(status:string,charge:string)=>card.evaluate((element,{status,charge})=>{
  const card=element as HTMLElement & {hass:import('../../src/types').HomeAssistant};
  const states={...card.hass.states};
  for(const [id,reading] of Object.entries(states)){
   if(id.endsWith('_heatbatterystatus'))states[id]={...reading,state:status};
   if(id.endsWith('_heatbatterypercentage'))states[id]={...reading,state:charge};
  }
  card.hass={...card.hass,states};
 },{status,charge});
 await setState('Charging','0');
 await expect(card.getByRole('button',{name:/Heat battery status: Charging/})).toBeVisible();
 await expect(card.locator('.status-dot')).toHaveCSS('background-color','rgb(67, 160, 71)');
 await expect(card.getByRole('meter')).toHaveAttribute('aria-valuenow','0');
 await setState('Off','unavailable');
 await expect(card.locator('.status-dot')).toHaveCSS('background-color','rgb(158, 158, 158)');
 await expect(card.getByRole('meter')).toHaveCount(0);
 await expect(card.getByText('43 min',{exact:true})).toBeVisible();
 await expect(card.getByText('—',{exact:true})).toBeVisible();
});

test('resetting slim fields preserves hidden Detailed preferences',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{window.demo.setConfig('heat-battery',{layout:'slim',fields:{topTemperature:false,charge:false}});window.demo.showEditor('heat-battery');});
 const editor=page.locator('quatt-card-editor');await editor.getByText('Displayed fields',{exact:true}).click();
 await editor.getByRole('button',{name:'Reset displayed fields'}).click();
 await expect(page.locator('quatt-heat-battery-card').getByRole('meter')).toBeVisible();
 await editor.getByLabel('Layout',{exact:true}).selectOption('columns');
 await expect(editor.getByRole('checkbox',{name:'Top temperature',exact:true})).not.toBeChecked();
});

test('offline slim battery respects hidden reading fields',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.demo.setConfig('heat-battery',{layout:'slim',fields:{charge:false,showerMinutes:false,status:false}}));
 const card=page.locator('quatt-heat-battery-card');
 await card.evaluate(element=>{
  const card=element as HTMLElement & {hass:import('../../src/types').HomeAssistant};
  const id='sensor.demo_heat_battery_allestatus_heatbatterystatus';
  card.hass={...card.hass,states:{...card.hass.states,[id]:{...card.hass.states[id],state:'offline'}}};
 });
 await expect(card.getByText(/No fields selected/)).toBeVisible();
 await expect(card.getByText('Unavailable',{exact:true})).toHaveCount(0);
});
