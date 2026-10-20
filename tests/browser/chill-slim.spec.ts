import {test,expect} from './fixtures';
import type {HomeAssistant} from '../../src/types';

test('slim room selection, controls, hidden fields and unavailable states',async({page})=>{
 await page.goto('/');const card=page.locator('quatt-chill-card');
 await page.evaluate(()=>{window.demo.showEditor('chill');window.demo.setScenario('cooling');});
 const editor=page.locator('quatt-card-editor');
 await editor.getByLabel('Layout',{exact:true}).selectOption('slim');
 await expect(card.getByText(/Select one Chill device/)).toBeVisible();
 await editor.getByLabel('Chill device',{exact:true}).selectOption('demo-chill-1');
 const row=card.getByRole('button',{name:'Control Living room',exact:true});
 await expect(row).toBeEnabled();await expect(card.locator('.slim-current')).toHaveText('24.2 °C');
 await page.evaluate(()=>document.addEventListener('hass-more-info',e=>{document.body.dataset.entity=(e as CustomEvent).detail.entityId;}));
 await row.focus();await row.press('Enter');await expect(page.locator('body')).toHaveAttribute('data-entity',/^climate\./);
 await page.evaluate(()=>window.demo.setConfig('chill',{fields:{roomTemperature:false,targetTemperature:false,fanMode:false,status:false,mode:false}}));
 await expect(card.locator('.slim-current,.slim-target,.slim-details,.status-badge')).toHaveCount(0);
 await expect(row).toBeEnabled();
 await page.evaluate(()=>window.demo.setConfig('chill',{show_controls:false}));await expect(card.locator('button')).toHaveCount(0);
 await page.evaluate(()=>window.demo.setConfig('chill',{show_controls:true,fields:{status:true,mode:true,waterWarning:true}}));
 await card.evaluate(e=>{const c=e as HTMLElement&{hass:HomeAssistant};const states={...c.hass.states};for(const [id,s] of Object.entries(states))if(id.startsWith('climate.'))states[id]={...s,state:'unavailable'};c.hass={...c.hass,states};});
 await expect(row).toBeDisabled();
 await page.evaluate(()=>window.demo.setConfig('chill',{device:'missing'}));await expect(card.getByText(/No Chill units found/)).toBeVisible();
});
for(const width of [320,390,1200])for(const theme of ['light','dark'] as const)test(`slim Chill fits ${width} ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');
 await page.evaluate(theme=>{window.demo.setScenario('cooling');window.demo.setTheme(theme);window.demo.setConfig('chill',{layout:'slim',device:'demo-chill-1'});},theme);
 const card=page.locator('quatt-chill-card');await expect(card.locator('.slim-row')).toBeVisible();
 const bounds=(await card.boundingBox())!;expect(bounds.height).toBeLessThanOrEqual(100);
 expect(await card.locator('ha-card,.slim-row').evaluateAll(es=>es.some(e=>e.scrollWidth>e.clientWidth+1))).toBe(false);
 await page.evaluate(()=>window.demo.setConfig('chill',{title:'A very long room name in the upstairs bedroom'}));
 expect(await card.locator('ha-card,.slim-row').evaluateAll(es=>es.some(e=>e.scrollWidth>e.clientWidth+1))).toBe(false);
});
