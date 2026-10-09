import {test,expect,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import type {CardConfig,HomeAssistant} from '../../src/types';
import type {DemoDiagnostics} from '../../src/demo/fixtures';
type Card=HTMLElement&{hass:HomeAssistant&{__demoDiagnostics:DemoDiagnostics};setConfig(c:CardConfig):void;getCardSize():number;getGridOptions():unknown};
const names=['overview','heat-pump','heat-battery','history','chill','status'];
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
async function open(page:Page){await page.goto('/');await expect(page.locator('quatt-history-card').getByRole('slider')).toBeVisible();}

for(const viewport of [{name:'desktop',width:1440,height:1050},{name:'tablet',width:820,height:1100},{name:'phone',width:390,height:844}])for(const theme of ['light','dark'] as const){
 test(`${viewport.name} ${theme}: six cards and editors fit`,async({page})=>{
  await page.setViewportSize(viewport);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await open(page);
  await page.evaluate(theme=>window.demo.setTheme(theme),theme);
  for(const name of names)await expect(page.locator(`quatt-${name}-card`).getByRole('heading',{level:2})).toBeVisible();
  await expect(page.locator('quatt-status-card').getByText('2 heat pumps connected',{exact:true})).toBeVisible();
  await expect(page.locator('quatt-heat-battery-card').getByRole('meter')).toHaveAttribute('aria-valuenow','74');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const clipped=await page.evaluate(()=>[...document.querySelector('.card-grid')!.children].flatMap(card=>[...card.shadowRoot!.querySelectorAll<HTMLElement>('ha-card,.value,.fields,.stat-grid,.units,.rooms')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>card.tagName+':'+e.className)));
  expect(clipped).toEqual([]);
  await mkdir('.impeccable/review',{recursive:true});await page.screenshot({path:`.impeccable/review/${viewport.name}-${theme}.png`,fullPage:true});
  for(const name of names){await page.evaluate(name=>window.demo.showEditor(name),name);const editor=page.locator('quatt-card-editor');await expect(editor.getByLabel('Title',{exact:true})).toBeVisible();await editor.getByText('Displayed fields',{exact:true}).click();await editor.getByText('Entity overrides',{exact:true}).click();expect(await editor.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);}
  expect(errors).toEqual([]);
 });
}
test('history keyboard inspection survives live updates without duplicate reads',async({page})=>{
 await open(page);const card=page.locator('quatt-history-card'),chart=card.getByRole('slider');
 await chart.focus();await chart.press('Home');await expect(chart).toHaveAttribute('aria-valuenow','0');await chart.press('ArrowRight');await expect(chart).toHaveAttribute('aria-valuenow','15');
 const before=await chart.getAttribute('aria-valuetext');
 const reads=await card.evaluate(e=>(e as Card).hass.__demoDiagnostics.requests.filter(r=>r.startsWith('GET')).length);
 await card.evaluate(e=>{const card=e as Card;const id=Object.keys(card.hass.states).find(id=>id.endsWith('_computedpower'))!;card.hass={...card.hass,states:{...card.hass.states,[id]:{...card.hass.states[id],state:'6400'}}};});
 await expect(chart).toHaveAttribute('aria-valuetext',before!);
 expect(await card.evaluate(e=>(e as Card).hass.__demoDiagnostics.requests.filter(r=>r.startsWith('GET')).length)).toBe(reads);
 await chart.press('End');await expect(chart).toHaveAttribute('aria-valuenow','1440');await chart.press('Escape');await expect(card.locator('.inspector')).toHaveCount(0);
 await card.getByRole('button',{name:'6h',exact:true}).click();await expect(chart).toHaveAttribute('aria-valuemax','360');
});
test('history has one thin mode strip and preserves unavailable gaps',async({page})=>{
 await open(page);const card=page.locator('quatt-history-card');await expect(card.locator('.mode-track')).toHaveAttribute('height','10');
 await expect(card.locator('.mode-strip')).toHaveCount(1);const count=await card.locator('.mode-segment').count();expect(count).toBeGreaterThan(1);expect(count).toBeLessThan(10);
 const paths=await card.locator('path.line').evaluateAll(paths=>paths.map(p=>p.getAttribute('d')||''));expect(paths).toHaveLength(3);for(const path of paths)expect(path.match(/M/g)!.length).toBeGreaterThan(1);
 await card.getByRole('slider').focus();await card.getByRole('slider').press('Home');await expect(card.locator('.inspector')).toContainText('Standby');
});
test('touch can inspect recorded measurements',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('http://127.0.0.1:4174/');
 const chart=page.locator('quatt-history-card').getByRole('slider');await expect(chart).toBeVisible();await chart.scrollIntoViewIfNeeded();const b=(await chart.boundingBox())!;await page.touchscreen.tap(b.x+b.width*.55,b.y+50);await expect(page.locator('quatt-history-card').locator('.inspector')).toBeVisible();expect(Number(await chart.getAttribute('aria-valuenow'))).toBeGreaterThan(300);await context.close();
});
test('C wraps after three devices, with working A and B layout options',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page);await page.evaluate(()=>window.demo.setScenario('many'));const card=page.locator('quatt-chill-card');await expect(card.locator('article')).toHaveCount(5);
 const rects=await card.locator('article').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));expect(rects[0].y).toBe(rects[2].y);expect(rects[3].y).toBeGreaterThan(rects[0].y);expect(rects[3].x).toBe(rects[0].x);
 await page.evaluate(()=>window.demo.showEditor('chill'));const editor=page.locator('quatt-card-editor');await editor.getByLabel('Layout',{exact:true}).selectOption('stacked');await expect(card.locator('.rooms')).toHaveClass(/stacked/);
 await editor.getByLabel('Layout',{exact:true}).selectOption('compact');await expect(card.locator('.rooms')).toHaveClass(/compact/);expect(await card.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
 await editor.getByLabel('Chill device',{exact:true}).selectOption('demo-chill-2');await expect(card.locator('article')).toHaveCount(1);await expect(card.getByRole('heading',{name:'Bedroom',exact:true})).toBeVisible();
});
test('editors emit config changes for titles, devices, periods and overrides',async({page})=>{
 await open(page);await page.evaluate(()=>window.demo.showEditor('heat-pump'));let editor=page.locator('quatt-card-editor');
 await editor.getByLabel('Title',{exact:true}).fill('My heat pumps');await editor.getByLabel('Title',{exact:true}).press('Tab');await expect(page.locator('quatt-heat-pump-card').getByRole('heading',{name:'My heat pumps'})).toBeVisible();
 await editor.getByLabel('Heat pump device',{exact:true}).selectOption('demo-hp-2');await expect(page.locator('quatt-heat-pump-card').locator('article')).toHaveCount(1);
 await page.evaluate(()=>window.demo.showEditor('history'));editor=page.locator('quatt-card-editor');await editor.getByLabel('History range',{exact:true}).selectOption('48');await expect(page.locator('quatt-history-card').getByRole('button',{name:'48h'})).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>window.demo.showEditor('overview'));editor=page.locator('quatt-card-editor');await editor.getByText('Entity overrides',{exact:true}).click();await editor.getByLabel('Electrical input',{exact:true}).fill('sensor.override');await editor.getByLabel('Electrical input',{exact:true}).press('Tab');
 expect(await page.evaluate(()=>window.demo.getConfig('overview')?.entities?.electricPower)).toBe('sensor.override');await editor.getByLabel('Electrical input',{exact:true}).fill('');await editor.getByLabel('Electrical input',{exact:true}).press('Tab');expect(await page.evaluate(()=>window.demo.getConfig('overview')?.entities?.electricPower)).toBeUndefined();
});
test('offline, partial, standby, defrost and cooling states remain truthful',async({page})=>{
 await open(page);await page.evaluate(()=>window.demo.setScenario('offline'));await expect(page.locator('quatt-status-card').getByText('Heat pump 2 unavailable',{exact:true})).toBeVisible();await expect(page.locator('quatt-chill-card').getByText('Offline',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('partial'));await expect(page.locator('quatt-heat-battery-card').getByRole('meter')).toHaveCount(0);await expect(page.locator('quatt-heat-battery-card').getByText('43 min',{exact:true})).toBeVisible();await expect(page.locator('quatt-status-card').getByText('Bedroom water tank warning',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('idle'));await expect(page.locator('quatt-overview-card').getByText('Standby',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('defrost'));await expect(page.locator('quatt-status-card').getByText('Heat pump 1 is defrosting',{exact:true})).toBeVisible();await expect(page.locator('quatt-heat-pump-card').getByText('-1.5 kW',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('cooling'));await expect(page.locator('quatt-overview-card').getByText('Chill cooling',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.demo.setScenario('missing'));await expect(page.locator('quatt-history-card').getByText('History unavailable',{exact:true})).toBeVisible();await expect(page.locator('quatt-overview-card').getByText('No supported Quatt entities found.',{exact:true})).toBeVisible();
});
test('sensor detail events are read-only; cards share discovery and release subscriptions',async({page})=>{
 await open(page);await page.evaluate(()=>document.addEventListener('hass-more-info',event=>{document.body.dataset.entity=(event as CustomEvent).detail.entityId;}));await page.locator('quatt-overview-card').getByRole('button',{name:/^Electric input:.*Show details/}).click();await expect(page.locator('body')).toHaveAttribute('data-entity',/computedpowerinput$/);
 await page.evaluate(()=>window.demo.showEditor('overview'));const diagnostics=await page.locator('quatt-overview-card').evaluate(e=>(e as Card).hass.__demoDiagnostics);expect(diagnostics.services).toEqual([]);expect(diagnostics.requests.filter(r=>r==='config/entity_registry/list')).toHaveLength(1);expect(diagnostics.requests.filter(r=>r==='config/device_registry/list')).toHaveLength(1);expect(diagnostics.activeSubscriptions).toBe(2);
 const remaining=await page.evaluate(async()=>{const d=(document.querySelector('quatt-overview-card') as Card).hass.__demoDiagnostics;document.querySelector('.card-grid')!.replaceChildren();document.querySelector('#editor-mount')!.replaceChildren();await new Promise(resolve=>setTimeout(resolve,0));return d.activeSubscriptions;});expect(remaining).toBe(0);
});
test('picker metadata, editors and layout sizing work before HA assigns state',async({page})=>{
 await open(page);const results=await page.evaluate(names=>names.map(name=>{const tag=`quatt-${name}-card`,ctor=customElements.get(tag) as CustomElementConstructor&{getStubConfig():CardConfig;getConfigElement():HTMLElement};const element=document.createElement(tag) as Card;return {type:ctor.getStubConfig().type,editor:ctor.getConfigElement().tagName,size:element.getCardSize(),grid:element.getGridOptions()};}),names);for(const [i,r] of results.entries()){expect(r.type).toBe(`custom:quatt-${names[i]}-card`);expect(r.editor).toBe('QUATT-CARD-EDITOR');expect(r.size).toBeGreaterThan(0);expect(r.grid).toMatchObject({columns:12,rows:'auto'});}
});

for(const viewport of [{name:'desktop',width:1440,height:1050},{name:'tablet',width:820,height:1100},{name:'phone',width:390,height:844}])for(const theme of ['light','dark'] as const){
 test(`${viewport.name} ${theme}: single units fill both sides and readings align`,async({page})=>{
  await page.setViewportSize(viewport);await open(page);
  await page.evaluate(theme=>{window.demo.setTheme(theme);window.demo.setScenario('single');},theme);
  for(const name of ['heat-pump','chill']){
   const card=page.locator(`quatt-${name}-card`);await expect(card.locator('article')).toHaveCount(1);
   const fields=await card.locator('.fields>.device-field').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};}));
   expect(Math.abs(fields[0].y-fields[1].y)).toBeLessThan(1);
   expect(fields[1].x).toBeGreaterThan(fields[0].x+fields[0].width);
   expect(Math.abs(fields[0].width-fields[1].width)).toBeLessThan(1);
  }
  const centers=await page.locator('quatt-heat-battery-card').locator('.temperatures .stat').evaluateAll(elements=>elements.flatMap(e=>{const r=e.getBoundingClientRect();return [...e.children].map(child=>{const c=child.getBoundingClientRect();return Math.abs(c.x+c.width/2-r.x-r.width/2);});}));
  for(const delta of centers)expect(delta).toBeLessThan(1);
  const statusAlignment=await page.locator('quatt-status-card').locator('.row').evaluateAll(elements=>elements.map(e=>{const [icon,text]=[...e.children].map(c=>c.getBoundingClientRect());return Math.abs(icon.y+icon.height/2-text.y-text.height/2);}));
  for(const delta of statusAlignment)expect(delta).toBeLessThan(1);
  await page.screenshot({path:`.impeccable/review/single-${viewport.name}-${theme}.png`,fullPage:true});
  // Selecting one unit from a larger installation must use the same layout.
  await page.evaluate(()=>{window.demo.setScenario('heating');window.demo.setConfig('heat-pump',{device:'demo-hp-1'});window.demo.setConfig('chill',{device:'demo-chill-1'});});
  for(const layout of ['columns','stacked','compact'] as const){
   await page.evaluate(layout=>{window.demo.setConfig('heat-pump',{layout});window.demo.setConfig('chill',{layout});},layout);
   for(const name of ['heat-pump','chill']){
    const card=page.locator(`quatt-${name}-card`);await expect(card.locator('article')).toHaveCount(1);
    expect(await card.locator('.fields').evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
    expect(await card.locator('article').evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
   }
  }
 });
}
