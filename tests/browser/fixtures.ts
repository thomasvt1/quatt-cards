import {test as base, expect as check, beforeEach, afterEach, vi} from 'vitest';
import {page as nativePage, locators, commands, type Locator as NativeLocator} from 'vitest/browser';
declare module 'vitest/browser' { interface LocatorSelectors { getByCSS(selector:string):NativeLocator } }
locators.extend({getByCSS(selector){return `css=${selector}`;}});

// Lazy native locators survive Lit replacing nodes between actions and assertions.
class Locator {
 constructor(readonly raw:NativeLocator){}
 locator(selector:string){return new Locator(this.raw.getByCSS(selector));}
 getByRole(...args:Parameters<NativeLocator['getByRole']>){return new Locator(this.raw.getByRole(...args));}
 getByText(...args:Parameters<NativeLocator['getByText']>){return new Locator(this.raw.getByText(...args));}
 getByLabel(...args:Parameters<NativeLocator['getByLabelText']>){return new Locator(this.raw.getByLabelText(...args));}
 filter(...args:Parameters<NativeLocator['filter']>){return new Locator(this.raw.filter(...args));}
 first(){return new Locator(this.raw.first());}
 async evaluate<R,A=undefined>(fn:(element:HTMLElement,arg:A)=>R,arg?:A){return fn(this.raw.element() as HTMLElement,arg as A);}
 async evaluateAll<R>(fn:(elements:HTMLElement[])=>R){return fn(this.raw.elements() as HTMLElement[]);}
 async boundingBox(){const {x,y,width,height}=this.raw.element().getBoundingClientRect();return {x,y,width,height};}
 async getAttribute(name:string){return this.raw.element().getAttribute(name);}
 async count(){return this.raw.elements().length;}
 async focus(){(this.raw.element() as HTMLElement).focus();}
 async blur(){(this.raw.element() as HTMLElement).blur();}
 async scrollIntoViewIfNeeded(){this.raw.element().scrollIntoView({block:'nearest',inline:'nearest'});}
 async press(key:string){await commands.pressKey(key,this.raw.selector);}
 async selectOption(value:string){await this.raw.selectOptions(value);}
 async click(){await this.raw.click();}
 async hover(options?:Parameters<NativeLocator['hover']>[0]){await this.raw.hover(options);}
 async fill(value:string){await this.raw.fill(value);}
 async uncheck(){if((this.raw.element() as HTMLInputElement).checked)await this.raw.click();await check.element(this.raw).not.toBeChecked();}
 async screenshot(options:{path:string}){await commands.captureScreenshot(options,this.raw.selector);}
}
let navigation=0;
let mousePressed=false;
const documentListeners:Array<Parameters<Document['addEventListener']>>=[];
beforeEach(()=>{
 const add=document.addEventListener.bind(document);
 vi.spyOn(document,'addEventListener').mockImplementation((...args)=>{documentListeners.push(args);add(...args);});
});
const listeners:Array<(event:ErrorEvent)=>void>=[];
export const page={
 // Vitest owns navigation; mount a fresh demo at the only URL used by this suite.
 async goto(_url:'/'){
  document.body.replaceChildren();document.documentElement.removeAttribute('style');
  const entry=`/src/demo/main.ts?testNavigation=${++navigation}`;
  await import(/* @vite-ignore */ entry);
 },
 async evaluate<R,A=undefined>(fn:(arg:A)=>R,arg?:A){return fn(arg as A);},
 async setViewportSize({width,height}:{width:number;height:number}){await nativePage.viewport(width,height);},
 locator(selector:string){return new Locator(nativePage.getByCSS(selector));},
 getByRole(...args:Parameters<NativeLocator['getByRole']>){return new Locator(nativePage.getByRole(...args));},
 getByText(...args:Parameters<NativeLocator['getByText']>){return new Locator(nativePage.getByText(...args));},
 getByLabel(...args:Parameters<NativeLocator['getByLabelText']>){return new Locator(nativePage.getByLabelText(...args));},
 on(_event:'pageerror',callback:(error:Error)=>void){const listener=(event:ErrorEvent)=>callback(event.error??new Error(event.message));listeners.push(listener);window.addEventListener('error',listener);},
 keyboard:{press:(key:string)=>commands.pressKey(key)},
 mouse:{
  async down(){mousePressed=true;await commands.mouseButton('down');},
  async up(){await commands.mouseButton('up');mousePressed=false;},
 },
 touchscreen:{tap:(x:number,y:number)=>commands.tapPoint(x,y)},
 screenshot:(options:{path:string;fullPage?:boolean})=>commands.captureScreenshot(options),
 emulateMedia:(options:{reducedMotion:'reduce'|'no-preference'})=>commands.setMedia(options),
 async setContent(content:string){document.body.innerHTML=content;},
 async addScriptTag({content}:{type:string;content:string}){const url=URL.createObjectURL(new Blob([content],{type:'text/javascript'}));try{await import(/* @vite-ignore */ url);}finally{URL.revokeObjectURL(url);}},
};
export type Page=typeof page;
function assertions(locator:Locator,negate=false){
 const element=()=>negate?check.element(locator.raw,{timeout:5000}).not:check.element(locator.raw,{timeout:5000});
 const poll=<T>(fn:()=>T)=>negate?check.poll(fn,{timeout:5000}).not:check.poll(fn,{timeout:5000});
 return {
  get not():ReturnType<typeof assertions>{return assertions(locator,!negate);},
  toBeVisible:()=>element().toBeVisible(),toBeChecked:()=>element().toBeChecked(),
  toBeDisabled:()=>element().toBeDisabled(),toBeEnabled:(options?:{enabled:boolean})=>options?.enabled===false?element().toBeDisabled():element().toBeEnabled(),toBeFocused:()=>poll(()=>{let active=document.activeElement;while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;return active===locator.raw.element();}).toBe(true),
  toHaveAttribute:(name:string,value?:string|RegExp)=>value instanceof RegExp?poll(()=>locator.raw.element().getAttribute(name)).toMatch(value):element().toHaveAttribute(name,value),
  toHaveCount:(count:number)=>poll(()=>locator.raw.elements().length).toBe(count),
  toHaveCSS:(property:string,value:string)=>poll(()=>getComputedStyle(locator.raw.element()).getPropertyValue(property)).toBe(value),
  toHaveClass:(value:RegExp|string)=>value instanceof RegExp?poll(()=>locator.raw.element().className).toMatch(value):poll(()=>locator.raw.element().className).toBe(value),
  toHaveAccessibleDescription:(value:string)=>element().toHaveAccessibleDescription(value),
  toHaveText:(value:string)=>poll(()=>locator.raw.element().textContent?.replace(/\s+/g,' ').trim()).toBe(value),
  toContainText:(value:string)=>poll(()=>locator.raw.element().textContent?.replace(/\s+/g,' ').trim()).toContain(value),
 };
}
function browserExpect(value:Locator):ReturnType<typeof assertions>;
function browserExpect<T>(value:T,message?:string):ReturnType<typeof check<T>>;
function browserExpect(value:unknown,message?:string){return value instanceof Locator?assertions(value):check(value,message);}
export const expect=Object.assign(browserExpect,{poll:check.poll});
export const test=base.extend<{page:Page}>({page:async({},use)=>{await use(page);}});
afterEach(async()=>{
 await commands.saveCoverage((window as unknown as {__coverage__?:object}).__coverage__);
 for(const listener of listeners)window.removeEventListener('error',listener);
 listeners.length=0;document.body.replaceChildren();
 for(const args of documentListeners)document.removeEventListener(...args);
 documentListeners.length=0;vi.restoreAllMocks();
 for(const attribute of [...document.body.attributes])document.body.removeAttribute(attribute.name);
 if(mousePressed){await commands.mouseButton('up');mousePressed=false;}
 await commands.setMedia({reducedMotion:'no-preference'});await nativePage.viewport(1280,720);
});
