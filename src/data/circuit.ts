import type { CardConfig, Reading, Snapshot } from '../types';

/** Upstream hydraulic order, independent of entity names and registry order. */
export function pumpPosition(keys: string[]): number | undefined {
  const positions = new Set(keys.flatMap(key => {
    const local = /^hp([12])\./.exec(key), remote = /^heatPumps\.([01])\./.exec(key);
    return local ? [Number(local[1])] : remote ? [Number(remote[1]) + 1] : [];
  }));
  return positions.size === 1 ? [...positions][0] : undefined;
}

export function circuitReadings(snapshot: Snapshot, config: CardConfig) {
  const pumps = [...snapshot.heatPumps].sort((a,b)=>(a.position ?? 99)-(b.position ?? 99));
  // Never replace a missing last-pump reading with the previous pump's outlet.
  const ordered = pumps.length > 0 && pumps.length <= 2 && pumps.every((p,i)=>p.position===i+1);
  const supply = config.entities?.supplyTemperature ? snapshot.system.supplyTemperature : ordered ? pumps.at(-1)?.metrics.supplyTemperature : undefined;
  const returnTemperature = config.entities?.returnTemperature ? snapshot.system.returnTemperature : ordered ? pumps[0].metrics.returnTemperature : undefined;
  const delta: Reading | undefined = supply?.value != null && returnTemperature?.value != null && supply.unit === '°C' && returnTemperature.unit === '°C'
    ? { value:supply.value-returnTemperature.value, text:null, unit:'°C' } : undefined;
  return { pumps, ordered, supply, returnTemperature, delta };
}
