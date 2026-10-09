// Independent expectations from the upstream enum, reported API diagnostics,
// and supported compatibility aliases. Sources: docs/chill-states.md.
export const chillStates = [
  {status:'OFF', state:'off', activity:'neutral', icon:'power'},
  {status:'OFFLINE', state:'offline', activity:'neutral', icon:'warning'},
  {status:'COOLING', state:'on', activity:'cooling', icon:'snow'},
  {status:'HEATING', state:'on', activity:'heating', icon:'heat'},
  {status:'ON_WORKING', state:'on', activity:'mode', icon:'mode'},
  {status:'ON_TARGET_TEMPERATURE_REACHED', state:'idle', activity:'neutral', icon:'power'},
  {status:'WARNING_DISCONNECTED', state:'offline', activity:'neutral', icon:'warning'},
  {status:'WARNING_NOT_COOLING_HEATING_SYSTEM_IS_HEATING', state:'warning', activity:'neutral', icon:'warning'},
  {status:'ON', state:'on', activity:'mode', icon:'mode'},
  {status:'RUNNING', state:'on', activity:'mode', icon:'mode'},
  {status:'IDLE', state:'idle', activity:'neutral', icon:'power'},
  {status:'STANDBY', state:'idle', activity:'neutral', icon:'power'},
  {status:'ON_IDLE', state:'idle', activity:'neutral', icon:'power'},
  {status:'ON_STANDBY', state:'idle', activity:'neutral', icon:'power'},
] as const;

export function displayStatus(raw:string):string {
  const text=raw.replaceAll('_',' ').toLowerCase();
  return text[0].toUpperCase()+text.slice(1);
}
