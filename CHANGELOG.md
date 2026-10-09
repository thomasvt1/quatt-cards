# Changelog

## 0.4.1

- Center each Chill equipment icon and make it open that unit’s native Home Assistant controls.
- Remove the separate Controls footer button and center the current temperature beneath the icon.
- Keep keyboard access, touch-sized targets, availability checks, and the display-only option in all layouts.
- Keep icon controls available when the current-temperature field is hidden.

## 0.4.0

- Add Detailed and Minimal heat-battery layouts to the Overview visual editor and YAML (`heat_battery_layout`).
- Minimal places selected battery and charger readings in the main reading grid, without the separate section or charge bar.
- Preserve displayed-field selections when switching layouts; Detailed remains the default.
- Test switching, field preservation, missing data, and minimal layout sizing in both themes on phone, tablet, and desktop.

## 0.3.0

- Add a compact heat-battery summary to Overview with thermal charge, shower time, status, and a progress bar.
- Add Displayed fields checkboxes and reset to all six visual editors, plus a validated YAML `fields` map.
- Offer additional overview tank temperatures, charging/hot-water readings, charger input, and water pressure.
- Reflow hidden values and support selected history series and status categories.

## 0.2.0

- Add a Controls button for each Chill unit, opening Home Assistant’s native climate panel for temperature, heat/cool/off mode, and fan speed.
- Discover control targets independently of telemetry overrides, and disable control access for offline units.
- Add a visual-editor/YAML option (`show_controls: false`) for display-only Chill cards.
- Cover native control-panel access and target discovery with keyboard, offline, rename, legacy, and ambiguity tests.

## 0.1.1

- Use two reading columns and natural card height when a heat pump or Chill card shows one unit, including an explicitly selected device.
- Center the single Chill summary and align temperature cells, operating status fields, and status-row icons.
- Add a single-unit preview and browser regressions across desktop, tablet, phone, and both themes, including all three layout styles.

## 0.1.0

- Add six display-only cards for Quatt system overview, performance history, heat pumps, thermal heat battery, Chill, and status.
- Add visual configuration editors, card-picker previews, YAML support, and Sections/Masonry sizing.
- Provide C · Columns, A · Stacked, and B · Compact styles for heat pump and Chill collections, with at most three columns per row.
- Discover integration entities and devices from registry membership and stable identifiers, with explicit entity overrides.
- Keep thermal output, electrical consumption, thermal storage, and reported COP distinct.
- Match approved compact C layouts with physical heat pump, thermal tank, and Chill outlines in light and dark themes.
- Add a shared chart inspector and one slim operating-mode strip, preserving missing-data gaps.
- Add synthetic development fixtures, automated checks, a self-contained JavaScript bundle, and HACS release packaging.
