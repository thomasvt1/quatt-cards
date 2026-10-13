import paths from './paths.json';

const keywords:Record<keyof typeof paths,string[]>={
  'quatt-outline':['quatt','heat pump','warmtepomp','outdoor'],
  'chill-outline':['quatt','chill','cooling','koeling'],
  'heat-battery-outline':['quatt','heat battery','thermal storage','warmtebatterij','tank'],
  'heat-charger-outline':['quatt','heat charger','heater','all electric'],
};

export async function getIcon(name:string) {
  if(!Object.prototype.hasOwnProperty.call(paths,name))return undefined;
  return {path:paths[name as keyof typeof paths],viewBox:'0 0 24 24'};
}
export async function getIconList() {
  return Object.entries(keywords).map(([name,words])=>({name,keywords:[...words]}));
}

type IconWindow=Window&{
  customIcons?:Record<string,{getIcon:typeof getIcon;getIconList:typeof getIconList}>;
  customIconsets?:Record<string,typeof getIcon>;
};
const host=window as IconWindow;
host.customIcons=host.customIcons||{};
host.customIcons.quatt={getIcon,getIconList};
host.customIconsets=host.customIconsets||{};
host.customIconsets.quatt=getIcon;
