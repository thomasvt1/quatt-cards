import {test,expect} from './fixtures';
import {build} from 'vite';

test('Quatt Cards registers fourteen searchable HA equipment icons',async({page})=>{
 await page.goto('/');
 const icons=await page.evaluate(async()=>{
  const w=window as any,provider=w.customIcons.quatt;
  const list=await provider.getIconList();
  return Promise.all(list.map(async(item:any)=>({...item,...await provider.getIcon(item.name),legacy:await w.customIconsets.quatt(item.name)})));
 });
 expect(icons.map(i=>i.name).sort()).toEqual(['chill-outline','chill-solid','heat-battery-boost','heat-battery-boost-solid','heat-battery-outline','heat-battery-solid','heat-charger-boost','heat-charger-boost-solid','heat-charger-outline','heat-charger-solid','quatt-duo-outline','quatt-duo-solid','quatt-outline','quatt-solid']);
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
 // Build the current standalone entry in memory: no missing/stale dist dependency.
 const bundle=await build({mode:'icons',build:{write:false},logLevel:'silent'});
 const outputs=Array.isArray(bundle)?bundle:[bundle];
 const chunks=outputs.flatMap(output=>'output' in output?output.output:[]).filter(output=>output.type==='chunk');
 expect(chunks).toHaveLength(1);
 await page.addScriptTag({type:'module',content:chunks[0].code});
 await expect.poll(()=>page.evaluate(()=>(window as any).customIcons.quatt!==undefined)).toBe(true);
 const result=await page.evaluate(async()=>{
  const w=window as any;
  return {list:await w.customIcons.quatt.getIconList(),hue:w.customIcons.hue,legacy:w.customIconsets.hue,card:!!customElements.get('quatt-overview-card')};
 });
 expect(result.list).toHaveLength(14);expect(result.hue).toEqual({sentinel:true});expect(result.legacy).toBe('existing');expect(result.card).toBe(false);
});


test('solid silhouettes have filled bodies and transparent detail cutouts',async({page})=>{
 await page.goto('/');
 const probes=[
  {name:'quatt-duo-solid',body:[9,19],cutout:[4,10.2]},
  {name:'quatt-solid',body:[12,18.5],cutout:[5,7]},
  {name:'chill-solid',body:[12,16],cutout:[9,8]},
  {name:'heat-battery-solid',body:[12,12],cutout:[12,4.75]},
  {name:'heat-battery-boost-solid',body:[12,17],cutout:[12,10]},
  {name:'heat-charger-solid',body:[12,18],cutout:[14,9.5]},
  {name:'heat-charger-boost-solid',body:[8,18],cutout:[12,15]},
 ];
 for(const probe of probes){
  const result=await page.evaluate(async probe=>{
   const {path:d}=await (window as any).customIcons.quatt.getIcon(probe.name);
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path') as SVGPathElement;
   path.setAttribute('d',d);svg.append(path);document.body.append(svg);
   const body=path.isPointInFill(new DOMPoint(...probe.body)),cutout=path.isPointInFill(new DOMPoint(...probe.cutout));
   svg.remove();return {body,cutout};
  },probe);
  expect(result,probe.name).toEqual({body:true,cutout:false});
 }
});
