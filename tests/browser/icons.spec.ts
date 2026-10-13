import {test,expect} from './fixtures';

test('Quatt Cards registers four searchable, filled-outline HA icons',async({page})=>{
 await page.goto('/');
 const icons=await page.evaluate(async()=>{
  const w=window as any,provider=w.customIcons.quatt;
  const list=await provider.getIconList();
  return Promise.all(list.map(async(item:any)=>({...item,...await provider.getIcon(item.name),legacy:await w.customIconsets.quatt(item.name)})));
 });
 expect(icons.map(i=>i.name).sort()).toEqual(['chill-outline','heat-battery-outline','heat-charger-outline','quatt-outline']);
 for(const icon of icons){
  expect(icon.keywords).toContain('quatt');
  expect(icon.legacy.path).toBe(icon.path);
  expect(icon.viewBox).toBe('0 0 24 24');
  const bounds=await page.evaluate(icon=>{
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path') as SVGPathElement;
   svg.setAttribute('viewBox',icon.viewBox);path.setAttribute('d',icon.path);svg.append(path);document.body.append(svg);
   const b=path.getBBox();svg.remove();return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};
  },icon);
  expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(24);expect(bounds.bottom).toBeLessThanOrEqual(24);
 }
 for(const name of ['missing','constructor','__proto__'])expect(await page.evaluate(name=>(window as any).customIcons.quatt.getIcon(name),name)).toBeUndefined();
});

test('standalone icon pack works without cards and preserves other icon namespaces',async({page})=>{
 await page.setContent('<div>Standalone icons</div>');
 await page.evaluate(()=>{const w=window as any;w.customIcons={hue:{sentinel:true}};w.customIconsets={hue:'existing'};});
 await page.addScriptTag({type:'module',path:'dist/quatt-icons.js'});
 await expect.poll(()=>page.evaluate(()=>(window as any).customIcons.quatt!==undefined)).toBe(true);
 const result=await page.evaluate(async()=>{
  const w=window as any;
  return {list:await w.customIcons.quatt.getIconList(),hue:w.customIcons.hue,legacy:w.customIconsets.hue,card:!!customElements.get('quatt-overview-card')};
 });
 expect(result.list).toHaveLength(4);expect(result.hue).toEqual({sentinel:true});expect(result.legacy).toBe('existing');expect(result.card).toBe(false);
});
