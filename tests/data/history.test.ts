import { describe, expect, it, vi } from 'vitest';
import { historyValueAt, loadHistory, normalizeHistory, type HistorySource } from '../../src/history';
import type { HomeAssistant } from '../../src/types';

const source: HistorySource = { entityId: 'sensor.heat', kind: 'power', unit: 'W' };
const start = Date.parse('2026-10-09T10:00:00Z'), end = Date.parse('2026-10-09T11:00:00Z');
const record = (state: string, time: string) => ({ state, last_changed: time });

describe('recorder history normalization', () => {
  it('reads minimal records, converts W to kW and keeps the recorder boundary state', () => {
    const result = normalizeHistory([[{ entity_id: source.entityId, ...record('2400', '2026-10-09T09:00:00Z') }, record('3600', '2026-10-09T10:30:00Z')]], [source], start, end);
    expect(result.series[source.entityId]).toEqual([{ time: start, value: 2.4 }, { time: start + 1_800_000, value: 3.6 }, { time: end, value: 3.6 }]);
  });
  it('preserves unavailable gaps and does not backfill late history', () => {
    const points = normalizeHistory([[{ entity_id: source.entityId, ...record('1000', '2026-10-09T10:10:00Z') }, record('unavailable', '2026-10-09T10:20:00Z'), record('2000', '2026-10-09T10:40:00Z')]], [source], start, end).series[source.entityId];
    expect(historyValueAt(points, start)).toBeNull();
    expect(historyValueAt(points, start + 25 * 60_000)).toBeNull();
    expect(historyValueAt(points, start + 15 * 60_000)).toBe(1);
    expect(historyValueAt(points, end)).toBe(2);
  });
  it('keeps kW values, raw COP, null unknown units, and excludes unrelated entities', () => {
    const sources: HistorySource[] = [{ ...source, unit: 'kW' }, { entityId: 'sensor.cop', kind: 'cop' }, { entityId: 'sensor.unknown', kind: 'power' }];
    const data = sources.map(s => [{ entity_id: s.entityId, ...record('3.6', '2026-10-09T10:00:00Z') }]);
    data.push([{ entity_id: 'sensor.other', ...record('99', '2026-10-09T10:00:00Z') }]);
    const result = normalizeHistory(data, sources, start, end);
    expect(result.series['sensor.heat'][0].value).toBe(3.6);
    expect(result.series['sensor.cop'][0].value).toBe(3.6);
    expect(result.series['sensor.unknown'][0].value).toBeNull();
    expect(result.series['sensor.other']).toBeUndefined();
  });
  it('uses recorded units if supplied and sorts/deduplicates timestamps', () => {
    const points = normalizeHistory([[{ entity_id: source.entityId, attributes: { unit_of_measurement: 'kW' }, ...record('2', '2026-10-09T10:30:00Z') }, record('1', '2026-10-09T10:00:00Z'), record('3', '2026-10-09T10:30:00Z')]], [source], start, end).series[source.entityId];
    expect(points.map(p => p.value)).toEqual([1, 3, 3]);
  });
  it('treats repeated DST wall hours as distinct absolute instants', () => {
    const a = Date.parse('2026-10-25T02:00:00+02:00'), b = Date.parse('2026-10-25T02:00:00+01:00');
    const points = normalizeHistory([[{ entity_id: source.entityId, state: '1000', last_changed: a / 1000 }, { state: '2000', last_changed: b }]], [source], a, b).series[source.entityId];
    expect(points).toEqual([{ time: a, value: 1 }, { time: b, value: 2 }]);
    expect(b - a).toBe(3_600_000);
  });
  it('handles absent, malformed, partial and non-finite records without assigning the wrong entity', () => {
    const data = [[record('9000', '2026-10-09T10:00:00Z')], [{ entity_id: source.entityId, state: '', last_changed: 'bad' }, record('NaN', '2026-10-09T10:00:00Z'), { state: 1000, last_updated: '2026-10-09T10:30:00Z' }, record('5000', '2026-10-09T12:00:00Z')]];
    expect(normalizeHistory(data, [source], start, end).series[source.entityId].map(p => p.value)).toEqual([null, 1, 1]);
    expect(normalizeHistory([], [source], start, end).series[source.entityId]).toEqual([]);
    expect(normalizeHistory({}, [source], start, end).error).toContain('unsupported');
  });
});

describe('shared recorder requests', () => {
  it('deduplicates concurrent requests across cards on one connection and sorts IDs', async () => {
    const callApi = vi.fn().mockResolvedValue([]);
    const connection = {};
    const hass: HomeAssistant = { states: {}, connection, callApi };
    const second: HistorySource = { entityId: 'sensor.cop', kind: 'cop' };
    const first = loadHistory(hass, [source, second], 6, end);
    const parallel = loadHistory({ ...hass }, [second, source], 6, end + 10_000);
    expect(first).toBe(parallel);
    await first;
    expect(callApi).toHaveBeenCalledTimes(1);
    expect(callApi.mock.calls[0][0]).toBe('GET');
    expect(callApi.mock.calls[0][1]).toContain('filter_entity_id=sensor.cop%2Csensor.heat');
  });
  it('does not share across connections, unit changes, or ranges', async () => {
    const callApi = vi.fn().mockResolvedValue([]);
    const hass: HomeAssistant = { states: {}, connection: {}, callApi };
    await loadHistory(hass, [source], 6, end);
    await loadHistory(hass, [source], 12, end);
    await loadHistory(hass, [{ ...source, unit: 'kW' }], 6, end);
    await loadHistory({ ...hass, connection: {} }, [source], 6, end);
    expect(callApi).toHaveBeenCalledTimes(4);
  });
  it('expires cached results after sixty seconds', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(end);
    try {
      const callApi = vi.fn().mockResolvedValue([]);
      const hass: HomeAssistant = { states: {}, connection: {}, callApi };
      await loadHistory(hass, [source], 6, end);
      await loadHistory(hass, [source], 6, end);
      now.mockReturnValue(end + 60_000);
      await loadHistory(hass, [source], 6, end);
      expect(callApi).toHaveBeenCalledTimes(2);
    } finally { now.mockRestore(); }
  });
  it('reports access failures and missing API without failing the card', async () => {
    const hass: HomeAssistant = { states: {}, callApi: vi.fn().mockRejectedValue(new Error('denied')) };
    expect((await loadHistory(hass, [source], 24, end)).error).toContain('Could not read');
    expect((await loadHistory({ states: {} }, [source], 24, end)).error).toContain('unavailable');
    expect((await loadHistory(hass, [], 24, end)).error).toBeUndefined();
  });
});
