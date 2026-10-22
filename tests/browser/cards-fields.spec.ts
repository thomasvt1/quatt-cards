import {test,expect,type Page} from './fixtures';
import type {CardConfig,HomeAssistant} from '../../src/types';
import type {DemoDiagnostics} from '../../src/demo/fixtures';
type Card=HTMLElement&{hass:HomeAssistant&{__demoDiagnostics:DemoDiagnostics};setConfig(c:CardConfig):void;getCardSize():number;getGridOptions():unknown};
const names=['overview','heat-pump','heat-battery','history','chill','status','heating-circuit'];
async function open(page:Page){await page.goto('/');await expect(page.locator('quatt-history-card').getByRole('slider')).toBeVisible();}

test('Chill ring combines reported status and mode without duplicate rows',async({page})=>{
 await open(page);const card=page.locator('quatt-chill-card'),control=card.getByRole('button',{name:'Control Living room',exact:true});
 await expect(control).toHaveClass(/neutral off/);
 await expect(control).toHaveAccessibleDescription('Status: Off · Mode: Cooling');
 await expect(card.locator('.fields .device-field')).toHaveCount(4);
 await expect(control.locator('.icon-badge')).toHaveCount(1);
 await expect(control.locator('.status-badge .icon-power')).toHaveCount(1);
 await card.evaluate(e=>{const c=e as Card;const states={...c.hass.states};for(const [id,s] of Object.entries(states))if(id.includes('demo-chill-uuid-1')){if(id.endsWith('_mode'))states[id]={...s,state:'Heating'};if(id.endsWith('_status'))states[id]={...s,state:'On'};}c.hass={...c.hass,states};});
 await expect(control).toHaveClass(/heating on/);
 await expect(control).toHaveAccessibleDescription('Status: On · Mode: Heating');
 await expect(control.locator('.status-badge .icon-heat')).toHaveCount(1);
 for(const theme of ['light','dark'] as const)for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>window.demo.setTheme(theme),theme);
  await card.screenshot({path:`.impeccable/review/chill-ring-${width}-${theme}.png`});
 }
 await page.evaluate(()=>window.demo.showEditor('chill'));const editor=page.locator('quatt-card-editor');
 await editor.getByText('Displayed fields',{exact:true}).click();
 await editor.getByRole('checkbox',{name:'Operating mode',exact:true}).uncheck();
 await expect(control.locator('.icon-tick')).toHaveCount(1);await expect(control).toHaveClass(/neutral/);
 await editor.getByRole('checkbox',{name:'Operating status',exact:true}).uncheck();
 await expect(card.locator('.status-badge')).toHaveCount(0);
 await editor.getByRole('button',{name:'Reset displayed fields',exact:true}).click();
 await expect(card.locator('.icon-badge')).toHaveCount(2);
 await page.evaluate(()=>window.demo.setConfig('chill',{show_controls:false}));
 await expect(card.getByRole('img',{name:/Living room: Status: On · Mode: Heating/})).toBeVisible();
});

test('Chill control icons are centered, touch-sized, and remain available when temperature is hidden',async({page})=>{
 await open(page);const card=page.locator('quatt-chill-card');
 for(const width of [1440,390])for(const layout of ['columns','stacked','compact'] as const){
  await page.setViewportSize({width,height:1000});await page.evaluate(layout=>window.demo.setConfig('chill',{layout}),layout);
  const icons=await card.locator('button.unit-icon').evaluateAll(es=>es.map(e=>{const a=e.getBoundingClientRect(),b=e.parentElement!.getBoundingClientRect();return {width:a.width,height:a.height,delta:Math.abs(a.x+a.width/2-b.x-b.width/2)};}));
  expect(icons).toHaveLength(2);for(const i of icons){expect(i.width).toBeGreaterThanOrEqual(44);expect(i.height).toBeGreaterThanOrEqual(44);expect(i.delta).toBeLessThan(1);}
  await expect(card.locator('.controls,.control-button')).toHaveCount(0);
 }
 await page.evaluate(()=>window.demo.setConfig('chill',{fields:{roomTemperature:false}}));
 await expect(card.locator('.temperature')).toHaveCount(0);await expect(card.getByRole('button',{name:'Control Living room',exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setConfig('chill',{show_controls:false}));
 await expect(card.locator('button.unit-icon')).toHaveCount(0);await expect(card.locator('span.unit-icon')).toHaveCount(2);
});

test('Overview minimal heat battery joins the reading grid and preserves field choices',async({page})=>{
 await open(page);await page.evaluate(()=>window.demo.showEditor('overview'));
 const card=page.locator('quatt-overview-card'),editor=page.locator('quatt-card-editor');
 await expect(card.locator('.battery')).toHaveCount(1);
 await editor.getByRole('combobox',{name:'Heat battery layout',exact:true}).selectOption('minimal');
 await expect(card.locator('.battery')).toHaveCount(0);await expect(card.getByRole('meter')).toHaveCount(0);
 await expect(card.locator('.stat-grid').getByRole('button',{name:/^Heat battery: 74/})).toBeVisible();
 await expect(card.locator('.stat-grid .device-field')).toHaveCount(7);
 await editor.getByText('Displayed fields',{exact:true}).click();
 await editor.getByRole('checkbox',{name:'Heat battery · status',exact:true}).uncheck();
 await editor.getByRole('checkbox',{name:'Heat battery · shower time',exact:true}).uncheck();
 await editor.getByRole('checkbox',{name:'Water flow',exact:true}).uncheck();
 await expect(card.locator('.stat-grid .device-field')).toHaveCount(4);
 await editor.getByRole('combobox',{name:'Heat battery layout',exact:true}).selectOption('detailed');
 await expect(card.getByRole('meter')).toHaveCount(1);await expect(card.getByRole('button',{name:/^Shower time:/})).toHaveCount(0);
 await editor.getByRole('combobox',{name:'Heat battery layout',exact:true}).selectOption('minimal');
 await expect(card.locator('.stat-grid .device-field')).toHaveCount(4);
 for(const width of [1440,820,390])for(const theme of ['light','dark'] as const){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>window.demo.setTheme(theme),theme);
  expect(await card.locator('ha-card').evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
  await card.screenshot({path:`.impeccable/review/minimal-overview-${width}-${theme}.png`});
 }
 await page.evaluate(()=>window.demo.setScenario('partial'));
 await expect(card.locator('.stat-grid .device-field').filter({hasText:'Heat battery'}).locator('.value')).toHaveText('—');
 await page.evaluate(()=>window.demo.setScenario('missing'));await expect(card.locator('.stat-grid .device-field')).toHaveCount(3);
});

test('Overview includes real heat-battery readings and preserves unavailable charge',async({page})=>{
 await open(page);const card=page.locator('quatt-overview-card');
 await expect(card.getByRole('region',{name:'Heat battery',exact:true})).toBeVisible();
 await expect(card.getByRole('meter',{name:'Heat battery charge',exact:true})).toHaveAttribute('aria-valuenow','74');
 await expect(card.getByRole('button',{name:/^Shower time: 43 min/})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('partial'));
 await expect(card.getByRole('meter')).toHaveCount(0);
 await expect(card.getByRole('button',{name:/^Shower time: 43 min/})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('missing'));
 await expect(card.getByRole('region',{name:'Heat battery',exact:true})).toHaveCount(0);
});

test('Displayed fields update every card and reset without changing unrelated configuration',async({page})=>{
 await open(page);
 const cases=[['overview','COP','[data-field="cop"]'],['heat-pump','Water in','.fields .device-field:has-text("Water in")'],['heat-battery','Top temperature','.temperatures .stat:has-text("Top")'],['chill','Fan speed','.fields .device-field:has-text("Fan speed")'],['history','COP','.legend button:has-text("COP")'],['status','Defrost','.row:has-text("No defrost reported")']];
 for(const [name,label,selector] of cases){
  await page.evaluate(name=>{window.demo.setConfig(name,{title:'Custom heading'});window.demo.showEditor(name);},name);
  const editor=page.locator('quatt-card-editor'),card=page.locator(`quatt-${name}-card`);
  await editor.getByText('Displayed fields',{exact:true}).click();
  await editor.getByRole('checkbox',{name:label,exact:true}).uncheck();
  await expect(card.locator(selector)).toHaveCount(0);
  await expect(card.getByRole('heading',{name:'Custom heading',exact:true})).toBeVisible();
  await editor.getByRole('button',{name:'Reset displayed fields',exact:true}).click();
  await expect(card.locator(selector).first()).toBeVisible();
  expect(await page.evaluate(name=>window.demo.getConfig(name)?.fields,name)).toBeUndefined();
 }
});

test('Overview and heat battery reflow selected fields without empty columns or hidden-value leaks',async({page})=>{
 await open(page);await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.demo.setConfig('overview',{fields:{cop:false,electricPower:false,'heatBattery.charge':false,'heatBattery.status':false,'heatBattery.showerMinutes':false,'heatBattery.topTemperature':true}}));
 const overview=page.locator('quatt-overview-card');
 await expect(overview.locator('.flow .node')).toHaveCount(1);await expect(overview.locator('.arrow')).toHaveCount(0);
 await expect(overview.getByRole('meter')).toHaveCount(0);await expect(overview.getByRole('button',{name:/^Top: 58.4/})).toBeVisible();
 await page.evaluate(()=>window.demo.setConfig('heat-battery',{fields:{charge:false,showerMinutes:false,topTemperature:false,bottomTemperature:false,heaterPower:false,waterPressure:false,charging:false,hotWater:false,boost:false}}));
 const battery=page.locator('quatt-heat-battery-card');await expect(battery.locator('.charge')).toHaveCount(0);await expect(battery.locator('.temperatures .stat')).toHaveCount(1);await expect(battery.locator('details')).toHaveCount(0);
 expect(await battery.locator('.temperatures .stat').evaluate(e=>Math.abs(e.getBoundingClientRect().width-e.parentElement!.getBoundingClientRect().width))).toBeLessThan(1);
 expect(await overview.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
});

test('History supports COP-only and mode-only selections without blank power panels',async({page})=>{
 await open(page);const card=page.locator('quatt-history-card');
 await page.evaluate(()=>window.demo.setConfig('history',{fields:{heatPower:false,electricPower:false,mode:false}}));
 await expect(card.locator('path.line')).toHaveCount(1);await expect(card.locator('.mode-strip')).toHaveCount(0);
 await expect(card.locator('.chart')).not.toContainText('kW');
 await page.evaluate(()=>window.demo.setConfig('history',{fields:{heatPower:false,electricPower:false,cop:false,mode:true}}));
 await expect(card.locator('.mode-strip')).toHaveCount(1);await expect(card.locator('path.line')).toHaveCount(0);
});

test('Chill controls open the correct native climate panel by mouse and keyboard without service calls',async({page})=>{
 await open(page);
 await page.evaluate(()=>document.addEventListener('hass-more-info',event=>{document.body.dataset.entity=(event as CustomEvent).detail.entityId;}));
 const card=page.locator('quatt-chill-card');
 await card.getByRole('button',{name:'Control Living room',exact:true}).click();
 await expect(page.locator('body')).toHaveAttribute('data-entity','climate.demo_demo-chill-uuid-1_chills');
 const bedroom=card.getByRole('button',{name:'Control Bedroom',exact:true});await bedroom.focus();await bedroom.press('Enter');
 await expect(page.locator('body')).toHaveAttribute('data-entity','climate.demo_demo-chill-uuid-2_chills');
 expect(await card.evaluate(e=>(e as Card).hass.__demoDiagnostics.services)).toEqual([]);
 await page.evaluate(()=>window.demo.showEditor('chill'));
 await page.locator('quatt-card-editor').getByLabel('Unit controls',{exact:true}).selectOption('false');
 await expect(card.getByRole('button',{name:/^Control /})).toHaveCount(0);
 expect(await page.evaluate(()=>window.demo.getConfig('chill')?.show_controls)).toBe(false);
 await page.locator('quatt-card-editor').getByLabel('Unit controls',{exact:true}).selectOption('true');
 await expect(card.getByRole('button',{name:/^Control /})).toHaveCount(2);
});

test('Chill controls disable for offline or missing climate state while retaining readings',async({page})=>{
 await open(page);await page.evaluate(()=>window.demo.setScenario('offline'));
 const card=page.locator('quatt-chill-card');
 await expect(card.getByRole('button',{name:'Control Bedroom',exact:true})).toBeDisabled();
 await expect(card.getByRole('button',{name:'Control Living room',exact:true})).toBeEnabled();
 await card.evaluate(e=>{const card=e as Card;const states={...card.hass.states};delete states['climate.demo_demo-chill-uuid-1_chills'];card.hass={...card.hass,states};});
 await expect(card.getByRole('button',{name:'Control Living room',exact:true})).toBeDisabled();
 await expect(card.getByRole('heading',{name:'Living room',exact:true})).toBeVisible();
});
