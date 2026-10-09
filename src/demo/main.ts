import '../index';
import './style.css';
import { createDemo } from './fixtures';
import type { CardConfig, CardType, HomeAssistant } from '../types';

type DemoCard = HTMLElement & { hass:HomeAssistant; setConfig(config:CardConfig):void; updateComplete:Promise<boolean> };
const names=['overview','heat-pump','heat-battery','history','chill','status','heating-circuit'];
const titles=['Overview','Heat pumps','Heat battery','Heating history','Chill rooms','Status','Heating circuit'];
const types=names.map(name=>`custom:quatt-${name}-card` as CardType);
const configs=new Map<CardType,CardConfig>();
let demo=createDemo();

document.body.innerHTML=`<main><header class="demo-header"><div class="brand"><h1>Quatt</h1><span class="demo-label">Demo data</span></div><div class="demo-controls"><label>Scenario <select id="scenario"><option value="heating">Heating</option><option value="single">Single units</option><option value="idle">Standby</option><option value="cooling">Chill cooling</option><option value="defrost">Defrost</option><option value="offline">Device offline</option><option value="partial">Partial data</option><option value="missing">Integration missing</option><option value="many">Five Chill rooms</option></select></label><button id="theme">Dark theme</button><label>Edit card <select id="edit-card">${names.map((name,i)=>`<option value="${name}">${titles[i]}</option>`).join('')}</select></label><button id="edit">Open editor</button></div></header><section class="card-grid" aria-label="Quatt cards"></section><section class="editor-panel" hidden><div class="editor-heading"><h2>Card editor</h2><button id="close-editor">Close editor</button></div><div id="editor-mount"></div></section><footer>Seven independent Home Assistant cards · Illustrative values · Controls open in Home Assistant</footer></main>`;
const grid=document.querySelector('.card-grid')!;
const cardElements=new Map<CardType,DemoCard>();
for(const type of types) {
  const card=document.createElement(type.slice(7)) as DemoCard;
  card.id=type.slice(7);
  const config:CardConfig={type};
  configs.set(type,config); card.setConfig(config); card.hass=demo.hass; cardElements.set(type,card); grid.append(card);
}
function setScenario(scenario:Parameters<typeof createDemo>[0]) {
  demo=createDemo(scenario);
  cardElements.forEach(card=>{card.hass=demo.hass;});
  const editor=document.querySelector<DemoCard>('quatt-card-editor');
  if(editor)editor.hass=demo.hass;
  (document.querySelector('#scenario') as HTMLSelectElement).value=scenario||'heating';
}
function setTheme(theme:'light'|'dark') {
  document.documentElement.dataset.theme=theme;
  document.querySelector('#theme')!.textContent=theme==='dark'?'Light theme':'Dark theme';
}
const resolveType=(type:CardType|string):CardType=>(type.startsWith('custom:')?type:`custom:quatt-${type}-card`) as CardType;
function setConfig(input:CardType|string,patch:Partial<CardConfig>) {
  const type=resolveType(input),config={...configs.get(type)!,...patch,type};
  configs.set(type,config);cardElements.get(type)!.setConfig(config);
}
function showEditor(input:CardType|string=types[0]) {
  const type=resolveType(input),element=document.createElement('quatt-card-editor') as DemoCard;
  element.hass=demo.hass;element.setConfig(configs.get(type)!);
  element.addEventListener('config-changed',event=>{
    const config=(event as CustomEvent<{config:CardConfig}>).detail.config;
    configs.set(type,config);cardElements.get(type)!.setConfig(config);element.setConfig(config);
  });
  document.querySelector('#editor-mount')!.replaceChildren(element);
  (document.querySelector('.editor-panel') as HTMLElement).hidden=false;
}
document.querySelector('#scenario')!.addEventListener('change',event=>setScenario((event.target as HTMLSelectElement).value));
document.querySelector('#theme')!.addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
document.querySelector('#edit')!.addEventListener('click',()=>{showEditor((document.querySelector('#edit-card') as HTMLSelectElement).value);document.querySelector('.editor-panel')!.scrollIntoView({block:'start'});});
document.querySelector('#close-editor')!.addEventListener('click',()=>{document.querySelector('#editor-mount')!.replaceChildren();(document.querySelector('.editor-panel') as HTMLElement).hidden=true;});
const params=new URLSearchParams(location.search);setTheme(params.get('theme')==='dark'?'dark':'light');
if(params.has('scenario'))setScenario(params.get('scenario')!);

declare global { interface Window { demo:{ setScenario:typeof setScenario;setTheme:typeof setTheme;showEditor:typeof showEditor;setConfig:typeof setConfig;getConfig:(type:CardType|string)=>CardConfig|undefined; }; } }
window.demo={setScenario,setTheme,showEditor,setConfig,getConfig:type=>configs.get(resolveType(type))};
