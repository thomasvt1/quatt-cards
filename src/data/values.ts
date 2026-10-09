import type { HassEntity, MetricRole, Reading } from '../types';

const power = new Set<MetricRole>(['heatPower', 'electricPower', 'heaterPower']);
const temperature = new Set<MetricRole>(['roomTemperature', 'targetTemperature', 'outdoorTemperature', 'supplyTemperature', 'returnTemperature', 'topTemperature', 'middleTemperature', 'bottomTemperature']);
const flags = new Set<MetricRole>(['connected', 'defrost', 'limited', 'silent', 'fault', 'charging', 'hotWater', 'waterWarning']);
const textRoles = new Set<MetricRole>(['mode', 'status', 'fanMode', 'boost']);
export function missing(entityId?: string, unit = ''): Reading { return { value: null, text: null, unit, entityId }; }
export function present(state: HassEntity | undefined): boolean {
  return !!state && !['unknown', 'unavailable', 'none', 'null', ''].includes(state.state.trim().toLowerCase());
}
export function readValue(role: MetricRole, state?: HassEntity, attribute?: string): Reading {
  const rawUnit = typeof state?.attributes.unit_of_measurement === 'string' ? state.attributes.unit_of_measurement : '';
  const unit = rawUnit.trim();
  if (!state || !present(state)) return missing(state?.entity_id, unit);
  const raw = attribute ? state.attributes[attribute] : state.state;
  if (raw === undefined || raw === null || String(raw).trim() === '') return missing(state.entity_id, unit);
  const text = String(raw).trim();
  if (textRoles.has(role)) return { value: null, text, unit: '', entityId: state.entity_id };
  if (flags.has(role)) {
    const value = /^(on|true|connected|online|1)$/i.test(text) ? 1 : /^(off|false|disconnected|offline|0)$/i.test(text) ? 0 : null;
    return { value, text: value === null ? null : text, unit: '', entityId: state.entity_id };
  }
  const number = Number(text);
  if (!Number.isFinite(number)) return missing(state.entity_id, unit);
  let value = number, normalized = unit;
  if (power.has(role)) {
    if (unit === 'kW') value *= 1000;
    else if (unit !== 'W') return missing(state.entity_id, unit);
    normalized = 'W';
  } else if (temperature.has(role)) {
    // Climate temperatures use HA's configured unit. It is supplied explicitly
    // by the caller, never inferred from a target's numeric magnitude.
    if (unit === '°F' || unit === 'F') value = (number - 32) * 5 / 9;
    else if (unit !== '°C' && unit !== 'C') return missing(state.entity_id, unit);
    normalized = '°C';
  } else if (role === 'flowRate') {
    if (['L/h', 'l/h'].includes(unit)) value /= 60;
    else if (!['L/min', 'l/min'].includes(unit)) return missing(state.entity_id, unit);
    normalized = 'L/min';
  } else if (role === 'charge') {
    if (unit !== '%' || value < 0 || value > 100) return missing(state.entity_id, unit);
  } else if (role === 'waterPressure') {
    if (unit === 'kPa') value /= 100;
    else if (unit === 'Pa') value /= 100000;
    else if (unit !== 'bar') return missing(state.entity_id, unit);
    normalized = 'bar';
  } else if (role === 'cop') {
    if (!['', 'CoP', 'COP'].includes(unit) || value < 0) return missing(state.entity_id, unit);
    normalized = '';
  } else if (role === 'showerMinutes') {
    if (unit !== 'min' || value < 0) return missing(state.entity_id, unit);
  } else if (role === 'compressorSpeed') {
    if (unit !== 'Hz' || value < 0) return missing(state.entity_id, unit);
  } else if (role === 'fanSpeed') {
    if (!['rpm', 'RPM', '%'].includes(unit) || value < 0) return missing(state.entity_id, unit);
  }
  return { value, text: null, unit: normalized, entityId: state.entity_id };
}

const modes: Record<string, string> = {
  '0': 'Standby', '1': 'Standby · heating', '2': 'Heating · heat pump',
  '3': 'Heating · heat pump + boiler', '4': 'Heating · boiler',
  '5': 'Chill circulation', '6': 'Chill cooling', '95': 'Pump protection',
  '96': 'Anti-freeze protection · boiler', '97': 'Anti-freeze protection · pre-pump',
  '98': 'Anti-freeze protection · circulation', '99': 'Fault · circulation pump',
  '400': 'Invalid configuration',
};
export function supervisoryMode(reading: Reading): Reading {
  if (!reading.text) return reading;
  return { ...reading, text: modes[reading.text] || (/^\d+$/.test(reading.text) ? `Mode ${reading.text}` : reading.text) };
}
