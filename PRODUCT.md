# Quatt Cards

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
TypeScript, Lit, inline SVG and Vite, continuing the user's Omnibattery Cards implementation. One self-contained Home Assistant frontend module.

## Users and purpose
Home Assistant users inspecting their Quatt heat-pump system. The user requested a similar card collection based on the approved compact Omnibattery layouts.

## Operating context
Independent Lovelace cards in Sections or Masonry dashboards, on desktop and touch devices, in the active Home Assistant theme. Sensor details are inspection actions. Since v0.2.0, each Chill unit can open its native Home Assistant climate controls. The package itself sends no service calls; the user operates the native panel. Other cards remain display-only.

## Capabilities and constraints
Read entities provided by marcoboers/home-assistant-quatt. Discover through registry membership and stable unique IDs, preserve renamed entity IDs, and distinguish multiple installations. Optional and missing telemetry stays unavailable. No fabricated forecasts, heating savings, or storage percentages. Development examples use synthetic household and device identifiers.

The approved scope is CIC/heat pumps, thermostat, heat battery/charger, and Chill. Electrical HomeBattery and Quatt Energy are outside this release. The user approved C compact grid, then its v3 refinement with physical-device outlines.

## Brand commitments
Inherit the user's approved Omnibattery/EMHASS compact card style, native typography, thin borders, restrained surfaces, semantic energy colors, and light/dark themes. The single segmented activity strip is the established pattern when activity data supports one.

## Evidence
Public upstream integration source at commit ac6d26ab5ee8083e9cacf2391b5cfa0ae98fa4cf. Existing Omnibattery components provide the visual and frontend-lifecycle reference. Private Home Assistant identifiers remain outside distributable source.
