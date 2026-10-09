# Chill status contract

Audited on 9 October 2026. This inventory is independent of the runtime classifier and is exercised through registry discovery, reading normalization, the device ring, native-control availability and the Status card.

## Sources and limits

- The [upstream enum and formatter](https://github.com/marcoboers/home-assistant-quatt/blob/ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf/custom_components/quatt/entity.py#L100) declare four statuses, but deliberately pass through other API strings after converting underscores to spaces. The [climate implementation](https://github.com/marcoboers/home-assistant-quatt/blob/ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf/custom_components/quatt/entity_climate.py) also publishes optimistic Cooling/Heating/Off states after a command. These are reports consumed by the cards, not commands issued by them.
- [Upstream Chill discussion](https://github.com/marcoboers/home-assistant-quatt/issues/311) documents disconnected and heating-system-conflict warnings. The linked [Homebridge API schema](https://github.com/abko/homebridge-quatt-chill/blob/66cd801bfe0a6a44d5dd685f115ed20bfedf0439/src/quatt/types.ts#L14) treats status as a free-form diagnostic string, not a closed enum.
- Read-only checks of retained HA status history additionally confirmed working, target reached and the heating-system-conflict warning. No household identifiers, timestamps or raw history are included here.

There is no exhaustive published Quatt API status schema in these sources. This covers **every documented or observed status found in the audit**, plus existing compatibility aliases and defensive fallback categories. It cannot promise semantic knowledge of future undocumented firmware strings. Unknown values stay neutral and retain their reported text; selected mode alone never proves activity.

## Known states

Both raw API spelling and sentence-case HA spelling are supported, with case/whitespace normalization.

| Raw status | Classification | Combined ring badge | Source |
|---|---|---|---|
| `OFF` | Off | Gray power | Upstream enum |
| `OFFLINE` | Unavailable | Warning; controls disabled | Upstream enum |
| `COOLING` | Active cooling | Blue snowflake | Upstream enum |
| `HEATING` | Active heating | Red heat waves | Upstream enum |
| `ON_WORKING` | Active; uses reported mode | Blue/red; neutral tick if mode missing | Observed API report |
| `ON_TARGET_TEMPERATURE_REACHED` | Idle | Gray power | Observed API report |
| `WARNING_DISCONNECTED` | Unavailable | Warning; controls disabled | Upstream discussion |
| `WARNING_NOT_COOLING_HEATING_SYSTEM_IS_HEATING` | Warning; no activity inferred | Neutral ring, amber warning | Upstream discussion and observed report |

Existing compatibility aliases: `ON` and `RUNNING` use the selected mode while active; `IDLE`, `STANDBY`, `ON_IDLE` and `ON_STANDBY` use gray power. These aliases are not claims of additional observed API states.

## Precedence and fallbacks

1. Missing device telemetry or an explicit disconnected/offline report overrides cached active readings. Disconnection disables the native-control launcher and is reflected in Status.
2. Explicit `WARNING`, `ERROR` and `FAULT` diagnostic families use an amber warning badge and preserve the reason. Only exact disconnected reports imply lost connectivity. Diagnostic text mentioning cooling/heating does not make the unit active.
3. Off and idle override the selected mode. Explicit Cooling/Heating status overrides a conflicting selected mode.
4. Working/On/Running uses Cooling/Heating (or Cool/Heat); absent/unknown mode stays neutral with a tick.
5. Missing HA values (`unknown`, `unavailable`, `none`, `null`, empty) and unfamiliar operating reports remain unknown. New `ON_*` values are not blindly treated as working.

Status and mode field toggles retain their established behavior: mode-only displays the selected mode; status-only displays a neutral status badge; both hidden removes the badge. The reported diagnostic stays in accessible descriptions and tooltips whenever status is shown.

## Regression gates

- A table of all 14 known/compatible statuses, independent of runtime implementation, runs through the actual HA adapter across three spellings, eight mode inputs and unavailable telemetry.
- Browser checks exercise every listed state in raw and display spellings with both modes, live updates, accessible descriptions, control availability and diagnostic visibility in Status. Existing tests cover fields, one/multiple units, themes and sizes.
- Additional cases exercise future warning/error/fault reasons, prefix near-misses, missing values, and working → target reached → working transitions.
- CI enforces **100% lines, statements, functions and branches in the Chill state interpreter**, in addition to the existing 81% per-card and aggregate floors. Coverage supplements this explicit contract; it cannot prove that an external free-form API has no new values.

When a new state is reported, establish its meaning from a source, add it to the independent inventory with provenance, then update the classifier and both adapter/browser tests. Do not replace unknown reports with guessed activity.
