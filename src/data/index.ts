import type { CardConfig, DeviceKind, HomeAssistant, MetricRole, Metrics, QuattDevice, Reading, RegistryData, Snapshot } from '../types';
import { discover, type Source } from './discovery';
import { buildStatus } from './status';
import { present, readValue, supervisoryMode } from './values';
export { readValue } from './values';
export { discover } from './discovery';

const meaningful = (reading: Reading | undefined) => reading?.value !== null && reading?.value !== undefined || !!reading?.text;
function readSource(hass: HomeAssistant, source: Source): Reading {
  const entity = hass.states[source.entity.entity_id];
  let reading: Reading;
  if (source.role === 'targetTemperature' && source.entity.entity_id.startsWith('climate.')) {
    const unit = entity?.attributes.temperature_unit || hass.config?.unit_system?.temperature;
    reading = readValue(source.role, entity && { ...entity, attributes: { ...entity.attributes, unit_of_measurement: unit } }, 'temperature');
  } else reading = readValue(source.role, entity);
  if (source.role === 'mode' && source.kind === 'system') reading = supervisoryMode(reading);
  return reading;
}
function readMetrics(hass: HomeAssistant, sources: Source[], warnings: string[]): Metrics {
  const metrics: Metrics = {};
  for (const role of new Set(sources.map(source => source.role))) {
    const options = sources.filter(source => source.role === role).sort((a, b) => a.rank - b.rank);
    const ranked = options.map(source => ({ source, reading: readSource(hass, source) }));
    const best = ranked.find(item => meaningful(item.reading)) || ranked[0];
    if (best) metrics[role] = best.reading;
    if (ranked.filter(item => item.source.rank === best?.source.rank && meaningful(item.reading)).length > 1) {
      metrics[role] = { value: null, text: null, unit: best.reading.unit };
      warnings.push(`More than one source provides ${role}; select an entity override.`);
    }
  }
  return metrics;
}
function applyOverrides(hass: HomeAssistant, metrics: Metrics, config: CardConfig, warnings: string[]) {
  for (const [role, id] of Object.entries(config.entities || {})) {
    if (!id) continue;
    const state = hass.states[id];
    if (!state) warnings.push(`Override unavailable: ${id}`);
    let reading = readValue(role as MetricRole, state);
    if (role === 'targetTemperature' && id.startsWith('climate.') && state) {
      const unit = state.attributes.temperature_unit || hass.config?.unit_system?.temperature;
      reading = readValue('targetTemperature', { ...state, attributes: { ...state.attributes, unit_of_measurement: unit } }, 'temperature');
    }
    metrics[role as MetricRole] = { ...reading, entityId: id };
  }
}
export function buildSnapshot(hass: HomeAssistant, registry: RegistryData, config: CardConfig, _now = new Date()): Snapshot {
  const sources = discover(registry);
  const ids = [...new Set(sources.map(source => source.installationId))];
  const installations = ids.map(id => {
    const systemSource = sources.find(source => source.installationId === id && source.kind === 'system' && source.key === 'computedPower');
    const device = registry.devices.find(candidate => candidate.id === systemSource?.deviceId);
    return { id, name: device?.name_by_user || device?.name || `Quatt installation ${ids.indexOf(id) + 1}` };
  });
  const snapshot: Snapshot = { warnings: [], installations, system: {}, heatPumps: [], chills: [], status: [] };
  let installationId = config.integration_id;
  if (!installationId && ids.length === 1) installationId = ids[0];
  if (!installationId && ids.length > 1) { snapshot.error = 'Multiple Quatt installations found. Select an integration in the card settings.'; return snapshot; }
  if (!installationId || !ids.includes(installationId)) { snapshot.error = installationId ? 'The selected Quatt installation is unavailable.' : 'No supported Quatt entities found.'; return snapshot; }
  snapshot.installationId = installationId;
  const scoped = sources.filter(source => source.installationId === installationId);
  snapshot.system = readMetrics(hass, scoped.filter(source => source.kind === 'system' || source.kind === 'thermostat'), snapshot.warnings);
  function devices(kind: DeviceKind): QuattDevice[] {
    const candidates = scoped.filter(source => source.kind === kind);
    return [...new Set(candidates.map(source => source.deviceId))].map(id => {
      const registryDevice = registry.devices.find(device => device.id === id);
      const metrics = readMetrics(hass, candidates.filter(source => source.deviceId === id), snapshot.warnings);
      // Control targets come only from exact, device-scoped integration discovery.
      // A reading override must never retarget a control to another room.
      const climates = candidates.filter(source => source.deviceId === id && source.kind === 'chill' && source.entity.entity_id.startsWith('climate.'));
      const climateEntityId = climates.length === 1 ? climates[0].entity.entity_id : undefined;
      return { id, name: registryDevice?.name_by_user || registryDevice?.name || kind.replaceAll('-', ' '), kind, available: Object.values(metrics).some(meaningful) && metrics.connected?.value !== 0 && metrics.status?.text?.toLowerCase() !== 'offline', metrics, climateEntityId };
    });
  }
  snapshot.heatPumps = devices('heat-pump'); snapshot.chills = devices('chill');
  const batteries = devices('heat-battery'), chargers = devices('heat-charger');
  if (batteries.length > 1) snapshot.warnings.push('Multiple heat batteries found; select a device.');
  snapshot.heatBattery = batteries.find(device => device.id === config.device) || (batteries.length === 1 ? batteries[0] : undefined);
  snapshot.heatCharger = chargers.length === 1 ? chargers[0] : undefined;
  let target: Metrics | undefined;
  if (config.type === 'custom:quatt-heat-pump-card' || config.type === 'custom:quatt-chill-card') {
    const candidates = config.type === 'custom:quatt-heat-pump-card' ? snapshot.heatPumps : snapshot.chills;
    const selected = config.device ? candidates.find(device => device.id === config.device) : candidates.length === 1 ? candidates[0] : undefined;
    target = selected?.metrics;
    if (config.device && !selected) snapshot.warnings.push('The selected device is unavailable in this installation.');
    if (!selected && Object.keys(config.entities || {}).length) snapshot.warnings.push('Select one device before using entity overrides.');
  } else if (config.type === 'custom:quatt-heat-battery-card') target = snapshot.heatBattery?.metrics;
  else target = snapshot.system;
  if (target) applyOverrides(hass, target, config, snapshot.warnings);
  // A climate's Off state is an operating setting; its separate Offline status
  // remains authoritative even when cached temperatures are still numeric.
  for (const device of [...snapshot.heatPumps, ...snapshot.chills, ...batteries, ...chargers]) {
    device.available = Object.values(device.metrics).some(meaningful) && device.metrics.connected?.value !== 0 && device.metrics.status?.text?.toLowerCase() !== 'offline';
  }
  snapshot.status = buildStatus(snapshot);
  if (!scoped.some(source => present(hass.states[source.entity.entity_id]))) snapshot.warnings.push('All supported Quatt telemetry is currently unavailable.');
  return snapshot;
}
