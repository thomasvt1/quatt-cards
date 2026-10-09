import type { HomeAssistant } from './types';
import { historyMode } from './data/modes';

export interface HistorySource { entityId: string; kind: 'power' | 'cop' | 'mode'; unit?: string; }
export interface HistoryPoint { time: number; value: number | null; }
export interface HistoryResult {
  start: number; end: number; series: Record<string, HistoryPoint[]>; error?: string;
}
type RecordValue = Record<string, unknown>;
type CacheEntry = { created: number; promise: Promise<HistoryResult> };
const cache = new WeakMap<object, Map<string, CacheEntry>>();
const isRecord = (value: unknown): value is RecordValue => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function timestamp(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? (Math.abs(value) < 1e11 ? value * 1000 : value) : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function reading(state: unknown, source: HistorySource, attributes?: unknown): number | null {
  if (source.kind === 'mode') return historyMode(state);
  if (typeof state !== 'string' && typeof state !== 'number') return null;
  if (typeof state === 'string' && !state.trim()) return null;
  const value = Number(state);
  if (!Number.isFinite(value)) return null;
  if (source.kind === 'cop') return value;
  const unit = isRecord(attributes) && typeof attributes.unit_of_measurement === 'string'
    ? attributes.unit_of_measurement : source.unit;
  return unit === 'W' ? value / 1000 : unit === 'kW' ? value : null;
}

/** Recorder states remain in effect until the next change; unavailable states break the line. */
export function normalizeHistory(data: unknown, sources: HistorySource[], start: number, end: number): HistoryResult {
  const series: Record<string, HistoryPoint[]> = Object.fromEntries(sources.map(source => [source.entityId, []]));
  const result: HistoryResult = { start, end, series };
  if (!Array.isArray(data)) return { ...result, error: 'Home Assistant returned an unsupported history response.' };
  const definitions = new Map(sources.map(source => [source.entityId, source]));
  for (const group of data) {
    if (!Array.isArray(group)) continue;
    // In a minimal REST response, the initial full state identifies subsequent compressed states.
    let entityId: string | undefined;
    let previousAttributes: unknown;
    for (const record of group) {
      if (!isRecord(record)) continue;
      if (typeof record.entity_id === 'string') {
        if (record.entity_id !== entityId) previousAttributes = undefined;
        entityId = record.entity_id;
      }
      const source = entityId ? definitions.get(entityId) : undefined;
      if (!source) continue;
      const time = timestamp(record.last_changed ?? record.last_updated);
      if (time == null || time > end) continue;
      if (isRecord(record.attributes)) previousAttributes = record.attributes;
      series[source.entityId].push({ time, value: reading(record.state, source, previousAttributes) });
    }
  }
  for (const [entityId, points] of Object.entries(series)) {
    const ordered = points.sort((a, b) => a.time - b.time);
    const unique: HistoryPoint[] = [];
    for (const point of ordered) {
      if (unique.at(-1)?.time === point.time) unique[unique.length - 1] = point;
      else unique.push(point);
    }
    let boundary: HistoryPoint | undefined;
    for (const point of unique) { if (point.time > start) break; boundary = point; }
    const visible = unique.filter(point => point.time > start);
    if (boundary) visible.unshift({ time: start, value: boundary.value });
    const last = visible.at(-1);
    if (last && last.time < end) visible.push({ time: end, value: last.value });
    series[entityId] = visible;
  }
  return result;
}

/** Sharing by connection and minute avoids duplicate recorder requests from multiple cards. */
export function loadHistory(hass: HomeAssistant, sources: HistorySource[], hours = 24, end = Date.now()): Promise<HistoryResult> {
  const duration = Math.min(48, Math.max(1, Number.isFinite(hours) ? hours : 24));
  const start = end - duration * 3_600_000;
  const uniqueSources = [...new Map(sources.map(source => [source.entityId, source])).values()].sort((a, b) => a.entityId.localeCompare(b.entityId));
  if (!uniqueSources.length) return Promise.resolve({ start, end, series: {} });
  if (!hass.callApi) return Promise.resolve({ start, end, series: {}, error: 'History is unavailable in this preview. Open the card in Home Assistant to read recorded measurements.' });
  const connection = hass.connection || hass.callApi;
  let entries = cache.get(connection);
  if (!entries) { entries = new Map(); cache.set(connection, entries); }
  const now = Date.now();
  for (const [key, entry] of entries) if (now - entry.created >= 60_000) entries.delete(key);
  const key = JSON.stringify([uniqueSources, duration, Math.floor(end / 60_000)]);
  const existing = entries.get(key);
  if (existing) return existing.promise;
  const path = `history/period/${new Date(start).toISOString()}?filter_entity_id=${encodeURIComponent(uniqueSources.map(source => source.entityId).join(','))}&end_time=${encodeURIComponent(new Date(end).toISOString())}&minimal_response&no_attributes`;
  const promise = Promise.resolve().then(() => hass.callApi!<unknown>('GET', path)).then(
    data => normalizeHistory(data, uniqueSources, start, end),
    () => ({ start, end, series: {}, error: 'Could not read recorded history. Check that Recorder includes the selected Quatt sensors.' }),
  );
  entries.set(key, { created: now, promise });
  // Bound retained results even if many cards request different ranges in one minute.
  if (entries.size > 12) entries.delete(entries.keys().next().value!);
  return promise;
}

export function historyValueAt(points: HistoryPoint[], time: number): number | null {
  let low = 0, high = points.length - 1, found = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].time <= time) { found = middle; low = middle + 1; }
    else high = middle - 1;
  }
  return found < 0 ? null : points[found].value;
}
