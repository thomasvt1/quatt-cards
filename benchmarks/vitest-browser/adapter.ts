// Throwaway benchmark adapter: original assertions run inside Vitest's browser iframe.
// No Playwright Test runtime is imported here.
import {test as vitest, expect as check} from 'vitest';
import {page as browserPage, userEvent, commands} from 'vitest/browser';

const cases: Array<{name:string; fn: (context:any)=>Promise<void>}> = [];
export function test(name:string, fn:(context:any)=>Promise<void>) { cases.push({name,fn}); }

function deepQuery(root:Document|Element|ShadowRoot,selector:string):Element|null {
  const own=root.querySelector(selector);if(own)return own;
  if(root instanceof Element && root.shadowRoot){const match=deepQuery(root.shadowRoot,selector);if(match)return match;}
  for(const element of root.querySelectorAll('*'))if(element.shadowRoot){const match=deepQuery(element.shadowRoot,selector);if(match)return match;}
  return null;
}
class Locator {
  constructor(private readonly resolve:()=>any) {}
  get raw(){return this.resolve();}
  getByRole(...args:any[]) {return new Locator(()=>this.raw.getByRole(...args));}
  getByText(...args:any[]) {return new Locator(()=>this.raw.getByText(...args));}
  getByLabel(...args:any[]) {return new Locator(()=>this.raw.getByLabelText(...args));}
  locator(selector:string) {return new Locator(()=>browserPage.elementLocator(deepQuery(this.raw.element(),selector)!));}
  async evaluate(fn:any, arg?:any) {return fn(this.raw.element(),arg);}
  async boundingBox() {const {x,y,width,height}=this.raw.element().getBoundingClientRect();return {x,y,width,height};}
  async focus() {this.raw.element().focus();}
  async press(key:string) {await userEvent.keyboard(`{${key}}`);}
  async selectOption(value:string) {await this.raw.selectOptions(value);}
  async click() {await this.raw.click();}
  async uncheck() {if(this.raw.element().checked)await this.raw.click();await check.element(this.raw).not.toBeChecked();}
}

const page = {
  async goto(_url:string) {
    const entry='/src/demo/main.ts';
    await import(/* @vite-ignore */ entry);
  },
  async evaluate(fn:any,arg?:any) {return fn(arg);},
  async setViewportSize({width,height}:{width:number;height:number}) {await browserPage.viewport(width,height);},
  locator(selector:string) {return new Locator(()=>browserPage.elementLocator(document.querySelector(selector)!));},
};

function assertions(locator:Locator, negate=false):any {
  const assertion=()=>negate?check.element(locator.raw,{timeout:5000}).not:check.element(locator.raw,{timeout:5000});
  const poll=(fn:()=>unknown)=>negate?check.poll(fn,{timeout:5000}).not:check.poll(fn,{timeout:5000});
  return {
    get not(){return assertions(locator,!negate);},
    toBeVisible:()=>assertion().toBeVisible(),
    toBeChecked:()=>assertion().toBeChecked(),
    toHaveAttribute:(name:string,value:any)=>value instanceof RegExp?poll(()=>locator.raw.element().getAttribute(name)).toMatch(value):assertion().toHaveAttribute(name,value),
    toHaveCount:(count:number)=>poll(()=>locator.raw.elements().length).toBe(count),
    toHaveCSS:(property:string,value:string)=>poll(()=>getComputedStyle(locator.raw.element()).getPropertyValue(property)).toBe(value),
  };
}
export function expect(value:any,...args:any[]):any {return value instanceof Locator?assertions(value):check(value,...args);}

export function runCase(index:number) {
  const item=cases[index];
  vitest(item.name, async()=>{
    await item.fn({page});
    await (commands as any).saveTrialCoverage((window as any).__coverage__??{});
  });
}
