import type { DeviceKind, MetricRole, RegistryData, RegistryEntity } from '../types';

export interface Source { entity: RegistryEntity; installationId: string; deviceId: string; kind: DeviceKind; key: string; role: MetricRole; rank: number; }
type Mapping = [MetricRole, string[], DeviceKind, number?];
const core: Mapping[] = [
  ['heatPower', ['computedPower'], 'system'],
  ['electricPower', ['computedPowerInput'], 'system'],
  ['cop', ['computedQuattCop'], 'system'],
  ['mode', ['qc.computedSupervisoryControlMode'], 'system'],
  ['mode', ['qc.supervisoryControlMode'], 'system', 1],
  ['mode', ['supervisoryControlMode'], 'system', 2],
  ['status', ['status'], 'system'],
  ['connected', ['isControllerAlive'], 'system'],
  ['supplyTemperature', ['flowMeter.waterSupplyTemperature'], 'system'],
  ['flowRate', ['qc.flowRateFiltered'], 'system'],
  ['roomTemperature', ['thermostat.otFtRoomTemperature'], 'thermostat'],
  ['targetTemperature', ['thermostat.otFtRoomSetpoint'], 'thermostat'],
  ['outdoorTemperature', ['temperatureOutside'], 'thermostat'],
  ['showerMinutes', ['hb.showerMinutes'], 'heat-battery'],
  ['topTemperature', ['hb.topTemperature'], 'heat-battery'],
  ['middleTemperature', ['hb.middleTemperature'], 'heat-battery'],
  ['bottomTemperature', ['hb.bottomTemperature'], 'heat-battery'],
  ['charge', ['allEStatus.heatBatteryPercentage'], 'heat-battery'],
  ['status', ['allEStatus.heatBatteryStatus'], 'heat-battery'],
  ['charging', ['allEStatus.isHeatBatteryCharging'], 'heat-battery'],
  ['hotWater', ['allEStatus.isDomesticHotWaterOn'], 'heat-battery'],
  ['boost', ['allElectricBoost.status'], 'heat-battery'],
  ['heaterPower', ['hc.electricalPower'], 'heat-charger'],
  ['waterPressure', ['hc.heatingSystemPressure'], 'heat-charger'],
  ['supplyTemperature', ['hc.distributionSystemSupplyTemperature'], 'heat-charger'],
  ['returnTemperature', ['hc.chHeatExchangerInletTemperature'], 'heat-charger'],
];
const hpRoles: Record<string, MetricRole> = {
  power: 'heatPower', powerInput: 'electricPower', computedQuattCop: 'cop',
  temperatureWaterIn: 'returnTemperature', temperatureWaterOut: 'supplyTemperature',
  temperatureOutside: 'outdoorTemperature', getMainWorkingMode: 'mode',
  silentModeStatus: 'silent', limitedByCop: 'limited', computedDefrost: 'defrost',
};
const hpRemote: Record<string, MetricRole> = { electricalPower: 'electricPower', compressorFrequency: 'compressorSpeed', status: 'status' };
const chillRoles: Record<string, MetricRole> = {
  ambientTemperature: 'roomTemperature', status: 'status', mode: 'mode', fanMode: 'fanMode',
  hasWaterTankLevelWarning: 'waterWarning',
};
function identity(entity: RegistryEntity): { key: string; device: string; hub: string } | undefined {
  const uid = entity.unique_id || '';
  const current = /^(.+):([^:]+):([^:]+)$/.exec(uid);
  if (current) return { hub: current[1], device: current[2], key: current[3] };
  // Upstream migration v3 -> v4 documents this exact legacy format. The
  // known entry prefix is required, so arbitrary entity IDs never match.
  if (entity.config_entry_id && uid.startsWith(entity.config_entry_id)) return { hub: entity.config_entry_id, device: '', key: uid.slice(entity.config_entry_id.length) };
  return undefined;
}
export function discover(registry: RegistryData): Source[] {
  const sources: Source[] = [];
  for (const entity of registry.entities) {
    if (entity.platform !== 'quatt' || entity.disabled_by) continue;
    const parsed = identity(entity);
    if (!parsed) continue;
    const installationId = entity.config_entry_id || parsed.hub;
    const deviceId = entity.device_id || `${installationId}:${parsed.device || 'legacy'}`;
    const push = (role: MetricRole, kind: DeviceKind, rank = 0) => sources.push({ entity, installationId, deviceId, kind, key: parsed.key, role, rank });
    // Exact source keys, not translation keys: upstream uses the same
    // hp_silentModeStatus translation key for three different binary sensors.
    const mapping = core.find(([, keys, kind]) => keys.includes(parsed.key) &&
      (parsed.key !== 'status' || parsed.device === 'cic' || !parsed.device) &&
      (parsed.key !== 'temperatureOutside' || kind === 'thermostat' && (parsed.device === 'thermostat' || !parsed.device)));
    if (mapping) { push(mapping[0], mapping[2], mapping[3]); continue; }
    const hp = /^hp[12]\.(.+)$/.exec(parsed.key);
    if (hp && hpRoles[hp[1]]) { push(hpRoles[hp[1]], 'heat-pump'); continue; }
    const remote = /^heatPumps\.[01]\.(.+)$/.exec(parsed.key);
    if (remote && hpRemote[remote[1]]) { push(hpRemote[remote[1]], 'heat-pump', remote[1] === 'electricalPower' ? 1 : 0); continue; }
    const chill = /^chills(?:\.\d+)?(?:\.(.+))?$/.exec(parsed.key);
    if (chill && chillRoles[chill[1]]) push(chillRoles[chill[1]], 'chill');
    if (chill && !chill[1] && entity.entity_id.startsWith('climate.')) push('targetTemperature', 'chill');
  }
  for (const entity of registry.entities) {
    if (entity.platform !== 'quatt' || entity.disabled_by) continue;
    const parsed = identity(entity);
    const connected = /^isHp([12])Connected$/.exec(parsed?.key || '');
    if (!parsed || !connected) continue;
    const installationId = entity.config_entry_id || parsed.hub;
    const device = sources.find(source => source.installationId === installationId && source.kind === 'heat-pump' &&
      (source.key.startsWith(`hp${connected[1]}.`) || source.key.startsWith(`heatPumps.${Number(connected[1]) - 1}.`)));
    if (device) sources.push({ entity, installationId, deviceId: device.deviceId, kind: 'heat-pump', key: parsed.key, role: 'connected', rank: 0 });
  }
  return sources;
}
