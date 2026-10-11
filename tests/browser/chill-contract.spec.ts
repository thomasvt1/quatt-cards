import {test,expect} from './fixtures';
import {chillStates,displayStatus} from '../fixtures/chill-states';
import type {HomeAssistant} from '../../src/types';
type Card=HTMLElement&{hass:HomeAssistant};

for(const row of chillStates){
 test(`Chill contract: ${row.status} renders correctly after live updates`,async({page})=>{
  await page.goto('/');await page.evaluate(()=>window.demo.setScenario('cooling'));
  const card=page.locator('quatt-chill-card'),control=card.getByRole('button',{name:'Control Living room',exact:true});
  for(const status of [row.status,displayStatus(row.status)]){
   for(const mode of ['Cooling','Heating']){
    // Update every card from one HA snapshot, as Home Assistant does.
    await page.evaluate(({status,mode})=>{
     const first=document.querySelector('quatt-chill-card') as Card,states={...first.hass.states};
     for(const [id,s] of Object.entries(states))if(id.includes('demo-chill-uuid-1')){
      if(id.endsWith('_status'))states[id]={...s,state:status};
      if(id.endsWith('_mode'))states[id]={...s,state:mode};
     }
     for(const tag of ['quatt-chill-card','quatt-status-card']){const card=document.querySelector(tag) as Card;card.hass={...card.hass,states};}
    },{status,mode});
    const tone=row.activity==='mode'||row.state==='maintaining'?mode.toLowerCase():row.activity;
    const icon=row.icon==='mode'?(mode==='Cooling'?'snow':'heat'):row.icon;
    await expect(control).toHaveClass(new RegExp(`${tone} ${row.state}`));
    await expect(control.locator(`.status-badge .icon-${icon}`)).toHaveCount(1);
    await expect(control.locator('.icon-question')).toHaveCount(0);
    await expect(control).toBeEnabled({enabled:row.state!=='offline'});
    await expect(control).toHaveAccessibleDescription(`Status: ${row.status==='OFFLINE'?'Unavailable':status} · Mode: ${mode}`);
    if(row.status.startsWith('WARNING_'))await expect(page.locator('quatt-status-card').getByText(status,{exact:true})).toBeVisible();
   }
  }
 });
}

test('warning indicator honors display options and decorative mode',async({page})=>{
 await page.goto('/');
 const card=page.locator('quatt-chill-card');
 await card.evaluate(e=>{const card=e as Card,states={...card.hass.states};for(const [id,s] of Object.entries(states))if(id.includes('demo-chill-uuid-1')){if(id.endsWith('_status'))states[id]={...s,state:'Warning not cooling heating system is heating'};if(id.startsWith('climate.'))states[id]={...s,state:'cool'};}card.hass={...card.hass,states};});
 const control=card.getByRole('button',{name:'Control Living room',exact:true});
 await expect(control).toHaveClass(/neutral warning/);
 await expect(control).toHaveCSS('margin-top','0px');
 expect(await control.evaluate(e=>getComputedStyle(e).color)).toBe(await card.getByRole('button',{name:'Control Bedroom',exact:true}).evaluate(e=>getComputedStyle(e).color));
 await expect(control.locator('.icon-warning')).toHaveCount(1);
 await page.evaluate(()=>window.demo.setConfig('chill',{fields:{mode:false}}));
 await expect(control.locator('.icon-warning')).toHaveCount(1);
 await page.evaluate(()=>window.demo.setConfig('chill',{fields:{status:false,mode:false}}));
 await expect(control.locator('.status-badge')).toHaveCount(0);
 // setConfig updates config only; the reported warning must survive all toggles.
 await page.evaluate(()=>window.demo.setConfig('chill',{show_controls:false,fields:{status:true,mode:true}}));
 const icon=card.getByRole('img',{name:/Living room: Status: Warning not cooling/});
 await expect(icon).toHaveClass(/neutral warning/);
 await expect(icon.locator('.icon-warning')).toHaveCount(1);
});


test('heating-system conflict follows power across live updates',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.demo.setScenario('cooling'));
 const card=page.locator('quatt-chill-card'),control=card.getByRole('button',{name:'Control Living room',exact:true});
 for(const power of ['off','cool','off']){
  await page.evaluate(power=>{
   const first=document.querySelector('quatt-chill-card') as Card,states={...first.hass.states};
   for(const [id,s] of Object.entries(states))if(id.includes('demo-chill-uuid-1')){
    if(id.endsWith('_status'))states[id]={...s,state:'Warning not cooling heating system is heating'};
    if(id.startsWith('climate.'))states[id]={...s,state:power};
    if(id.endsWith('_haswatertanklevelwarning'))states[id]={...s,state:'on'};
   }
   for(const tag of ['quatt-chill-card','quatt-status-card']){const card=document.querySelector(tag) as Card;card.hass={...card.hass,states};}
  },power);
  const off=power==='off';
  await expect(control).toHaveClass(new RegExp(`neutral ${off?'off':'warning'}`));
  await expect(control.locator('.icon-warning')).toHaveCount(off?0:1);
  await expect(control.locator('.icon-power')).toHaveCount(off?1:0);
  await expect(control).toBeEnabled();
  await expect(control).toHaveAccessibleDescription(`Status: ${off?'Off':'Warning not cooling heating system is heating'} · Mode: Cooling`);
  await expect(page.locator('quatt-status-card').getByText('Living room reports a warning',{exact:true})).toHaveCount(off?0:1);
  await expect(card.getByText('Water tank needs attention',{exact:true})).toBeVisible();
  await expect(page.locator('quatt-status-card').getByText('Living room water tank warning',{exact:true})).toBeVisible();
 }
});
