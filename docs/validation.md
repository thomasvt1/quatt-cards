# Validation

Local checks on 9 October 2026 passed with Node.js 24:

- TypeScript checking and Vite production build.
- 46 unit tests covering discovery, unit conversion, source priority, status, history normalization and shared registry subscriptions.
- 27 Chromium browser tests covering all six cards and their editors, light/dark themes, desktop (1440px), tablet (820px), phone (390px), keyboard and touch inspection, live updates during inspection, missing/offline telemetry, read-only sensor details, wrapping after three units, and single-unit installation/selection layouts in all three styles. Geometry assertions also check centered heat-battery temperatures and status icons.

The browser suite renders actual Lit components using synthetic Home Assistant fixtures. It checks card overflow and page errors. Shared requests and subscription cleanup are tested. Screenshots in `docs/screenshots` come from that fixture preview, not a household dashboard.

The entity adapter was checked against the pinned upstream integration contract documented in [data-contract.md](data-contract.md). Package metadata targets Home Assistant 2026.10. Release v0.1.0 was installed through HACS on that version on 9 October 2026. HACS registered the versioned module resource automatically. The live card picker rendered all six cards, discovering two heat pumps, two Chill units, and thermal storage. Recorder-backed history loaded, and the Overview visual editor showed live measurements in an unsaved preview. The preview was cancelled and no card was added to the dashboard. No Quatt-specific browser errors were observed during this check. Private household screenshots and identifiers are excluded from this repository.

Release v0.1.1 was also installed through HACS on 9 October 2026. The registered resource advanced to the new version, and an unsaved live preview with one selected Chill unit confirmed the centered summary and two-column readings. The preview was cancelled without saving dashboard changes.

Visual review compares card composition and physical-device outlines with approved mockup C v3. The mockup's Home Assistant navigation and duplicated phone inset are host context. No pixel-difference or font-matching gate is claimed for the whole showcase image.

The fresh visual review found no concrete UI repairs: topology, device outlines, chart instruments, theme inheritance, and compact comparison columns matched the approved direction. A follow-up measured comparison of six card crops reported drift (scores 0.6323–0.72), with differing card widths normalized by stretching. These diagnostic scores do not establish pixel fidelity. The review's strict reproduction-workflow evidence finding remains open; the spec/font/build-phase gates have not passed. This limitation is separate from the passing functional tests.

Chill control-access tests cover renamed and indexed legacy climate entities, disabled/foreign/ambiguous targets, override isolation, keyboard activation, per-unit event targets, the editor visibility option, and offline/missing climate state. Opening a control panel emits no service calls.

Field-selection tests cover defaults, malformed YAML, every visual editor, reset without losing unrelated settings, selected temperature reflow, COP-only/mode-only history, heat-battery overview readings, missing equipment, and unavailable charge. Field checkboxes are included in responsive editor checks.

The minimal Overview layout is tested at 1440px, 820px, and 390px in both themes, including editor switching, preserved field choices, a four-field configuration, missing battery equipment, and unavailable charge.
