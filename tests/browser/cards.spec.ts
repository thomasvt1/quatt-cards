import {test,expect,type Page} from './fixtures';
import type {CardConfig,HomeAssistant} from '../../src/types';
import type {DemoDiagnostics} from '../../src/demo/fixtures';
type Card=HTMLElement&{hass:HomeAssistant&{__demoDiagnostics:DemoDiagnostics};setConfig(c:CardConfig):void;getCardSize():number;getGridOptions():unknown};
const names=['overview','heat-pump','heat-battery','history','chill','status','heating-circuit'];
async function open(page:Page){await page.goto('/');await expect(page.locator('quatt-history-card').getByRole('slider')).toBeVisible();}

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
 await open(page);await page.evaluate(()=>window.demo.setScenario('offline'));await expect(page.locator('quatt-status-card').getByText('Heat pump 2 unavailable',{exact:true})).toBeVisible();await expect(page.locator('quatt-chill-card').getByRole('button',{name:'Control Bedroom',exact:true})).toHaveAccessibleDescription('Status: Unavailable · Mode: Cooling');
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
