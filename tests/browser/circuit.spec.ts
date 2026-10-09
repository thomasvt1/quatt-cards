import { test, expect } from './fixtures';
import type { HomeAssistant } from '../../src/types';
test('circuit adapts to one pump, optional storage, offline readings and configurable fields',async({page})=>{
  await page.goto('/');const card=page.locator('quatt-heating-circuit-card');
  await expect(card.locator('.pump')).toHaveCount(2);
  await expect(card.getByText('Heat Charger',{exact:true})).toHaveCount(1);
  await expect(card.getByText('Heat transfer',{exact:true})).toHaveCount(0);
  await expect(card.locator('.delta')).toContainText('4.8 °C');
  await page.evaluate(()=>document.addEventListener('hass-more-info',event=>{document.body.dataset.entity=(event as CustomEvent).detail.entityId;}));
  const supply=card.getByRole('button',{name:/^Supply:/});await supply.focus();await supply.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-entity',/hp2_temperaturewaterout$/);
  await card.evaluate(e=>{const c=e as HTMLElement&{hass:HomeAssistant};const states={...c.hass.states};const id=Object.keys(states).find(id=>id.endsWith('hp2_temperaturewaterout'))!;states[id]={...states[id],state:'36.2'};c.hass={...c.hass,states};});
  await expect(supply).toContainText('36.2');await expect(supply).toBeFocused();await expect(card.locator('.delta')).toContainText('5.8');
  await page.evaluate(()=>window.demo.showEditor('heating-circuit'));const editor=page.locator('quatt-card-editor');
  await editor.getByText('Displayed fields',{exact:true}).click();
  await editor.getByRole('checkbox',{name:'Supply temperature',exact:true}).uncheck();
  await editor.getByRole('checkbox',{name:'Heat battery · charge',exact:true}).uncheck();
  await expect(card.locator('.supply-reading')).toHaveCount(0);await expect(card.getByRole('meter')).toHaveCount(0);
  await editor.getByRole('button',{name:'Reset displayed fields'}).click();
  await page.evaluate(()=>window.demo.setScenario('offline'));
  await expect(card.locator('.pump')).toHaveCount(2);await expect(card.locator('.delta')).toContainText('—');
  await page.evaluate(()=>window.demo.setScenario('single'));await expect(card.locator('.pump')).toHaveCount(1);
  await card.evaluate(e=>{const c=e as HTMLElement&{hass:HomeAssistant};const entities=Object.fromEntries(Object.entries(c.hass.entities!).filter(([,v])=>!['demo-heat-battery','demo-heat-charger'].includes(v.device_id||'')));c.hass={...c.hass,connection:{},callWS:undefined,entities};});
  await expect(card.locator('.storage')).toHaveCount(0);
});
for(const width of [1200,820,390])for(const theme of ['light','dark'] as const)test(`circuit ${width} ${theme} two and one pump`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.goto('/');await page.evaluate(theme=>window.demo.setTheme(theme),theme);
  const card=page.locator('quatt-heating-circuit-card');
  for(const scenario of ['heating','single']){
    await page.evaluate(s=>window.demo.setScenario(s),scenario);
    await expect(card.locator('.pump')).toHaveCount(scenario==='single'?1:2);
    const clipped=await card.locator('.diagram,.loop,.storage,.battery,.summary,.value,.unit-name').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className));expect(clipped).toEqual([]);
    if(width===390){const loop=(await card.locator('.loop').boundingBox())!,storage=(await card.locator('.storage').boundingBox())!,reading=(await card.locator('.return-reading').boundingBox())!;expect(storage.y).toBeGreaterThanOrEqual(loop.y+loop.height);expect(reading.y+reading.height).toBeLessThanOrEqual(storage.y);}
    await card.screenshot({path:`.impeccable/review/circuit-${scenario}-${width}-${theme}.png`});
  }
});
