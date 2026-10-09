# Quatt data contract

The adapter follows [marcoboers/home-assistant-quatt](https://github.com/marcoboers/home-assistant-quatt/tree/ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf/custom_components/quatt) at commit `ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf`. This is a frontend consumer of the integration's reported values. It does not contact Quatt's API or calculate a heating forecast.

## Discovery and selection

Entities must belong to registry platform `quatt`. An installation is scoped by `config_entry_id`; a card with multiple installations requires an explicit selection. The adapter matches exact keys in current unique IDs (`hub:device:key`) or the documented legacy ID (`config_entry_id` immediately followed by the sensor key). User-facing entity IDs and device names are never guessed. Disabled entities are skipped. Device cards follow registry device IDs, so renamed entities and devices keep working.

Chill devices use the registry device ID and the UUID component of upstream identity. Both current index-free `chills.key` and historical `chills.<index>.key` keys are recognized. An index does not identify a room. Unknown or unsupported keys are omitted. A duplicated mapping at equal priority becomes unavailable with a warning instead of silently selecting a reading.

Upstream currently assigns the translation key `hp_silentModeStatus` to the silent-mode, COP-limit, and defrost binary sensors. Consequently, translation keys alone cannot identify those metrics.

## Measurements

| Display role | Exact upstream source key | Normalized unit |
| --- | --- | --- |
| Heat-pump system output | `computedPower` | W |
| Heat-pump system electrical input | `computedPowerInput` | W |
| Heat-pump system COP | `computedQuattCop` | ratio |
| Room / target temperature | `thermostat.otFtRoomTemperature` / `thermostat.otFtRoomSetpoint` | °C |
| Outdoor temperature | `temperatureOutside` on thermostat | °C |
| Water supply / flow | `flowMeter.waterSupplyTemperature` / `qc.flowRateFiltered` | °C / L/min |
| Individual pump output / input | `hp1.power` / `hp1.powerInput` (also `hp2`) | W |
| Individual pump COP | `hp1.computedQuattCop` (also `hp2`) | ratio |
| Individual pump return / supply | `hp1.temperatureWaterIn` / `hp1.temperatureWaterOut` (also `hp2`) | °C |
| Individual pump outdoor temperature | `hp1.temperatureOutside` (also `hp2`) | °C |
| Compressor speed | `heatPumps.0.compressorFrequency` (also index 1) | Hz |
| Heat Battery level | `allEStatus.heatBatteryPercentage` | % |
| Shower time | `hb.showerMinutes` | min |
| Tank temperatures | `hb.topTemperature`, `hb.middleTemperature`, `hb.bottomTemperature` | °C |
| Heat Charger input | `hc.electricalPower` | W |
| Heating pressure | `hc.heatingSystemPressure` | bar |
| Charger supply / inlet | `hc.distributionSystemSupplyTemperature` / `hc.chHeatExchangerInletTemperature` | °C |
| Chill room temperature | `chills.ambientTemperature` | °C |
| Chill target | `temperature` attribute of its `chills` climate entity | °C |

The remote `heatPumps.0.electricalPower` (and index 1) is used only if that pump's local electrical input is unavailable. `computedSystemPower` is thermal output including other sources; it is **never** used as electrical input. The collection does not sum overlapping system and device measurements or derive tank storage in kWh.

W and kW normalize to W. °C and °F normalize to °C. Flow values in L/h divide by 60; L/min values are retained. Pressure supports bar, kPa, and Pa. COP permits the integration's `CoP` unit or no unit. Unknown units remain unavailable. Chill climate units come from `temperature_unit` or HA's `config.unit_system.temperature`; minimum and maximum target bounds are not target readings.

Missing or non-finite values stay missing. Zero is a valid reading. Negative thermal output is retained, including during defrost. Reported percentages outside 0–100 are unavailable rather than clamped or inferred from temperatures.

## Status and availability

The collection displays reported supervisory mode (`qc.computedSupervisoryControlMode`, or a known code from `qc.supervisoryControlMode` / `supervisoryControlMode`), controller connectivity, per-pump connectivity, defrost, COP limits, silent mode, Heat Battery charging and domestic hot water, and Chill tank warnings. Known numeric supervisory modes have explicit labels; unknown numeric modes remain `Mode <number>`.

The local supervisory code takes precedence over the remote code when the computed description is unavailable. Pump `silentModeStatus` sensors are active flags; the remote system `silentMode` is a profile such as `night`, so it is not interpreted as “silent mode active.”

For Chill, `status = Offline` overrides cached numeric temperatures. `Off` means an operating setting and does not imply loss of connectivity. A device with no supported available readings is unavailable. A lack of fault sensors does not produce an invented “no alarms” claim. Status timestamps are not inferred from `last_updated`, because a stable reading can legitimately retain an older state-change time.

## Entity overrides and history

`entities` maps metric-role keys to explicit entity IDs. Overview, History, and Status overrides apply to system metrics. Heat Battery overrides apply to the selected heat battery. Pump and Chill overrides apply to one selected device; with multiple devices and no selection they are ignored with a warning. Overrides follow the same unit validation as discovered readings.

History uses Home Assistant's read-only recorder endpoint. The public demo supplies synthetic history at the same interface, including explicit unavailable gaps. Its fixture rejects unsupported requests and records any attempted service calls for tests. No raw household diagnostics or identifiers are included in public fixtures.

## Validation

Adapter tests cover exact keys, renamed entities, legacy IDs, colliding translation keys, multiple installations, unit conversion, negative thermal power, unavailable and disabled telemetry, unsupported units, range validation, selected-device overrides, climate temperature attributes, Chill identity and offline states, status explanations, priority fallback, and duplicated source mappings. Synthetic fixtures include heating, idle, cooling, defrost, offline, partial telemetry, no installation, and five Chill devices for wrapping checks.

## Chill control-panel targets

Since v0.2.0, an unambiguous enabled Quatt climate source with exact `chills` or legacy `chills.<index>` identity is retained per installation and registry device. Reading overrides cannot retarget controls. Opening Controls emits `hass-more-info` for that climate entity; the card makes no service calls. The native panel handles target temperature, heat/cool/off mode, fan speed, permissions, and errors. Offline status or missing/unavailable climate state disables the button.

## Displayed fields and Overview storage

`fields` is a presentation-only boolean map validated against a per-card catalog. Omitted keys preserve defaults. Overview storage reads `snapshot.heatBattery.metrics` and `snapshot.heatCharger.metrics`, not the heat-pump system metrics. It does not add charger power to system electrical input. No hardware or incomplete charge value is replaced with synthetic data. History requests include only selected series.
