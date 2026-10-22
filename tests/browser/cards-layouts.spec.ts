import {test,expect,type Page} from './fixtures';
import type {CardConfig,HomeAssistant} from '../../src/types';
import type {DemoDiagnostics} from '../../src/demo/fixtures';
type Card=HTMLElement&{hass:HomeAssistant&{__demoDiagnostics:DemoDiagnostics};setConfig(c:CardConfig):void;getCardSize():number;getGridOptions():unknown};
const names=['overview','heat-pump','heat-battery','history','chill','status','heating-circuit'];
async function open(page:Page){await page.goto('/');await expect(page.locator('quatt-history-card').getByRole('slider')).toBeVisible();}

for(const viewport of [{name:'desktop',width:1440,height:1050},{name:'tablet',width:820,height:1100},{name:'phone',width:390,height:844}])for(const theme of ['light','dark'] as const){
 test(`${viewport.name} ${theme}: seven cards and editors fit`,async({page})=>{
  await page.setViewportSize(viewport);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await open(page);
  await page.evaluate(theme=>window.demo.setTheme(theme),theme);
  for(const name of names)await expect(page.locator(`quatt-${name}-card`).getByRole('heading',{level:2})).toBeVisible();
  await expect(page.locator('quatt-status-card').getByText('2 heat pumps connected',{exact:true})).toBeVisible();
  await expect(page.locator('quatt-heat-battery-card').getByRole('meter')).toHaveAttribute('aria-valuenow','74');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const clipped=await page.evaluate(()=>[...document.querySelector('.card-grid')!.children].flatMap(card=>[...card.shadowRoot!.querySelectorAll<HTMLElement>('ha-card,.value,.fields,.stat-grid,.units,.rooms')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>card.tagName+':'+e.className)));
  expect(clipped).toEqual([]);
  await page.screenshot({path:`.impeccable/review/${viewport.name}-${theme}.png`,fullPage:true});
  for(const name of names){await page.evaluate(name=>window.demo.showEditor(name),name);const editor=page.locator('quatt-card-editor');await expect(editor.getByLabel('Title',{exact:true})).toBeVisible();await editor.getByText('Displayed fields',{exact:true}).click();await editor.getByText('Entity overrides',{exact:true}).click();expect(await editor.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);}
  expect(errors).toEqual([]);
 });
}

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
