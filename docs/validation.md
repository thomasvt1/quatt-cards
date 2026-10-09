# Validation

Local checks on 9 October 2026 passed with Node.js 24:

- TypeScript checking and Vite production build.
- 100 unit tests covering discovery, unit conversion, source priority, status, history normalization and shared registry subscriptions.
- 57 Chromium browser tests covering all seven cards and their editors, light/dark themes, desktop (1440px), tablet (820px), phone (390px), keyboard and touch inspection, live updates during inspection, missing/offline telemetry, read-only sensor details, wrapping after three units, and single-unit installation/selection layouts in all three styles. Geometry assertions also check centered heat-battery temperatures and status icons.

The browser suite renders actual Lit components using synthetic Home Assistant fixtures. It checks card overflow and page errors. Shared requests and subscription cleanup are tested. Screenshots in `examples` come from that fixture preview, not a household dashboard.

The entity adapter was checked against the pinned upstream integration contract documented in [data-contract.md](data-contract.md). Package metadata targets Home Assistant 2026.10. Release v0.1.0 was installed through HACS on that version on 9 October 2026. HACS registered the versioned module resource automatically. The live card picker rendered all six cards, discovering two heat pumps, two Chill units, and thermal storage. Recorder-backed history loaded, and the Overview visual editor showed live measurements in an unsaved preview. The preview was cancelled and no card was added to the dashboard. No Quatt-specific browser errors were observed during this check. Private household screenshots and identifiers are excluded from this repository.

Release v0.1.1 was also installed through HACS on 9 October 2026. The registered resource advanced to the new version, and an unsaved live preview with one selected Chill unit confirmed the centered summary and two-column readings. The preview was cancelled without saving dashboard changes.

Visual review compares card composition and physical-device outlines with approved mockup C v3. The mockup's Home Assistant navigation and duplicated phone inset are host context. No pixel-difference or font-matching gate is claimed for the whole showcase image.

The fresh visual review found no concrete UI repairs: topology, device outlines, chart instruments, theme inheritance, and compact comparison columns matched the approved direction. A follow-up measured comparison of six card crops reported drift (scores 0.6323–0.72), with differing card widths normalized by stretching. These diagnostic scores do not establish pixel fidelity. The review's strict reproduction-workflow evidence finding remains open; the spec/font/build-phase gates have not passed. This limitation is separate from the passing functional tests.

Chill control-access tests cover renamed and indexed legacy climate entities, disabled/foreign/ambiguous targets, override isolation, keyboard activation, per-unit event targets, the editor visibility option, and offline/missing climate state. Opening a control panel emits no service calls. Icon geometry checks cover centering and touch targets in all three layouts on desktop and phone, including hidden temperature fields and decorative icons with controls disabled.

Field-selection tests cover defaults, malformed YAML, every visual editor, reset without losing unrelated settings, selected temperature reflow, COP-only/mode-only history, heat-battery overview readings, missing equipment, and unavailable charge. Field checkboxes are included in responsive editor checks.

The minimal Overview layout is tested at 1440px, 820px, and 390px in both themes, including editor switching, preserved field choices, a four-field configuration, missing battery equipment, and unavailable charge.

Chill ring checks cover independent mode/status reports, missing and unfamiliar states, offline precedence, live state changes, field toggles, accessible descriptions, display-only indicators, and cooling/heating rendering in both themes.

Heating circuit v0.6.0: browser checks cover one/two pumps at 1200px, 820px and 390px in both themes, field toggles/reset, sensor-detail keyboard activation, focus retention on updates, offline endpoints and absent storage. Geometry assertions prevent the phone storage branch overlapping the return reading. Visual review corrected that overlap and confirmed the final desktop/phone captures. Unit tests cover renamed/reordered/legacy pump identifiers, remote pump order, unknown/contradictory topology, Fahrenheit normalization, negative ΔT, explicit endpoint overrides and offline final-pump gaps. No new live hydraulic flow measurement is claimed.

Release v0.6.0 was installed through HACS and verified in the live Home Assistant card picker and unsaved visual editor on 9 October 2026. Both pumps, circuit temperatures/flow, charger input and thermal storage rendered from discovered sensors. The Displayed fields editor loaded correctly. The preview was cancelled without saving a dashboard change; HACS reported v0.6.0 installed with no pending update.

Chill v0.6.1: the exact “On working” + “Cooling” regression was first observed failing with unknown/question output, then passed with on/cooling/snow. Tests cover raw ON_WORKING, case/whitespace variants, heating, off/idle, offline precedence and unfamiliar reports. Instrumented browser tests measure each actual card; the 81% per-card gate initially failed five cards, then passed after added behavior tests. Coverage is enforced in CI and tagged release workflows.

Chill v0.6.3: a live “On target temperature reached” report reproduced the unknown/question output on v0.6.2. Three new unit regressions failed before the fix, then passed as idle/neutral/power. A wider upstream/history audit found disconnected and heating-system-conflict warnings; eight further regressions failed before the diagnostic handling was added. The independent known-state matrix covers 14 statuses across spellings, selected modes, unavailable telemetry and live browser updates. All 100 unit tests, 57 browser tests, production build, 100% Chill interpreter gate and the 81% per-card/aggregate coverage gates passed locally. See [the audit](chill-states.md) for provenance and the free-form API limitation.

Example generation: `npm run update:examples` captures all seven registered cards, both themes and desktop/phone sizes, alternate heat-pump/Chill layouts, minimal Overview, a single-pump circuit and two dashboards. On 9 October 2026, two consecutive local runs produced 42 byte-identical PNGs. All generated files are referenced in the README. Visual inspection covered the desktop collection, cooling Chill badge, compact/stacked layouts, phone history, thermal storage, status and single-pump plumbing. CI also runs the generator.
