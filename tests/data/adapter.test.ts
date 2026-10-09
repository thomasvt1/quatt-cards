import { describe, expect, it } from 'vitest';
import { buildSnapshot, readValue } from '../../src/data';
import { createDemo } from '../../src/demo/fixtures';
import type { CardConfig, HassEntity, HomeAssistant, RegistryData, RegistryEntity } from '../../src/types';

const config: CardConfig = { type: 'custom:quatt-overview-card' };
function find(registry: RegistryData, key: string, device?: string): RegistryEntity {
  const entry = registry.entities.find(entity => entity.unique_id?.endsWith(`:${key}`) && (!device || entity.device_id === device));
  if (!entry) throw new Error(`Fixture source missing: ${key}`);
  return entry;
}
function state(value: string, unit: string): HassEntity { return { entity_id: 'sensor.custom', state: value, attributes: { unit_of_measurement: unit } }; }

describe('Quatt registry data contract', () => {
  it('reads thermal output, electrical input and COP from their distinct exact keys', () => {
    const { hass, registry } = createDemo();
    const snapshot = buildSnapshot(hass, registry, config);
    expect(snapshot.system.heatPower?.value).toBe(6240);
    expect(snapshot.system.electricPower?.value).toBe(1480);
    expect(snapshot.system.cop?.value).toBe(4.22);
    expect(snapshot.system.flowRate?.value).toBeCloseTo(15.3333);
    expect(snapshot.heatPumps).toHaveLength(2);
    expect(snapshot.chills).toHaveLength(2);
    expect(snapshot.heatBattery?.metrics.charge?.value).toBe(74);
    expect(snapshot.heatCharger?.metrics.waterPressure?.value).toBe(1.8);
  });
  it('survives arbitrary entity renames and device display-name changes', () => {
    const { hass, registry } = createDemo();
    const entry = find(registry, 'computedPowerInput'), oldId = entry.entity_id;
    entry.entity_id = 'sensor.custom_warmth';
    hass.states[entry.entity_id] = { ...hass.states[oldId], entity_id: entry.entity_id };
    delete hass.states[oldId];
    const device = registry.devices.find(device => device.id === 'demo-hp-1')!;
    device.name_by_user = 'Roof unit';
    const snapshot = buildSnapshot(hass, registry, config);
    expect(snapshot.system.electricPower).toMatchObject({ value: 1480, entityId: 'sensor.custom_warmth' });
    expect(snapshot.heatPumps[0].name).toBe('Roof unit');
  });
  it('supports documented legacy entry-prefix IDs without entity-ID guessing', () => {
    const { hass, registry } = createDemo();
    registry.entities.forEach(entry => { entry.unique_id = `${entry.config_entry_id}${entry.unique_id?.split(':').at(-1)}`; });
    const snapshot = buildSnapshot(hass, registry, config);
    expect(snapshot.system.electricPower?.value).toBe(1480);
    expect(snapshot.heatPumps[1].metrics.supplyTemperature?.value).toBe(35.2);
    const misleading: RegistryEntity = { entity_id: 'sensor.quatt_power_input', platform: 'quatt', config_entry_id: 'demo-quatt-installation', unique_id: 'anything' };
    registry.entities = [misleading];
    hass.states[misleading.entity_id] = state('9900', 'W');
    expect(buildSnapshot(hass, registry, config).error).toBe('No supported Quatt entities found.');
  });
  it('ignores colliding translation keys and foreign integrations', () => {
    const { hass, registry } = createDemo('defrost');
    const pump = buildSnapshot(hass, registry, config).heatPumps[0];
    expect(pump.metrics.defrost?.value).toBe(1);
    expect(pump.metrics.limited?.value).toBe(0);
    expect(pump.metrics.silent?.value).toBe(0);
    find(registry, 'computedPowerInput').platform = 'other';
    expect(buildSnapshot(hass, registry, config).system.electricPower).toBeUndefined();
  });
  it('never blends multiple installations', () => {
    const { hass, registry } = createDemo();
    const second = createDemo();
    second.registry.entities.forEach(entry => { entry.config_entry_id = 'second-installation'; entry.device_id = `${entry.device_id}-other`; entry.entity_id += '_other'; });
    registry.entities.push(...second.registry.entities);
    const ambiguous = buildSnapshot(hass, registry, config);
    expect(ambiguous.installations).toHaveLength(2);
    expect(ambiguous.error).toContain('Multiple');
    expect(ambiguous.system).toEqual({});
    expect(buildSnapshot(hass, registry, { ...config, integration_id: 'demo-quatt-installation' }).system.heatPower?.value).toBe(6240);
  });
  it('preserves missing/disabled readings and never substitutes system thermal power for electric power', () => {
    const { hass, registry } = createDemo();
    find(registry, 'computedPowerInput').disabled_by = 'user';
    expect(buildSnapshot(hass, registry, config).system.electricPower).toBeUndefined();
    const partial = createDemo('partial');
    const snapshot = buildSnapshot(partial.hass, partial.registry, config);
    expect(snapshot.heatBattery?.metrics.charge?.value).toBeNull();
    expect(snapshot.heatBattery?.metrics.middleTemperature?.value).toBeNull();
    expect(snapshot.heatBattery?.metrics.showerMinutes?.value).toBe(43);
  });
  it('takes Chill target from climate temperature, never minimum/maximum target bounds', () => {
    const { hass, registry } = createDemo();
    const climate = find(registry, 'chills', 'demo-chill-1');
    expect(buildSnapshot(hass, registry, config).chills[0].metrics.targetTemperature?.value).toBe(22);
    delete hass.states[climate.entity_id].attributes.temperature;
    expect(buildSnapshot(hass, registry, config).chills[0].metrics.targetTemperature?.value).toBeNull();
    hass.states[climate.entity_id].attributes.temperature = 71.6;
    hass.config!.unit_system!.temperature = '°F';
    expect(buildSnapshot(hass, registry, config).chills[0].metrics.targetTemperature?.value).toBeCloseTo(22);
  });
  it('keeps Chill identity stable for historical index keys and treats Offline as authoritative', () => {
    const { hass, registry } = createDemo('offline');
    for (const entry of registry.entities.filter(entry => entry.device_id === 'demo-chill-1')) entry.unique_id = entry.unique_id!.replace(':chills', ':chills.8');
    const snapshot = buildSnapshot(hass, registry, config);
    expect(snapshot.chills[0].id).toBe('demo-chill-1');
    expect(snapshot.chills[0].metrics.targetTemperature?.value).toBe(22);
    expect(snapshot.chills[1].metrics.roomTemperature?.value).toBe(23.6);
    expect(snapshot.chills[1].available).toBe(false);
    expect(snapshot.heatPumps[1].available).toBe(false);
  });
  it('scopes overrides to one explicitly selected device', () => {
    const { hass, registry } = createDemo();
    hass.states['sensor.custom'] = state('2.5', 'kW');
    const cardConfig: CardConfig = { type: 'custom:quatt-heat-pump-card', device: 'demo-hp-2', entities: { electricPower: 'sensor.custom' } };
    const snapshot = buildSnapshot(hass, registry, cardConfig);
    expect(snapshot.heatPumps[0].metrics.electricPower?.value).toBe(740);
    expect(snapshot.heatPumps[1].metrics.electricPower?.value).toBe(2500);
    expect(snapshot.system.electricPower?.value).toBe(1480);
    const all = buildSnapshot(hass, registry, { ...cardConfig, device: undefined });
    expect(all.warnings).toContain('Select one device before using entity overrides.');
    expect(all.heatPumps.every(device => device.metrics.electricPower?.value === 740)).toBe(true);
  });
  it('normalizes supported units and retains negative thermal output during defrost', () => {
    expect(readValue('electricPower', state('1.23', 'kW'))).toMatchObject({ value: 1230, unit: 'W' });
    expect(readValue('heatPower', state('-1.5', 'kW')).value).toBe(-1500);
    expect(readValue('roomTemperature', state('68', '°F'))).toMatchObject({ value: 20, unit: '°C' });
    expect(readValue('flowRate', state('900', 'L/h'))).toMatchObject({ value: 15, unit: 'L/min' });
    expect(readValue('waterPressure', state('180', 'kPa'))).toMatchObject({ value: 1.8, unit: 'bar' });
  });
  it('rejects unknown units, invalid percentages, nulls and non-finite measurements', () => {
    expect(readValue('electricPower', state('12', 'A')).value).toBeNull();
    expect(readValue('roomTemperature', state('21', ''))).toMatchObject({ value: null });
    expect(readValue('flowRate', state('20', 'gal/min')).value).toBeNull();
    expect(readValue('charge', state('101', '%')).value).toBeNull();
    expect(readValue('charge', state('74', ''))).toMatchObject({ value: null });
    expect(readValue('electricPower', state('unavailable', 'W')).value).toBeNull();
    expect(readValue('electricPower', state('Infinity', 'W')).value).toBeNull();
    expect(readValue('electricPower')).toMatchObject({ value: null, text: null });
  });
  it('explains known operating modes without assigning meaning to unknown numbers', () => {
    const { hass, registry } = createDemo();
    const textMode = find(registry, 'qc.computedSupervisoryControlMode');
    delete hass.states[textMode.entity_id];
    const mode = find(registry, 'qc.supervisoryControlMode');
    hass.states[mode.entity_id].state = '99';
    expect(buildSnapshot(hass, registry, config).status[0]).toMatchObject({ title: 'Fault · circulation pump', tone: 'error' });
    hass.states[mode.entity_id].state = '123';
    expect(buildSnapshot(hass, registry, config).system.mode?.text).toBe('Mode 123');
  });
  it('prioritizes local mode codes and does not mistake a silent schedule for an active flag', () => {
    const { hass, registry } = createDemo();
    const mode = find(registry, 'qc.supervisoryControlMode');
    const remote = { ...mode, entity_id: 'sensor.remote_mode', unique_id: 'CIC-DEMO:cic:supervisoryControlMode' };
    const silent = { ...mode, entity_id: 'sensor.silent_profile', unique_id: 'CIC-DEMO:cic:silentMode' };
    registry.entities.push(remote, silent);
    hass.states[remote.entity_id] = state('0', ''); hass.states[silent.entity_id] = state('night', '');
    delete hass.states[find(registry, 'qc.computedSupervisoryControlMode').entity_id];
    const snapshot = buildSnapshot(hass, registry, config);
    expect(snapshot.system.mode?.text).toBe('Heating · heat pump');
    expect(snapshot.warnings).toEqual([]);
    expect(snapshot.system.silent).toBeUndefined();
  });
  it('reports defrost, offline and water warning independently', () => {
    const defrost = createDemo('defrost'), partial = createDemo('partial'), offline = createDemo('offline');
    expect(buildSnapshot(defrost.hass, defrost.registry, config).status.some(row => row.title === 'Heat pump 1 is defrosting')).toBe(true);
    expect(buildSnapshot(partial.hass, partial.registry, config).status.some(row => row.title === 'Bedroom water tank warning')).toBe(true);
    expect(buildSnapshot(offline.hass, offline.registry, config).status.filter(row => row.title.endsWith('unavailable'))).toHaveLength(2);
  });
  it('does not invent a healthy system state when status sources are absent', () => {
    const { hass, registry } = createDemo();
    registry.entities = registry.entities.filter(entry => entry.unique_id?.endsWith(':computedPower'));
    const snapshot = buildSnapshot(hass, registry, config);
    expect(snapshot.status).toEqual([expect.objectContaining({ title: 'Status unavailable', tone: 'neutral' })]);
    const missing = createDemo('missing');
    expect(buildSnapshot(missing.hass, missing.registry, config).error).toContain('No supported');
  });
  it('uses remote electrical power only as a fallback within the same heat pump', () => {
    const { hass, registry } = createDemo();
    const local = find(registry, 'hp1.powerInput');
    const remote = { ...local, entity_id: 'sensor.remote_electric', unique_id: 'CIC-DEMO:heatpump_1:heatPumps.0.electricalPower' };
    registry.entities.push(remote); hass.states[remote.entity_id] = { ...state('755', 'W'), entity_id: remote.entity_id };
    expect(buildSnapshot(hass, registry, config).heatPumps[0].metrics.electricPower?.value).toBe(740);
    hass.states[local.entity_id].state = 'unavailable';
    expect(buildSnapshot(hass, registry, config).heatPumps[0].metrics.electricPower?.value).toBe(755);
  });
  it('rejects duplicate same-priority mappings rather than silently picking one', () => {
    const { hass, registry } = createDemo();
    const original = find(registry, 'computedPowerInput'), duplicate = { ...original, entity_id: 'sensor.duplicate' };
    registry.entities.push(duplicate); hass.states[duplicate.entity_id] = state('12', 'W');
    const snapshot = buildSnapshot(hass, registry, config);
    expect(snapshot.system.electricPower?.value).toBeNull();
    expect(snapshot.warnings).toContain('More than one source provides electricPower; select an entity override.');
  });
});

describe('synthetic demo history boundary', () => {
  it('serves only read-only synthetic history with gaps and tracks cleanup', async () => {
    const { hass, registry } = createDemo();
    const id = find(registry, 'computedPower').entity_id;
    const history = await hass.callApi!<HassEntity[][]>('GET', `history/period/2026-10-09T00:00:00Z?filter_entity_id=${id}&end_time=2026-10-09T12:00:00Z&minimal_response&no_attributes`);
    expect(history[0]).toHaveLength(97);
    expect(history[0][43].state).toBe('unavailable');
    await expect(hass.callApi!('POST', 'services/climate/set_temperature')).rejects.toThrow();
    expect(hass.__demoDiagnostics.services).toHaveLength(1);
    const stop = await hass.connection!.subscribeEvents!(() => {}, 'device_registry_updated');
    expect(hass.__demoDiagnostics.activeSubscriptions).toBe(1); stop(); stop();
    expect(hass.__demoDiagnostics.activeSubscriptions).toBe(0);
  });
});
