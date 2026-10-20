import {test,expect} from './fixtures';
import type { HomeAssistant } from '../../src/types';

for (const theme of ['light','dark'] as const) test(`appearance applies to all cards and resets in ${theme}`,async({page})=>{
  await page.setViewportSize({width:390,height:900});await page.goto('/');
  await page.evaluate(theme=>{
    window.demo.setTheme(theme);
    for(const kind of ['overview','history','heat-pump','heat-battery','chill','status','heating-circuit'])window.demo.setConfig(kind,{appearance:{background:'#20303c',text_color:'#ffffff',secondary_text_color:'#b0bec5',border_color:'#405565',border_width:2,border_radius:20,padding:12,title_size:19,value_size:18,shadow:'0 2px 8px #0003'}});
  },theme);
  for(const kind of ['overview','history','heat-pump','heat-battery','chill','status','heating-circuit']){
    const card=page.locator(`quatt-${kind}-card`);
    await expect(card.locator('ha-card')).toHaveCSS('background-color','rgb(32, 48, 60)');
    await expect(card.locator('ha-card')).toHaveCSS('padding-left','12px');
    await expect(card.locator('ha-card')).toHaveCSS('border-radius','20px');
    await expect(card.locator('h2')).toHaveCSS('font-size','19px');
    await expect(card.locator('ha-card')).toHaveCSS('color','rgb(255, 255, 255)');
  }
  await page.evaluate(()=>window.demo.setConfig('chill',{layout:'slim',device:'demo-chill-1'}));
  const chill=page.locator('quatt-chill-card');
  await expect(chill.locator('.slim-current')).toHaveCSS('font-size','18px');
  await expect(chill.locator('ha-card')).toHaveCSS('padding-left','12px');
  await page.evaluate(()=>window.demo.setConfig('chill',{appearance:{background:'transparent',padding:0,border_width:0}}));
  await expect(chill.locator('ha-card')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(chill.locator('ha-card')).toHaveCSS('padding-left','0px');
  await page.evaluate(()=>window.demo.setConfig('chill',{appearance:undefined}));
  await expect(chill.locator('ha-card')).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(chill.locator('ha-card')).toHaveCSS('padding-left','14px');
});

test('primary color drives hover, pressed and focus; disabled and display-only stay inert',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{window.demo.setConfig('chill',{layout:'slim',device:'demo-chill-1'});document.querySelector('quatt-chill-card')!.setAttribute('style','--primary-color:rgb(200, 0, 100)');});
  const card=page.locator('quatt-chill-card'),row=card.locator('button.slim-row');
  await row.hover();await expect(row).toHaveCSS('background-color','color(srgb 0.784314 0 0.392157 / 0.08)');
  await page.mouse.down();await expect(row).toHaveCSS('background-color','color(srgb 0.784314 0 0.392157 / 0.16)');await page.mouse.up();
  await row.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  await expect(row).toHaveCSS('outline-color','rgb(200, 0, 100)');
  await page.evaluate(()=>window.demo.setConfig('chill',{appearance:{hover_color:'#123456',pressed_color:'#345678',focus_color:'#abcdef'}}));
  await row.hover();await expect(row).toHaveCSS('background-color','rgb(18, 52, 86)');
  await page.mouse.down();await expect(row).toHaveCSS('background-color','rgb(52, 86, 120)');await page.mouse.up();
  await page.evaluate(()=>window.demo.setConfig('chill',{show_controls:false}));
  await card.locator('.slim-row').hover();await expect(card.locator('.slim-row')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await page.evaluate(()=>window.demo.setConfig('chill',{show_controls:true}));
  await card.evaluate(element=>{
    const card=element as HTMLElement & {hass:HomeAssistant};
    const states={...card.hass.states};
    for(const [id,state] of Object.entries(states)) {
      if (!id.startsWith('climate.')) continue;
      states[id]={...state,state:'unavailable'};
    }
    card.hass={...card.hass,states};
  });
  await expect(card.locator('button.slim-row')).toBeDisabled();
  await card.locator('.slim-row').hover({force:true});await expect(card.locator('.slim-row')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
});

test('editor updates appearance without losing config, rejects invalid entries and resets',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{window.demo.setConfig('chill',{layout:'slim',device:'demo-chill-1',fields:{fanMode:false}});window.demo.showEditor('chill');});
  const editor=page.locator('quatt-card-editor');await editor.getByText('Appearance',{exact:true}).click();
  const background=editor.getByLabel('Background color',{exact:true});await background.fill('#20303c');await background.blur();
  await expect(page.locator('quatt-chill-card ha-card')).toHaveCSS('background-color','rgb(32, 48, 60)');
  await editor.getByLabel('Padding (px)',{exact:true}).fill('0');await editor.getByLabel('Padding (px)',{exact:true}).blur();
  await expect(page.locator('quatt-chill-card ha-card')).toHaveCSS('padding-left','0px');
  await background.fill('not-a-color');await background.blur();
  expect(await background.evaluate(e=>(e as HTMLInputElement).checkValidity())).toBe(false);
  await background.fill('var(--primary-color)');await background.blur();
  await editor.getByText('Advanced colors',{exact:true}).click();
  await editor.getByLabel('Cooling color',{exact:true}).fill('#ff00ff');await editor.getByLabel('Cooling color',{exact:true}).blur();
  await page.evaluate(()=>window.demo.setScenario('cooling'));
  await expect(page.locator('quatt-chill-card .unit-icon')).toHaveCSS('color','rgb(255, 0, 255)');
  await editor.getByRole('button',{name:'Reset appearance to theme'}).click();
  expect(await page.evaluate(()=>window.demo.getConfig('chill'))).toMatchObject({layout:'slim',device:'demo-chill-1',fields:{fanMode:false}});
  expect(await page.evaluate(()=>window.demo.getConfig('chill')?.appearance)).toBeUndefined();
});

test('invalid appearance config is rejected before changing card styling',async({page})=>{
 await page.goto('/');
 const errors=await page.evaluate(()=>{
   const card=document.querySelector('quatt-chill-card') as HTMLElement&{setConfig(c:unknown):void};
   return [null,[],{unknown:'red'},{padding:-1},{padding:NaN},{background:3},{background:'invalid'},{shadow:'red'}].map(appearance=>{
     try{card.setConfig({type:'custom:quatt-chill-card',appearance});return false;}catch{return true;}
   });
 });expect(errors.every(Boolean)).toBe(true);
});

test('transparent Chill background keeps its cooling symbol visible',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{window.demo.setScenario('cooling');window.demo.setConfig('chill',{layout:'slim',device:'demo-chill-1',appearance:{background:'transparent'}});});
 const symbol=page.locator('quatt-chill-card .status-badge svg');
 await expect(symbol).toBeVisible();
 await expect(symbol).not.toHaveCSS('color','rgba(0, 0, 0, 0)');
});

test('keyboard focus stays within a zero-padding Chill card',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.demo.setConfig('chill',{layout:'slim',device:'demo-chill-1',appearance:{padding:0}}));
 const row=page.getByRole('button',{name:'Control Living room',exact:true});
 await row.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 const outline=await row.evaluate(e=>{const style=getComputedStyle(e);return {style:style.outlineStyle,extent:parseFloat(style.outlineWidth)+parseFloat(style.outlineOffset)};});
 expect(outline.style).toBe('solid');expect(outline.extent).toBeLessThanOrEqual(0);
});

test('selected History range shows hover and pressed feedback',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.demo.setConfig('history',{appearance:{hover_color:'#123456',pressed_color:'#345678'}}));
 const selected=page.locator('quatt-history-card').getByRole('button',{pressed:true});
 await selected.hover();await expect(selected).toHaveCSS('background-color','rgb(18, 52, 86)');
 await page.mouse.down();await expect(selected).toHaveCSS('background-color','rgb(52, 86, 120)');await page.mouse.up();
});

test('Status equipment icons follow the custom foreground',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.demo.setConfig('status',{appearance:{background:'#20303c',text_color:'#ffffff'}}));
 await expect(page.locator('quatt-status-card .disc svg').first()).toHaveCSS('color','rgb(255, 255, 255)');
});
