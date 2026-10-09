# Validation

Local checks on 9 October 2026 passed with Node.js 24:

- TypeScript checking and Vite production build.
- 37 unit tests covering discovery, unit conversion, source priority, status, history normalization and shared registry subscriptions.
- 14 Chromium browser tests covering all six cards and their editors, light/dark themes, desktop (1440px), tablet (820px), phone (390px), keyboard and touch inspection, live updates during inspection, missing/offline telemetry, read-only sensor details, and wrapping after three units.

The browser suite renders actual Lit components using synthetic Home Assistant fixtures. It checks card overflow and page errors. Shared requests and subscription cleanup are tested. Screenshots in `docs/screenshots` come from that fixture preview, not a household dashboard.

The entity adapter was checked against the pinned upstream integration contract documented in [data-contract.md](data-contract.md). Package metadata targets Home Assistant 2026.10. This is not a claim that the bundle has been installed or rendered inside a live Home Assistant dashboard. HACS installation, live resource loading, and actual dashboard placement remain to be verified after installation.

Visual review compares card composition and physical-device outlines with approved mockup C v3. The mockup's Home Assistant navigation and duplicated phone inset are host context. No pixel-difference or font-matching gate is claimed for the whole showcase image.

The fresh visual review found no concrete UI repairs: topology, device outlines, chart instruments, theme inheritance, and compact comparison columns matched the approved direction. A follow-up measured comparison of six card crops reported drift (scores 0.6323–0.72), with differing card widths normalized by stretching. These diagnostic scores do not establish pixel fidelity. The review's strict reproduction-workflow evidence finding remains open; the spec/font/build-phase gates have not passed. This limitation is separate from the passing functional tests.
