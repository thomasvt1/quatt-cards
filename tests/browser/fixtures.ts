import {test as base,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
export {expect,type Page};
export async function collectCoverage(page:Page){
 const dir=process.env.QUATT_COVERAGE_DIR;if(!dir)return;
 const data=await page.evaluate(()=>(window as unknown as {__coverage__?:unknown}).__coverage__);
 if(data&&Object.keys(data).length){await mkdir(dir,{recursive:true});await writeFile(join(dir,randomUUID()+'.json'),JSON.stringify(data));}
}
export const test=base.extend<{coverage:void}>({
 coverage:[async({context},use)=>{
  const dir=process.env.QUATT_COVERAGE_DIR;
  if(!dir){await use();return;}
  await mkdir(dir,{recursive:true});
  const save=async(data:unknown)=>{if(data&&Object.keys(data).length)await writeFile(join(dir,randomUUID()+'.json'),JSON.stringify(data));};
  await context.exposeBinding('__saveQuattCoverage',(_source,data)=>save(data));
  await context.addInitScript(()=>{window.addEventListener('beforeunload',()=>{void (window as unknown as {__saveQuattCoverage:(d:unknown)=>Promise<void>}).__saveQuattCoverage((window as unknown as {__coverage__?:unknown}).__coverage__);});});
  await use();
  for(const page of context.pages())if(!page.isClosed())await save(await page.evaluate(()=>(window as unknown as {__coverage__?:unknown}).__coverage__));
 },{auto:true}],
});
