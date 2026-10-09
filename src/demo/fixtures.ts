import type { HassEntity, HomeAssistant, RegistryData, RegistryEntity } from '../types';

export type DemoScenario = 'heating' | 'idle' | 'cooling' | 'defrost' | 'offline' | 'partial' | 'missing' | 'many' | 'single';
export interface DemoDiagnostics { requests: string[]; services: string[]; activeSubscriptions: number; }
export interface DemoHass extends HomeAssistant { __demoDiagnostics: DemoDiagnostics; }
export function createDemo(scenario: DemoScenario | string = 'heating', now = new Date()): { hass: DemoHass; registry: RegistryData } {
  const diagnostics: DemoDiagnostics = { requests: [], services: [], activeSubscriptions: 0 };
  const registry: RegistryData = { entities: [], devices: [] }, states: Record<string, HassEntity> = {};
  const installation = 'demo-quatt-installation', hub = 'CIC-DEMO', stamp = now.toISOString();
  const addDevice = (id: string, token: string, name: string) => registry.devices.push({ id, name, manufacturer: 'Quatt', config_entries: [installation], identifiers: [['quatt', token === 'cic' ? hub : `${hub}:${token}`]], ...(token !== 'cic' ? { via_device_id: 'demo-cic' } : {}) });
  addDevice('demo-cic', 'cic', 'Quatt system');
  addDevice('demo-thermostat', 'thermostat', 'Thermostat');
  addDevice('demo-flowmeter', 'flowmeter', 'Flow meter');
  addDevice('demo-hp-1', 'heatpump_1', 'Heat pump 1');
  addDevice('demo-hp-2', 'heatpump_2', 'Heat pump 2');
  addDevice('demo-heat-battery', 'heat_battery', 'Heat Battery');
  addDevice('demo-heat-charger', 'heat_charger', 'Heat Charger');
  const add = (device: string, token: string, key: string, value: string | number, unit = '', domain = 'sensor', attributes: Record<string, unknown> = {}) => {
    const entityId = `${domain}.demo_${token}_${key.replaceAll('.', '_').replace(/[^a-zA-Z0-9_]/g, '_')}`.toLowerCase();
    const entity: RegistryEntity = { entity_id: entityId, platform: 'quatt', unique_id: `${hub}:${token}:${key}`, config_entry_id: installation, device_id: device };
    if (/silentModeStatus|limitedByCop|computedDefrost/.test(key)) entity.translation_key = 'hp_silentModeStatus';
    registry.entities.push(entity);
    states[entityId] = { entity_id: entityId, state: String(value), attributes: { ...(unit ? { unit_of_measurement: unit } : {}), ...attributes }, last_changed: stamp, last_updated: stamp };
    return entityId;
  };
  const idle = scenario === 'idle', cooling = scenario === 'cooling', defrost = scenario === 'defrost';
  add('demo-cic', 'cic', 'computedPower', idle ? 0 : defrost ? 900 : 6240, 'W');
  add('demo-cic', 'cic', 'computedPowerInput', idle ? 18 : 1480, 'W');
  add('demo-cic', 'cic', 'computedQuattCop', idle ? 'unavailable' : defrost ? 0.61 : 4.22, 'CoP');
  add('demo-cic', 'cic', 'computedSystemPower', 7900, 'W'); // Deliberate trap: this is thermal, not electricity.
  add('demo-cic', 'cic', 'qc.computedSupervisoryControlMode', idle ? 'Standby' : cooling ? 'Chill cooling' : 'Heating - heatpump only');
  add('demo-cic', 'cic', 'qc.supervisoryControlMode', idle ? 0 : cooling ? 6 : 2);
  add('demo-cic', 'cic', 'isControllerAlive', 'on', '', 'binary_sensor');
  add('demo-cic', 'cic', 'isHp1Connected', 'on', '', 'binary_sensor');
  add('demo-cic', 'cic', 'isHp2Connected', 'on', '', 'binary_sensor');
  add('demo-thermostat', 'thermostat', 'thermostat.otFtRoomTemperature', cooling ? 24.2 : 20.6, '°C');
  add('demo-thermostat', 'thermostat', 'thermostat.otFtRoomSetpoint', cooling ? 22 : 21, '°C');
  add('demo-thermostat', 'thermostat', 'temperatureOutside', cooling ? 28.4 : 7.8, '°C');
  add('demo-flowmeter', 'flowmeter', 'flowMeter.waterSupplyTemperature', cooling ? 17.2 : 35.2, '°C');
  add('demo-flowmeter', 'flowmeter', 'qc.flowRateFiltered', idle ? 0 : 920, 'L/h');
  for (let i = 1; i <= 2; i++) {
    const device = `demo-hp-${i}`, token = `heatpump_${i}`, prefix = `hp${i}`;
    add(device, token, `${prefix}.power`, idle ? 0 : defrost && i === 1 ? -1500 : 3120, 'W');
    add(device, token, `${prefix}.powerInput`, idle ? 9 : 740, 'W');
    add(device, token, `${prefix}.computedQuattCop`, idle ? 'unavailable' : defrost && i === 1 ? 0 : 4.22, 'CoP');
    add(device, token, `${prefix}.temperatureWaterIn`, cooling ? 19.8 : 30.4, '°C');
    add(device, token, `${prefix}.temperatureWaterOut`, cooling ? 17.2 : 35.2, '°C');
    add(device, token, `${prefix}.temperatureOutside`, cooling ? 28.4 : 7.8, '°C');
    add(device, token, `${prefix}.computedDefrost`, defrost && i === 1 ? 'on' : 'off', '', 'binary_sensor');
    add(device, token, `${prefix}.limitedByCop`, 'off', '', 'binary_sensor');
    add(device, token, `${prefix}.silentModeStatus`, 'off', '', 'binary_sensor');
    add(device, token, `heatPumps.${i - 1}.compressorFrequency`, idle ? 0 : i === 1 ? 46 : 44, 'Hz');
    add(device, token, `heatPumps.${i - 1}.status`, idle ? 'Idle' : defrost && i === 1 ? 'Defrost' : cooling ? 'Cooling' : 'Heating');
  }
  add('demo-heat-battery', 'heat_battery', 'hb.showerMinutes', 43, 'min');
  add('demo-heat-battery', 'heat_battery', 'hb.topTemperature', 58.4, '°C');
  add('demo-heat-battery', 'heat_battery', 'hb.middleTemperature', 49.6, '°C');
  add('demo-heat-battery', 'heat_battery', 'hb.bottomTemperature', 35.1, '°C');
  add('demo-heat-battery', 'heat_battery', 'allEStatus.heatBatteryPercentage', 74, '%');
  add('demo-heat-battery', 'heat_battery', 'allEStatus.heatBatteryStatus', 'Ready');
  add('demo-heat-battery', 'heat_battery', 'allEStatus.isHeatBatteryCharging', 'off', '', 'binary_sensor');
  add('demo-heat-battery', 'heat_battery', 'allEStatus.isDomesticHotWaterOn', 'off', '', 'binary_sensor');
  add('demo-heat-battery', 'heat_battery', 'allElectricBoost.status', 'Inactive');
  add('demo-heat-charger', 'heat_charger', 'hc.electricalPower', 0, 'W');
  add('demo-heat-charger', 'heat_charger', 'hc.heatingSystemPressure', 1.8, 'bar');
  add('demo-heat-charger', 'heat_charger', 'hc.distributionSystemSupplyTemperature', cooling ? 17.2 : 35.2, '°C');
  add('demo-heat-charger', 'heat_charger', 'hc.chHeatExchangerInletTemperature', cooling ? 19.8 : 30.4, '°C');
  for (let i = 1; i <= (scenario === 'many' ? 5 : 2); i++) {
    const id = `demo-chill-${i}`, token = `demo-chill-uuid-${i}`;
    addDevice(id, token, ['Living room', 'Bedroom', 'Office', 'Studio', 'Guest room'][i - 1]);
    // Current upstream deliberately removes response-list indexes from keys.
    add(id, token, 'chills.ambientTemperature', i === 1 ? 24.2 : 23.6, '°C');
    add(id, token, 'chills.status', cooling ? 'On working' : 'Off');
    add(id, token, 'chills.mode', 'Cooling');
    add(id, token, 'chills.fanMode', i === 1 ? 'Normal' : 'Low');
    add(id, token, 'chills.hasWaterTankLevelWarning', 'off', '', 'binary_sensor');
    add(id, token, 'chills', cooling ? 'cool' : 'off', '', 'climate', { temperature: 22, current_temperature: i === 1 ? 24.2 : 23.6, min_temp: 18, max_temp: 28, fan_mode: i === 1 ? 'Normal' : 'Low' });
  }
  if (scenario === 'offline') {
    for (const entity of registry.entities.filter(entity => entity.device_id === 'demo-hp-2')) states[entity.entity_id].state = 'unavailable';
    const hp2Connected = registry.entities.find(entity => entity.unique_id?.endsWith(':isHp2Connected'));
    if (hp2Connected) states[hp2Connected.entity_id].state = 'off';
    const chill = registry.entities.find(entity => entity.device_id === 'demo-chill-2' && entity.unique_id?.endsWith(':chills.status'));
    if (chill) states[chill.entity_id].state = 'Offline';
  }
  if (scenario === 'partial') {
    for (const entity of registry.entities.filter(entity => /:allEStatus.heatBatteryPercentage$|:hb.middleTemperature$|:heatPumps.1.compressorFrequency$/.test(entity.unique_id || ''))) delete states[entity.entity_id];
    const water = registry.entities.find(entity => entity.device_id === 'demo-chill-2' && entity.unique_id?.endsWith('hasWaterTankLevelWarning'));
    if (water) states[water.entity_id].state = 'on';
  }
  if (scenario === 'single') {
    const removed = new Set(['demo-hp-2', 'demo-chill-2']);
    registry.entities = registry.entities.filter(entity => {
      const remove = removed.has(entity.device_id || '') || entity.unique_id?.endsWith(':isHp2Connected');
      if (remove) delete states[entity.entity_id];
      return !remove;
    });
    registry.devices = registry.devices.filter(device => !removed.has(device.id));
  }
  if (scenario === 'missing') { registry.entities = []; registry.devices = []; Object.keys(states).forEach(id => delete states[id]); }
  const hass: DemoHass = {
    states, locale: { language: 'en-GB', number_format: 'language', time_format: '24' }, language: 'en-GB',
    config: { time_zone: 'Europe/Amsterdam', unit_system: { temperature: '°C' } }, __demoDiagnostics: diagnostics,
    entities: Object.fromEntries(registry.entities.map(entity => [entity.entity_id, entity])), devices: Object.fromEntries(registry.devices.map(device => [device.id, device])),
    callWS: async <T>(message: Record<string, unknown>): Promise<T> => {
      diagnostics.requests.push(String(message.type));
      if (message.type === 'config/entity_registry/list') return registry.entities as T;
      if (message.type === 'config/device_registry/list') return registry.devices as T;
      if (String(message.type).includes('service')) diagnostics.services.push(String(message.type));
      throw new Error(`Unexpected demo request: ${String(message.type)}`);
    },
    callApi: async <T>(method: string, path: string): Promise<T> => {
      diagnostics.requests.push(`${method} ${path}`);
      if (method.toUpperCase() !== 'GET' || !path.startsWith('history/period/')) {
        if (path.includes('services')) diagnostics.services.push(path);
        throw new Error('Demo only supports read-only history requests.');
      }
      const url = new URL(path, 'https://example.invalid/api/');
      const start = decodeURIComponent(url.pathname.split('/history/period/')[1]);
      const ids = (url.searchParams.get('filter_entity_id') || '').split(',').filter(Boolean);
      return syntheticHistory(hass, ids, new Date(start), new Date(url.searchParams.get('end_time') || stamp)) as T;
    },
    connection: { subscribeEvents: async (_callback, type) => {
      diagnostics.requests.push(`subscribe:${type}`); diagnostics.activeSubscriptions++;
      let active = true;
      return () => { if (active) { diagnostics.activeSubscriptions--; active = false; } };
    } },
  };
  return { hass, registry };
}

export function syntheticHistory(hass: HomeAssistant, ids: string[], start: Date, end: Date): HassEntity[][] {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return [];
  return ids.filter(id => hass.states[id]).map((id, entityIndex) => {
    const current = hass.states[id], currentNumber = Number(current.state);
    const count = 96, span = end.getTime() - start.getTime();
    return Array.from({ length: count + 1 }, (_, i) => {
      const timestamp = new Date(start.getTime() + span * i / count).toISOString();
      let state = current.state;
      if (Number.isFinite(currentNumber)) {
        const unit = current.attributes.unit_of_measurement;
        const variation = unit === 'W' ? 0.64 + Math.sin(i / 7 + entityIndex * 0.2) * 0.24 : unit === '°C' ? 1 + Math.sin(i / 12) * 0.025 : 1;
        state = String(Math.round(currentNumber * variation * 100) / 100);
      } else if (id.includes('supervisorycontrolmode')) state = i < 18 || i > 68 && i < 76 ? 'Standby' : 'Heating - heatpump only';
      // A deliberate history gap demonstrates missing recorder data, not zero.
      if (i === 43 || i === 44) state = 'unavailable';
      return { entity_id: id, state, last_changed: timestamp, last_updated: timestamp, attributes: current.attributes };
    });
  });
}
