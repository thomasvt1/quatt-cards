---
name: Quatt Cards
description: Compact Home Assistant instruments for Quatt heat, electricity and comfort.
colors:
  heat: "var(--energy-gas-color, #eaa02c)"
  electric: "var(--energy-grid-consumption-color, #2196f3)"
  cooling: "var(--info-color, #27b9d0)"
  good: "var(--energy-battery-out-color, #00a99a)"
  text: "var(--primary-text-color, #202530)"
  secondary: "var(--secondary-text-color, #687080)"
  line: "var(--divider-color, #e2e5eb)"
  subtle: "var(--secondary-background-color, #f3f5f8)"
  surface: "var(--ha-card-background, var(--card-background-color, #fff))"
  focus: "var(--primary-color, #03a9f4)"
  warning: "var(--warning-color, #a86b00)"
  error: "var(--error-color, #d32f2f)"
typography:
  body:
    fontFamily: "var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, Arial, sans-serif))"
    fontSize: "14px"
    lineHeight: 1.45
  title:
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.2px"
  unit-title:
    fontSize: "13px"
    fontWeight: 600
  value:
    fontSize: "16px"
    fontWeight: 600
  device-value:
    fontSize: "15px"
    fontWeight: 600
  label:
    fontSize: "12px"
  device-label:
    fontSize: "11px"
rounded:
  card: "var(--ha-card-border-radius, 12px)"
  field: "8px"
  reading: "3px"
spacing:
  compact: "8px"
  label-gap: "10px"
  small: "12px"
  field: "14px"
  section: "16px"
  card: "20px"
  unit-row: "24px"
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  reading:
    backgroundColor: "transparent"
    rounded: "{rounded.reading}"
    padding: "0"
  field:
    rounded: "{rounded.field}"
    padding: "10px 12px"
    width: "100%"
---

# Design System: Quatt Cards

## Overview

**Creative North Star: "Native Home Assistant instruments"**

Quatt Cards extends the approved Omnibattery visual system: compact telemetry, native theme inheritance, restrained surfaces and recognizable physical equipment. Independent cards present readings for inspection. Chill adds an explicit per-unit Controls action opening the native Home Assistant climate panel.

The system uses a quiet type hierarchy and separators to compare devices within a single card. Small inline SVG outlines identify the wave-grille outdoor heat pump, cylindrical thermal HeatBattery and vented cylindrical Chill. Their geometry carries identity without competing with the measurements.

**Key Characteristics:**

- Native Home Assistant type and theme colors.
- Flat cards with thin borders and internal dividers.
- Semantic heat, electricity, cooling and efficiency accents.
- Compact device comparisons and truthful missing-data states.

Evidence: `src/ui.ts`, the six files in `src/cards`, `src/editor.ts`, `src/demo/style.css`, and desktop/tablet/phone light/dark captures in `.impeccable/review`. This is an implementation record, not proof of mockup reproduction: spec, font and pixel gates have not been established as passed, and diagnostic card comparisons show drift.

## Colors

Theme-bound neutral surfaces carry restrained semantic accents. Frontmatter values are the shipped bindings and fallbacks, not a fixed Quatt theme.

### Primary

- **Electric blue:** electric input icons and history trace. The host primary color independently supplies keyboard focus and selected history ranges.
- **Warm heat:** thermal output, thermal charge meter and heating activity.

### Secondary

- **Cooling cyan:** Chill equipment outlines and cooling state.
- **Efficiency teal:** COP history and affirmative status indicators.
- **Warning and error:** host semantic colors for notices and relevant state text.

### Neutral

- **Primary text:** readings, headings and equipment outlines.
- **Secondary text:** labels, timestamps, explanatory copy and unavailable readings.
- **Surface, subtle and line:** card canvas, restrained control/notice background, borders and separators.

**The Host Theme Rule.** Resolve Home Assistant theme properties first; local fallback colors are resilience values, not a replacement identity.

**The Semantic Accent Rule.** Keep heat and electricity visually distinct across icons, legends and history traces; pair each color with a label or shape.

The demo provides explicit light/dark theme fixtures in `src/demo/style.css`. Those fixtures illustrate the bindings; their literal palette is not a required theme for installed cards.

## Typography

**Body Font:** Home Assistant body family, then the legacy paper body family, then Roboto, Arial and sans-serif. Titles inherit this family. There is no separate product display face.

**Character:** Compact native interface typography, with tabular numerals applied across the card. Semibold measurements establish scanning order above smaller secondary labels.

### Hierarchy

- **Title:** frontmatter title role; card headings reduce to (17px) at viewport widths up to (450px).
- **Unit title:** device and room names; wrapping is allowed.
- **Value / device value:** shared measurement roles; labels sit beside or below according to the instrument.
- **Body / label / device label:** inherited body rhythm with smaller supporting text. Status titles use (13px, 500); status details use (12px).

Large readings are local instrument emphasis, not a general display ramp: overview power values use (18px), thermal charge uses (31px), and Chill temperature uses (23px). Narrow-container and three-unit variants reduce these locally. Do not generalize these one-off sizes to new card headings.

**The Native Type Rule.** Inherit the host family and retain tabular numerals for measurements rather than introducing a branded display or monospace face.

## Layout

Each host is a block with inline-size containment and zero minimum width. Cards use the shared padding token, shrinking to the section spacing token at viewport widths up to (450px). Headers align title and subtitle on their baselines with a small gap. Shared measurement grids use two equal columns with (14px 16px) gaps; sections are separated by a top rule and (16px) spacing.

The default C layout compares at most three heat pumps or Chill rooms per row, with additional units wrapping. Internal columns use vertical dividers; the first column in each row has no leading divider. Device count determines the column count. When exactly one device is visible, C uses two reading columns and natural card height. The single Chill summary is centered above its readings. This applies equally to single-device installations and a selected device. Narrow screens do not automatically change C into A or B. Three-column variants hide secondary field icons to protect reading width. A stacks units with horizontal dividers; B uses denser field grids and hides field icons.

Container adjustments are local: overview, HeatBattery and Chill at (350px), heat pumps at (360px), and history at (450px). Do not replace these with a global viewport assumption inside Lovelace dashboards.

The demo alone uses a centered (1440px) maximum canvas, (28px) padding, and a three-column grid with (16px) gaps. It becomes two columns at (1000px) and a vertical sequence at (650px), with (16px 12px) outer padding. Installed cards leave dashboard composition to Home Assistant.

## Elevation & Depth

Cards explicitly use `box-shadow: none`. A theme-controlled thin border defines the outer surface; internal rules organize fields without nested cards. Tonal fills are reserved for notices, range selectors and meters. The active history range sits on the card surface color inside a subtle group.

**The Divider Rule.** Compare devices and organize readings with thin separators within one surface; do not wrap each measurement in another card.

## Shapes

Card corners follow the host radius with the recorded fallback. Fields and notices share gently rounded corners. Readings remain visually text-like, with only a small focus-compatible corner radius. Borders follow the theme's card width and color, falling back to a (1px) separator.

SVG pictograms use unfilled outlines, round caps and round joins. The shared default is a (22px) icon with (1.7) stroke width; individual equipment drawings use finer strokes and dedicated proportions. Preserve the heat pump's flowing grille and lower fascia, the HeatBattery's cap seam and recessed base, and Chill's vented cylinder. Circular energy nodes and legend dots remain native parts of these instruments.

## Components

### Cards / Containers

Quiet bounded instruments using frontmatter card tokens, no shadow and clipped overflow. Internal comparison areas stay transparent. Existing top-row cards have a (385px) minimum height; history, Chill and status have (410px). These are current card-specific constraints, not a universal height token.

### Reading buttons

Transparent, borderless text actions. Measurement buttons adopt host primary color on hover; textual reading buttons underline on hover with a (3px) offset. Keyboard focus uses a (2px) host-primary outline with (3px) offset. Disabled buttons reduce opacity to (.65). These actions open entity details.

### History range selector and inspector

Compact range buttons sit in a subtle rounded group. The selected button uses the card surface and primary text accent; group padding is (3px), button padding (5px 9px), and button corners (5px). Focus follows the shared outline. No dedicated hover animation is implemented.

Power traces share a panel; COP has its own aligned panel. A single (10px) segmented operating-mode strip shares their time axis. Trace strokes use (1.8) width and round joins. Pointer, touch and keyboard inspect a common timestamp, while missing data remains a gap. Legends name all series and modes. Selection survives live updates. Reduced-motion rules disable transitions and animations; the cards define no decorative motion.

### Device field and status row

A small icon leads a value/label pair; standard fields use the label-gap spacing token. Unit columns retain repeated reading order. Heat-battery temperature cells center their labels and values in three equal columns. Status icons are vertically centered against their title and explanation. Status rows use a divider, (16px) vertical padding, a (12px) icon/text gap, a medium-weight title and secondary explanation. Clickable status titles underline on hover.

### Thermal charge meter

An empty cylindrical outline identifies thermal storage, separate from the horizontal warm meter. The meter uses a (10px) track with (5px) corners. Display charge only when supplied; otherwise show available shower time. The outline never implies an invented liquid or electrical storage fill.

### Inputs / Fields

The configuration editor uses native inputs and selects with theme surface/text, a thin divider border and the frontmatter field geometry. Controls have a (44px) minimum height. Labels use (14px) with (500) weight; help text uses (13px). Editor focus uses a (2px) primary outline offset by (2px). The editor inherits its legacy Home Assistant paper font binding; it does not supply an independent family.

## Do's and Don'ts

### Do:

- **Do** inherit host theme properties and body typography.
- **Do** preserve semantic heat/electricity distinctions and text labels.
- **Do** compare units with dividers inside one card and cap C at three columns.
- **Do** preserve the physical equipment outlines and shared history timestamp.
- **Do** keep optional or missing measurements visibly unavailable.

### Don't:

- **Don't** introduce nested measurement cards or decorative shadows.
- **Don't** substitute an electrical battery icon or invented fill for thermal storage.
- **Don't** present display-only readings as heating controls.
- **Don't** turn demo theme literals, card-specific hero sizes or diagnostic reproduction drift into new global tokens.

Not canonized: the demo wordmark's system-font display styling is preview scaffolding, not a card display-font rule; unresolved reproduction drift and unpassed validation gates are not evidence of a reusable design decision.

### Chill control access (v0.2.0)

Each unit has a full-width, 44px minimum-height Controls button beneath a thin separator. It inherits theme text, borders, and focus treatment; three-column layouts omit its secondary icon to retain label space. It opens the native climate panel for that unit. Missing targets show an explanation; unavailable units disable the button. The visual editor can hide control access for display-only dashboards. This is the explicit exception to the original display-only scope.

### Overview storage and field selection (v0.3.0)

Overview separates heat-pump flow, comfort readings, and thermal storage with thin rules. The heat-battery section uses the established tank outline, a compact status on the heading row, a two-column reading grid, and a 6px warm progress track. Missing hardware omits the section and missing charge omits the track.

Displayed fields are native labeled checkboxes, with 44px rows, two columns in wide editors and one on phones. A reset action restores defaults. Partial flow selections use equal-width nodes without misleading connecting arrows. Selected tank temperatures divide available width evenly; empty detail groups disappear. Custom field layouts use natural card height.
