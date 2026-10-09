export type Tone = 'neutral' | 'good' | 'warning' | 'error';
export interface HassEntity {
  entity_id: string; state: string; attributes: Record<string, unknown>;
  last_updated?: string; last_changed?: string;
}
export interface RegistryEntity {
  entity_id: string; platform?: string; unique_id?: string; translation_key?: string;
  config_entry_id?: string; device_id?: string | null; disabled_by?: string | null;
  hidden_by?: string | null; name?: string | null; original_name?: string | null;
}
export interface RegistryDevice {
  id: string; name?: string; name_by_user?: string | null; manufacturer?: string;
  model?: string; config_entries?: string[]; via_device_id?: string;
  identifiers?: [string, string][];
}
export interface RegistryData { entities: RegistryEntity[]; devices: RegistryDevice[]; }
export interface HomeAssistant {
  states: Record<string, HassEntity>;
  entities?: Record<string, RegistryEntity>; devices?: Record<string, RegistryDevice>;
  locale?: { language?: string; number_format?: string; time_format?: string };
  language?: string; config?: { time_zone?: string; currency?: string; unit_system?: { temperature?: string } };
  themes?: { darkMode?: boolean };
  callWS?: <T = unknown>(message: Record<string, unknown>) => Promise<T>;
  callApi?: <T = unknown>(method: string, path: string, parameters?: unknown) => Promise<T>;
  connection?: { subscribeEvents?: (callback: (event: unknown) => void, eventType: string) => Promise<() => void> };
}
export type CardType = 'custom:quatt-overview-card' | 'custom:quatt-history-card' | 'custom:quatt-heat-pump-card' | 'custom:quatt-heat-battery-card' | 'custom:quatt-chill-card' | 'custom:quatt-status-card';
export interface CardConfig {
  type: CardType; title?: string; integration_id?: string; device?: string;
  entities?: Record<string, string>; hours?: number; layout?: 'columns' | 'stacked' | 'compact';
}
export type MetricRole = 'heatPower' | 'electricPower' | 'cop' | 'roomTemperature' | 'targetTemperature' |
  'outdoorTemperature' | 'supplyTemperature' | 'returnTemperature' | 'flowRate' |
  'compressorSpeed' | 'fanSpeed' | 'charge' | 'showerMinutes' | 'topTemperature' |
  'middleTemperature' | 'bottomTemperature' | 'waterPressure' | 'heaterPower' |
  'fanMode' | 'mode' | 'status' | 'connected' | 'defrost' | 'limited' | 'silent' |
  'fault' | 'charging' | 'hotWater' | 'waterWarning' | 'boost';
export interface Reading { value: number | null; text: string | null; unit: string; entityId?: string; }
export type Metrics = Partial<Record<MetricRole, Reading>>;
export type DeviceKind = 'system' | 'thermostat' | 'heat-pump' | 'heat-battery' | 'heat-charger' | 'chill';
export interface QuattDevice { id: string; name: string; kind: DeviceKind; available: boolean; metrics: Metrics; }
export interface StatusRow { key: string; title: string; detail?: string; tone: Tone; icon: string; entityId?: string; }
export interface Snapshot {
  error?: string; warnings: string[]; installationId?: string; installations: { id: string; name: string }[];
  system: Metrics; heatPumps: QuattDevice[]; heatBattery?: QuattDevice; heatCharger?: QuattDevice;
  chills: QuattDevice[]; status: StatusRow[];
}
