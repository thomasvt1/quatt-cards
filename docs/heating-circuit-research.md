# Heating circuit card: topology and telemetry research

Research date: 2026-10-09. Scope: first-party physical/functional topology only; no implementation or installation changes. Includes an integration-telemetry review below.

## Findings and confidence

- **Duo outdoor units are in series, not parallel — high confidence.** Quatt explicitly describes two Hybrid units connected in series. It can run one or both compressors; that does not imply a different pipe topology. Draw a chain for two outdoor units and collapse that chain to one node for Single. [Quatt: Wat is Quatt Hybrid Duo?](https://support.quatt.io/nl/articles/10319051-wat-is-quatt-hybrid-duo) (6 May 2025).
- **HeatCharger is a reversible water-to-water heat pump, not simply a storage tank — high confidence.** The manual describes charging HeatBattery using heat from the central-heating system and reversing the process to support central heating. During discharge it returns cooler water to the battery bottom. [All-Electric user manual](https://25848718.fs1.hubspotusercontent-eu1.net/hubfs/25848718/Manuals/Gebruikershandleiding%20Quatt%20All-Electric.pdf), printed pp. 9, 25–26, V2 October 2025.
- **HeatBattery stores domestic hot water — high confidence.** It supplies taps; mains cold water replaces water drawn. Its hot water is not the home's circulating radiator water. The manual gives separate heating-system and domestic-water draining procedures. [Same manual](https://25848718.fs1.hubspotusercontent-eu1.net/hubfs/25848718/Manuals/Gebruikershandleiding%20Quatt%20All-Electric.pdf), pp. 24, 27–28. The specification explicitly labels the tank water as drinking water. [Official technical specifications](https://25848718.fs1.hubspotusercontent-eu1.net/hubfs/25848718/Tech%20Specs/Quatt%20All-Electric%20Technische%20specificaties.pdf), p. 3.
- **The HeatCharger bridges the two water circuits through heat transfer — high confidence in separation, not exact internal routing.** Treat central-heating water, domestic water, and internal refrigerant as distinct media. The reversible water/water product description and separate water systems support this abstraction; the public sources reviewed do not identify every internal exchanger/valve connection. The manual specifies R290 refrigerant, p. 11. Do not draw an invented coil inside HeatBattery or suggest radiator water flows into drinking water.
- **The tank is not solely for showers — high confidence.** Quatt says its stored heat can also assist space heating via HeatCharger. [Quatt All-Electric product page](https://www.quatt.io/all-electric), “Het All-Electric systeem.” This is a two-way thermal connection, not a permanent one-way charging arrow.
- **Chill heat recovery is supported — high confidence in function.** Quatt describes transferring heat removed by Chill into HeatBattery when it has spare capacity. [Quatt: warm-water regulation](https://support.quatt.io/nl/articles/12165871-hoe-werkt-de-regeling-bij-all-electric-voor-warm-water) (7 September 2026). This is a potential later graph branch, not evidence of instantaneous flow.

## Recommended graph abstraction for option A

Use two visibly separate lanes:

1. **Closed heating-water circuit:** outdoor unit 1 → optional outdoor unit 2 (series) → heating system / home → return. Connect the HeatCharger's heating side to this circuit.
2. **Domestic-water / storage side:** HeatCharger ⇄ HeatBattery, with cold mains entering the domestic side and a hot-water outlet going to taps/shower. The double arrow means reversible **thermal transfer**, not a claim that a water pump reverses direction.

Place HeatCharger visually between these lanes as the heat-transfer interface. Keep pipe/flow strokes distinct from a thermal-transfer connector. This is a functional schematic; the precise HeatCharger tie-in location and internal bypass/valve routing still need an installation schematic before drawing an installer-style diagram with exact ports. In particular, do not present an unverified parallel branch or inline placement as confirmed plumbing.

Show two outdoor units as serial nodes only when two exist; a Single layout simply omits unit 2 and shortens the path, with no vacant slot. Field visibility should affect reading labels only, not change hydraulic connections.

## Constraints for a future card

- Physical connection does not prove active flow. Only animate a direction when suitable reported telemetry supports it.
- Tank charge falling does not distinguish domestic draw, heat assistance, or standing loss. Do not infer a shower flow or space-heating direction from that alone.
- Keep outdoor heat production, HeatCharger transfer, and tank storage distinct; summing the first two as net heat production may double-count transferred energy.
- Temperatures belong to the sensor's actual location; an outdoor outlet is not automatically the temperature delivered to emitters after HeatCharger exchange.
- Generic “supply”/“return” words are insufficient for tank-side ports without a known mapping.

## Evidence inspection and limits

The official All-Electric page's “Bekijk alle technische details” link points to the 3-page technical specification above. All pages were downloaded and visually inspected; they contain product photos/specification tables, not a complete hydraulic schematic. Manual printed pp. 9 and 27 were also visually inspected after web screenshot output failed to expose image pixels. The public user manual and official support articles establish functions well, but an exact port-level hydraulic diagram was not found. Third-party forums appeared in search but were not relied upon.

The technical specification and October 2025 manual list temperature limits that differ from the current marketing page's “up to 65°C”; the graph should use reported values and not hard-code a full-charge temperature from either document.

## Card requirements accepted on 9 October 2026

Research only. No card implementation, release or HACS change is authorized for this step.

- Preserve approved concept A's compact composition; correct its conceptual hydraulic routing using the evidence below.
- Support one or two discovered outdoor units. One unit must occupy the available equipment area without a phantom second unit, empty branch or unused column. Missing telemetry on an installed second unit is different from a single-unit installation: keep known installed equipment with unavailable readings rather than silently removing it.
- Provide Displayed fields like existing cards, with a validated YAML `fields` map, visual checkboxes and reset to defaults. Field visibility must not rewrite the plumbing topology.
- Candidate field groups: outdoor-pump input/output/COP and inlet/outlet temperatures; circuit supply/return/flow/delta; HeatCharger input, inlet, distribution supply, pressure and All-Electric mode; tank charge, top/middle/bottom temperatures, shower minutes, charging and hot-water flags. Keep labels and readings omitted/unavailable when source data is absent.

## Home Assistant telemetry: verified against upstream source

Inspected upstream commit `ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf` on 9 October 2026. This is also the commit pinned by the existing Quatt Cards data contract. The findings below describe integration capabilities, not a fresh inventory of private household entities.

| Location / value | Upstream source keys | Implication for the graph |
| --- | --- | --- |
| Outdoor pump inlet/outlet, heat and electrical input | `hp1.temperatureWaterIn`, `hp1.temperatureWaterOut`, `hp1.power`, `hp1.powerInput`; corresponding `hp2` keys | Attach individual readings to the appropriate physical unit. |
| HeatCharger | `hc.electricalPower`, `hc.chHeatExchangerInletTemperature`, `hc.distributionSystemSupplyTemperature`, `hc.heatingSystemPressure` | These are explicit electrical input, exchanger inlet temperature, house-distribution supply temperature and heating pressure. Do not rename the exchanger inlet as house return without confirming the diagram's measurement location. |
| HeatBattery | `hb.topTemperature`, `hb.middleTemperature`, `hb.bottomTemperature`, `hb.showerMinutes`; remote `allEStatus.heatBatteryPercentage` and `.heatBatteryStatus` | Tank temperature and storage telemetry, not direct measured heat-flow power. |
| Storage/hot water flags | `allEStatus.isHeatBatteryCharging`, `allEStatus.isDomesticHotWaterOn` | Require optional remote mobile API. Flags can explain reported activity; absence is not false. |
| All-Electric operating state | `qcAllE.allESupervisoryControlMode`, `qcAllE.computedAllESupervisoryControlMode` | Dedicated schema, distinct from ordinary `qc.supervisoryControlMode`. Use to distinguish charging/discharging, standby, pumping, backup and Chill-related charging. |
| Heat-pump group | `computedPower`, `computedPowerInput`, `computedQuattCop`, `computedWaterDelta`; `qc.flowRateFiltered` | These have defined scopes; do not relabel pump COP as whole-installation COP. |

Sources: [heat sensor definitions](https://github.com/marcoboers/home-assistant-quatt/blob/ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf/custom_components/quatt/sensor_descriptions_heat.py), [binary sensor definitions](https://github.com/marcoboers/home-assistant-quatt/blob/ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf/custom_components/quatt/binary_sensor.py), [CIC sensor definitions](https://github.com/marcoboers/home-assistant-quatt/blob/ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf/custom_components/quatt/sensor_descriptions_cic.py).

The integration's Duo water delta is `hp2.temperatureWaterOut - hp1.temperatureWaterIn`; Single uses pump 1 outlet minus inlet. This is consistent with the manufacturer's series arrangement and contradicts the parallel pump branches in the initial concept images. Never average the two pumps' temperatures to manufacture a group inlet/outlet. [Computation source](https://github.com/marcoboers/home-assistant-quatt/blob/ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf/custom_components/quatt/coordinator_local_cic.py#L76).

`computedQuattCop` uses heat-pump output divided by heat-pump input. `computedSystemPower` in All-Electric is calculated by adding `hc.electricalPower` to pump heat output; it is not an independently measured whole-system thermal balance and does not expose tank charge/discharge heat-flow power. Keep HeatCharger electric input separate and avoid calculating a supposedly measured tank-transfer kW or all-system COP from these figures. [Computation source](https://github.com/marcoboers/home-assistant-quatt/blob/ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf/custom_components/quatt/coordinator_local_cic.py#L211).

All-Electric modes include idle, pre/post pumping, charge normal/boost/backup, CH backup, discharge, discharge with CH backup, charging from Chill cooling and dynamic-price charging. They are not generic valve-position measurements. Future route highlighting should use explicit confirmed mode mappings; unknown codes remain neutral and labeled. [Enum source](https://github.com/marcoboers/home-assistant-quatt/blob/ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf/custom_components/quatt/const.py#L204).

## Adapter work that would be needed later (not implemented)

The current card adapter already discovers HeatCharger electrical power, pressure and two temperatures, plus tank metrics and charging/hot-water flags. It currently maps the exchanger-inlet key to the generic role `returnTemperature`; a circuit card must introduce an explicitly named inlet role or label the actual sensor accurately. It does not yet expose the separate All-Electric supervisory-mode keys or group water-delta source. These are future adapter extensions, not changes made during this research.

Source: local `src/data/discovery.ts`, `src/data/modes.ts` and `docs/data-contract.md`, inspected without editing. Integration source establishes telemetry semantics; manufacturer diagrams establish physical plumbing. Neither should be substituted for the other.
