import {test,expect} from './fixtures';
import {commands} from 'vitest/browser';
test('standalone icon pack works without cards and preserves other icon namespaces',async({page})=>{
 await page.setContent('<div>Standalone icons</div>');
 await page.evaluate(()=>{const w=window as any;w.customIcons={hue:{sentinel:true}};w.customIconsets={hue:'existing'};});
 // Build the current standalone entry in memory: no missing/stale dist dependency.
 const chunks=await commands.buildIcons();
 expect(chunks).toHaveLength(1);
 await page.addScriptTag({type:'module',content:chunks[0]});
 await expect.poll(()=>page.evaluate(()=>(window as any).customIcons.quatt!==undefined)).toBe(true);
 const result=await page.evaluate(async()=>{
  const w=window as any;
  return {list:await w.customIcons.quatt.getIconList(),hue:w.customIcons.hue,legacy:w.customIconsets.hue,card:!!customElements.get('quatt-overview-card')};
 });
 expect(result.list).toHaveLength(14);expect(result.hue).toEqual({sentinel:true});expect(result.legacy).toBe('existing');expect(result.card).toBe(false);
});
