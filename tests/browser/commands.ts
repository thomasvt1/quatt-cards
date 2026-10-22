import {defineBrowserCommand} from '@vitest/browser-playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {build} from 'vite';
export const browserCommands={
 saveCoverage:defineBrowserCommand(async(_context,data:object|undefined)=>{
  const dir=process.env.QUATT_COVERAGE_DIR;
  if(dir&&data&&Object.keys(data).length){await mkdir(dir,{recursive:true});await writeFile(path.join(dir,randomUUID()+'.json'),JSON.stringify(data));}
 }),
 pressKey:defineBrowserCommand(async({page,iframe},key:string,selector?:string)=>{
  if(selector)await iframe.locator(selector).press(key);else await page.keyboard.press(key);
 }),
 mouseButton:defineBrowserCommand(async({page},action:'down'|'up')=>{await page.mouse[action]();}),
 tapPoint:defineBrowserCommand(async({page,frame},x:number,y:number)=>{
  const element=await (await frame()).frameElement();const box=await element.boundingBox();
  await page.touchscreen.tap(x+(box?.x??0),y+(box?.y??0));
 }),
 setMedia:defineBrowserCommand(async({page},options:{reducedMotion:'reduce'|'no-preference'})=>{await page.emulateMedia(options);}),
 captureScreenshot:defineBrowserCommand(async({page,iframe,frame},options:{path:string;fullPage?:boolean},selector?:string)=>{
  await mkdir(path.dirname(options.path),{recursive:true});
  if(selector){await iframe.locator(selector).screenshot(options);return;}
  if(!options.fullPage){await page.screenshot(options);return;}
  // The outer Vitest page cannot capture content clipped by its tester iframe.
  // Expand the frame for a full document capture, then restore the test viewport.
  const tester=await frame(),element=await tester.frameElement(),viewport=page.viewportSize()!;
  const style=await element.getAttribute('style');
  const height=await tester.evaluate(()=>Math.max(document.body.scrollHeight,document.documentElement.scrollHeight));
  try{
   await element.evaluate((node,height)=>{(node as HTMLElement).style.height=`${height}px`;},height);
   await page.setViewportSize({width:viewport.width,height:Math.max(viewport.height,height+4)});
   await iframe.locator('body').screenshot({path:options.path});
  }finally{
   await element.evaluate((node,style)=>{const element=node as HTMLElement;if(style===null)element.removeAttribute('style');else element.setAttribute('style',style);},style);
   await page.setViewportSize(viewport);
  }
 }),
 buildIcons:defineBrowserCommand(async()=>{
  const bundle=await build({mode:'icons',build:{write:false},logLevel:'silent'});
  return (Array.isArray(bundle)?bundle:[bundle]).flatMap(output=>'output' in output?output.output:[]).filter(output=>output.type==='chunk').map(chunk=>chunk.code);
 }),
};
declare module 'vitest/browser' {
 interface BrowserCommands {
  saveCoverage:(data:object|undefined)=>Promise<void>;
  pressKey:(key:string,selector?:string)=>Promise<void>;
  mouseButton:(action:'down'|'up')=>Promise<void>;
  tapPoint:(x:number,y:number)=>Promise<void>;
  setMedia:(options:{reducedMotion:'reduce'|'no-preference'})=>Promise<void>;
  captureScreenshot:(options:{path:string;fullPage?:boolean},selector?:string)=>Promise<void>;
  buildIcons:()=>Promise<string[]>;
 }
}
