import type { Metrics, QuattDevice, Snapshot, StatusRow } from '../types';

const hasText = (metrics: Metrics, key: keyof Metrics) => metrics[key]?.text;
export function buildStatus(snapshot: Snapshot): StatusRow[] {
  const rows: StatusRow[] = [], system = snapshot.system;
  const mode = hasText(system, 'mode');
  if (mode) rows.push({ key: 'mode', title: /^(Heating - heatpump only|Heating · heat pump)$/.test(mode) ? 'Heat pumps heating' : mode, detail: 'Reported system operating mode', tone: /fault|invalid|error/i.test(mode) ? 'error' : /protection/i.test(mode) ? 'warning' : 'neutral', icon: 'mdi:heat-pump', entityId: system.mode?.entityId });
  if (system.connected?.value === 0) rows.push({ key: 'controller', title: 'Controller offline', detail: 'Quatt reports that the controller is not alive.', tone: 'error', icon: 'mdi:lan-disconnect', entityId: system.connected.entityId });
  else if (system.connected?.value === 1 && !snapshot.heatPumps.some(d => d.metrics.connected?.value === 1)) rows.push({ key: 'controller', title: 'Controller connected', tone: 'good', icon: 'mdi:lan-connect', entityId: system.connected.entityId });
  const connected = snapshot.heatPumps.filter(d => d.metrics.connected?.value === 1);
  if (connected.length) rows.push({ key:'pumps-connected',title:`${connected.length} heat pump${connected.length===1?'':'s'} connected`,detail:'Connection reported by the controller',tone:'good',icon:'connection' });
  if (snapshot.heatPumps.length && snapshot.heatPumps.every(d => d.available && d.metrics.defrost?.value === 0)) rows.push({key:'no-defrost',title:'No defrost reported',detail:'All heat pumps report defrost off',tone:'neutral',icon:'snow'});
  const chills = snapshot.chills.filter(d => d.available && d.metrics.status?.text && d.metrics.status.text.toLowerCase() !== 'offline');
  if (chills.length) rows.push({key:'chills-available',title:`${chills.length} Chill unit${chills.length===1?'':'s'} available`,detail:'Operating states are available',tone:'good',icon:'chill'});
  if (snapshot.heatBattery?.available && snapshot.heatBattery.metrics.status?.text) rows.push({key:'battery-status',title:`Heat battery ${snapshot.heatBattery.metrics.status.text.toLowerCase()}`,detail:'Reported thermal storage state',tone:'neutral',icon:'tank',entityId:snapshot.heatBattery.metrics.status.entityId});
  if (system.silent?.value === 1) rows.push({ key: 'silent-system', title: 'Silent mode active', detail: 'Quatt reports a system sound limit.', tone: 'neutral', icon: 'mdi:volume-low', entityId: system.silent.entityId });
  const check = (device: QuattDevice) => {
    const m = device.metrics, prefix = device.name;
    if (!device.available) rows.push({ key: `${device.id}-offline`, title: `${prefix} unavailable`, detail: m.status?.text?.toLowerCase() === 'offline' ? 'Quatt reports that this device is offline.' : 'No available telemetry or connection is reported for this device.', tone: 'warning', icon: 'mdi:lan-disconnect', entityId: m.connected?.entityId || m.status?.entityId });
    if (m.defrost?.value === 1) rows.push({ key: `${device.id}-defrost`, title: `${prefix} is defrosting`, detail: 'Heating output may temporarily fall during defrost.', tone: 'neutral', icon: 'mdi:snowflake-melt', entityId: m.defrost.entityId });
    if (m.limited?.value === 1) rows.push({ key: `${device.id}-limited`, title: `${prefix} limited by COP`, detail: 'Quatt reports an efficiency-related output limit.', tone: 'warning', icon: 'mdi:speedometer-slow', entityId: m.limited.entityId });
    if (m.silent?.value === 1) rows.push({ key: `${device.id}-silent`, title: `${prefix} silent mode`, tone: 'neutral', icon: 'mdi:volume-low', entityId: m.silent.entityId });
    if (m.fault?.value === 1 || /^(fault|error)(?:\b|_)/i.test(m.status?.text || '')) rows.push({ key: `${device.id}-fault`, title: `${prefix} reports a fault`, detail: m.status?.text || 'Inspect the source entity for details.', tone: 'error', icon: 'mdi:alert-circle-outline', entityId: m.fault?.entityId || m.status?.entityId });
    if (m.waterWarning?.value === 1) rows.push({ key: `${device.id}-water`, title: `${prefix} water tank warning`, detail: 'Quatt reports a water tank level warning.', tone: 'warning', icon: 'mdi:water-alert-outline', entityId: m.waterWarning.entityId });
  };
  [...snapshot.heatPumps, ...snapshot.chills, ...[snapshot.heatBattery, snapshot.heatCharger].filter((device): device is QuattDevice => !!device)].forEach(check);
  const battery = snapshot.heatBattery;
  if (battery?.metrics.charging?.value === 1) rows.push({ key: 'battery-charging', title: 'Heat battery charging', tone: 'good', icon: 'mdi:battery-charging', entityId: battery.metrics.charging.entityId });
  if (battery?.metrics.hotWater?.value === 1) rows.push({ key: 'hot-water', title: 'Domestic hot water active', tone: 'neutral', icon: 'mdi:shower', entityId: battery.metrics.hotWater.entityId });
  if (!rows.length) rows.push({ key: 'no-status', title: 'Status unavailable', detail: 'No supported operating or diagnostic states are available.', tone: 'neutral', icon: 'mdi:information-outline' });
  return rows;
}
