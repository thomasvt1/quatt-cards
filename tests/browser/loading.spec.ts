import {test,expect} from './fixtures';

test('all Quatt cards show a skeleton until initial registry discovery finishes',async({page})=>{
 await page.goto('/');
 await page.evaluate(async()=>{
  const path='/src/demo/fixtures.ts';
  const {createDemo}=await import(/* @vite-ignore */ path) as typeof import('../../src/demo/fixtures');
  const {hass}=createDemo();
  let finish!:()=>void;const pending=new Promise<void>(resolve=>{finish=resolve;});
  const delayed={...hass,connection:{},callWS:async(message:Record<string,unknown>)=>{await pending;return hass.callWS!(message);}};
  const host=document.createElement('section');host.id='loading-cards';document.body.append(host);
  for(const name of ['overview','heat-pump','heat-battery','history','chill','status','heating-circuit']){
   const card=document.createElement(`quatt-${name}-card`) as HTMLElement&{setConfig(config:unknown):void;hass:unknown};
   card.setConfig({type:`custom:quatt-${name}-card`});card.hass=delayed;host.append(card);
  }
  (window as any).finishDiscovery=finish;
 });
 const cards=page.locator('#loading-cards');
 await expect(cards.getByRole('status',{name:'Loading Quatt data'})).toHaveCount(7);
 await expect(cards.getByText(/No supported Quatt entities found|No heat battery found/)).toHaveCount(0);
 await expect(cards.getByRole('button')).toHaveCount(0);
 await page.evaluate(()=>(window as any).finishDiscovery());
 await expect(cards.getByRole('status',{name:'Loading Quatt data'})).toHaveCount(0);
 await expect(cards.locator('quatt-heat-battery-card').getByRole('meter')).toHaveAttribute('aria-valuenow','74');
});

test('configured cards show a skeleton before Home Assistant is assigned',async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{
  const card=document.createElement('quatt-heat-battery-card') as HTMLElement&{setConfig(config:unknown):void};
  card.id='before-hass';card.setConfig({type:'custom:quatt-heat-battery-card',layout:'slim'});document.body.append(card);
 });
 await expect(page.locator('#before-hass').getByRole('status',{name:'Loading Quatt data'})).toBeVisible();
});

for(const result of ['empty','failed'])test(`finished ${result} discovery shows a real notice`,async({page})=>{
 await page.goto('/');
 await page.evaluate(result=>{
  const card=document.createElement('quatt-heat-battery-card') as HTMLElement&{setConfig(config:unknown):void;hass:unknown};
  card.id='finished-discovery';card.setConfig({type:'custom:quatt-heat-battery-card'});
  card.hass={states:{},connection:{},callWS:async()=>{if(result==='failed')throw new Error('Disconnected');return [];}};document.body.append(card);
 },result);
 const card=page.locator('#finished-discovery');
 await expect(card.getByText(result==='empty'?'No supported Quatt entities found.':'Could not read the entity registry. Reload the dashboard to retry.')).toBeVisible();
 await expect(card.getByRole('status',{name:'Loading Quatt data'})).toHaveCount(0);
});

for(const timing of ['before','after'])test(`new connection stays loading when old discovery fails ${timing} switching`,async({page})=>{
 await page.goto('/');
 await page.evaluate(()=>{
  const card=document.createElement('quatt-heat-battery-card') as HTMLElement&{setConfig(config:unknown):void;hass:unknown};
  card.id='reconnect';card.setConfig({type:'custom:quatt-heat-battery-card'});
  let fail!:()=>void;const pending=new Promise<never>((_,reject)=>{fail=()=>reject(new Error('Old connection failed'));});
  card.hass={states:{},connection:{},callWS:()=>pending};document.body.append(card);
  (window as any).failOld=fail;
  (window as any).switchConnection=()=>{card.hass={states:{},connection:{},callWS:()=>new Promise(()=>{})};};
 });
 const card=page.locator('#reconnect');
 await expect(card.getByRole('status',{name:'Loading Quatt data'})).toBeVisible();
 if(timing==='before'){
  await page.evaluate(()=>(window as any).failOld());
  await expect(card.getByText('Could not read the entity registry. Reload the dashboard to retry.')).toBeVisible();
 }
 await page.evaluate(()=>(window as any).switchConnection());
 if(timing==='after')await page.evaluate(()=>(window as any).failOld());
 await expect(card.getByRole('status',{name:'Loading Quatt data'})).toBeVisible();
 await expect(card.getByText(/Could not read|No supported/)).toHaveCount(0);
});

test('background discovery keeps loaded readings visible',async({page})=>{
 await page.goto('/');
 await page.evaluate(async()=>{
  const path='/src/demo/fixtures.ts';
  const {createDemo}=await import(/* @vite-ignore */ path) as typeof import('../../src/demo/fixtures');
  const {hass}=createDemo();let refresh=false;const listeners:Record<string,()=>void>={};
  const card=document.createElement('quatt-heat-battery-card') as HTMLElement&{setConfig(config:unknown):void;hass:unknown};
  card.id='refresh';card.setConfig({type:'custom:quatt-heat-battery-card'});
  card.hass={...hass,connection:{subscribeEvents:async(callback:()=>void,type:string)=>{listeners[type]=callback;return ()=>{};}},callWS:(message:Record<string,unknown>)=>refresh?new Promise(()=>{}):hass.callWS!(message)};
  document.body.append(card);(window as any).refreshDiscovery=()=>{refresh=true;listeners.entity_registry_updated();};
 });
 const card=page.locator('#refresh');
 await expect(card.getByRole('meter')).toHaveAttribute('aria-valuenow','74');
 await page.evaluate(()=>(window as any).refreshDiscovery());
 await expect(card.getByRole('meter')).toHaveAttribute('aria-valuenow','74');
 await expect(card.getByRole('status',{name:'Loading Quatt data'})).toHaveCount(0);
});

test('slim skeleton respects appearance and reduced motion on mobile',async({page})=>{
 await page.setViewportSize({width:320,height:700});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 await page.evaluate(()=>{
  const host=document.createElement('section');host.style.width='288px';document.body.append(host);
  const card=document.createElement('quatt-heat-battery-card') as HTMLElement&{setConfig(config:unknown):void};
  card.id='slim-loading';card.setConfig({type:'custom:quatt-heat-battery-card',layout:'slim',appearance:{background:'#e9e5ef'}});host.append(card);
 });
 const card=page.locator('#slim-loading'),loader=card.getByRole('status',{name:'Loading Quatt data'});
 await expect(loader).toBeVisible();await expect(loader).toHaveCSS('background-color','rgb(233, 229, 239)');
 await expect(card.locator('.skeleton-content')).toHaveCSS('animation-name','none');
 const box=await loader.boundingBox();expect(box!.height).toBeLessThan(120);expect(box!.width).toBeLessThanOrEqual(288);
});

test('History stays responsive before hass and loads after assignment',async({page})=>{
 test.setTimeout(10000);await page.goto('/');
 await page.evaluate(()=>{
  const card=document.createElement('quatt-history-card') as HTMLElement&{setConfig(config:unknown):void};
  card.id='history-before-hass';card.setConfig({type:'custom:quatt-history-card'});document.body.append(card);
 });
 const card=page.locator('#history-before-hass');
 await expect(card.getByRole('status',{name:'Loading Quatt data'})).toBeVisible();
 await page.evaluate(async()=>{
  const path='/src/demo/fixtures.ts';const {createDemo}=await import(/* @vite-ignore */ path) as typeof import('../../src/demo/fixtures');
  (document.getElementById('history-before-hass') as HTMLElement&{hass:unknown}).hass=createDemo().hass;
 });
 await expect(card.getByRole('status',{name:'Loading Quatt data'})).toHaveCount(0);
 await expect(card.locator('.chart')).toBeVisible();
});
