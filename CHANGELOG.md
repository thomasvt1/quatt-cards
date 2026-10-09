# Changelog

## 0.6.2

- Add a custom generated blue Q / airflow icon to the GitHub and HACS repository detail page. HACS retains its fixed dashboard-category icon in the repository list.
- No card behavior changes.

## 0.6.1

- Fix Chill showing a question mark for the live “On working” status. Cooling now shows the blue snowflake; heating shows red heat waves. Normalize raw API underscores, case and whitespace without treating unknown states as active.
- Add working/idle state regressions and realistic cooling fixtures.
- Enforce an 81% minimum for lines, statements, functions and branches on every card, the browser runtime aggregate, and the shared-data test aggregate in both CI and release builds.
- Expand behavior checks for hidden fields, missing equipment, offline readings, optional storage telemetry and sensor-detail interactions. Upload coverage reports with CI results.

## 0.6.0

- Add the compact A3b Heating circuit card with automatic one-/two-pump topology, configurable readings, and sensor details.
- Integrate Heat Charger as one compact labeled connector and include available thermal storage readings.
- Keep HP power/COP, charger electricity and thermal relationships distinct; derive ΔT only from valid circuit endpoints.
- Support narrow cards, light/dark themes, keyboard access, missing equipment and live updates.

## 0.5.1

- Simplify the Chill ring to one combined badge instead of separate mode and status badges.
- Off/idle uses gray with a power symbol, cooling uses bright blue with a snowflake, and heating uses red with heat waves.
- Keep unavailable/unknown states distinct and retain reported status and selected mode in accessible descriptions.

## 0.5.0

- Integrate Chill status and mode into the clickable device ring, replacing both text rows.
- Use bright blue for cooling and red for heating, with mode symbols and a separate on/off/idle/unknown status badge.
- Keep selected mode distinct from operating status; unavailable units remain neutral with a warning.
- Preserve keyboard access, native controls, display-only icons and configurable indicators. Reduce card sizing and keep the compact layout at two reading columns.

## 0.4.4

- Use a neutral gray dot for heat-battery Off status instead of red, so Off does not suggest a fault. On remains green.

## 0.4.3

- Replace the Detailed Overview heat-battery On/Off text with a small green/red status dot.
- Keep other or unavailable states neutral gray, with the reported state in a tooltip and accessible label.
- Preserve sensor-detail access and the configurable status field.

## 0.4.2

- Hide heat pump Operating status by default because it is not reported by every installation.
- Keep it available as an opt-in checkbox under Displayed fields and through `fields.status: true`; explicit existing selections are preserved.

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
