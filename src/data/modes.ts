/** Local CIC supervisory modes only. All-Electric storage modes use a separate upstream schema. */
export const historyModes:Record<number,{label:string;color:string}>= {
  0:{label:'Standby',color:'var(--qc-secondary)'},1:{label:'Standby · heating',color:'var(--qc-secondary)'},
  2:{label:'Heating',color:'var(--qc-heat)'},3:{label:'Heat pump + boiler',color:'var(--qc-heat)'},4:{label:'Boiler heating',color:'var(--qc-heat)'},
  5:{label:'Chill circulation',color:'var(--qc-cool)'},6:{label:'Chill cooling',color:'var(--qc-cool)'},
  95:{label:'Pump protection',color:'var(--qc-warning)'},96:{label:'Anti-freeze · boiler',color:'var(--qc-warning)'},97:{label:'Anti-freeze · pre-pump',color:'var(--qc-warning)'},98:{label:'Anti-freeze · circulation',color:'var(--qc-warning)'},
  99:{label:'Circulation fault',color:'var(--qc-error)'},400:{label:'Invalid configuration',color:'var(--qc-error)'},
};
const descriptions:Record<string,number>={
  'standby':0,'standby - heating':1,'standby · heating':1,
  'heating - heatpump only':2,'heating · heat pump':2,
  'heating - heatpump + boiler':3,'heating · heat pump + boiler':3,
  'heating - boiler only':4,'heating · boiler':4,'chill circulation':5,'chill cooling':6,
  'sticky pump protection':95,'pump protection':95,'anti-freeze protection - boiler on':96,
  'anti-freeze protection - boiler pre-pump':97,'anti-freeze protection - water circulation':98,
  'fault - circulation pump on':99,'invalid configuration':400,
};
export function historyMode(value:unknown):number|null {
  if(typeof value!=='string'&&typeof value!=='number')return null;
  const text=String(value).trim().toLowerCase();
  if(!text)return null;
  if(text in descriptions)return descriptions[text];
  const numeric=Number(text);
  return Number.isInteger(numeric)&&numeric in historyModes?numeric:null;
}
