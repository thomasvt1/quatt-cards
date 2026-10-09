import { css, html, svg } from 'lit';

export const cardStyles = css`
  :host { display: block; container-type: inline-size; min-width: 0; color: var(--primary-text-color, #202530);
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, Arial, sans-serif));
    --qc-heat: var(--energy-gas-color, #eaa02c); --qc-electric: var(--energy-grid-consumption-color, #2196f3);
    --qc-cool: var(--info-color, #27b9d0);
    --qc-secondary: var(--secondary-text-color, #687080);
    --qc-line: var(--divider-color, #e2e5eb); --qc-subtle: var(--secondary-background-color, #f3f5f8);
    --qc-good: var(--energy-battery-out-color, #00a99a); --qc-warning: var(--warning-color, #a86b00); --qc-error: var(--error-color, #d32f2f);
    font-size: 14px; line-height: 1.45; font-variant-numeric: tabular-nums;
  }
  * { box-sizing: border-box; }
  ha-card { display: block; height:100%; padding: 20px; border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--qc-line));
    border-radius: var(--ha-card-border-radius, 12px); background: var(--ha-card-background, var(--card-background-color, #fff));
    box-shadow: none; overflow: hidden;
  }
  .ob-header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
  h2 { margin: 0; font-size: 18px; line-height: 1.3; font-weight: 600; overflow-wrap: anywhere; letter-spacing: -.2px; }
  .subtitle { color: var(--qc-secondary); font-size: 12px; }
  button, input, select { font: inherit; color: inherit; }
  button { cursor: pointer; }
  button:disabled { cursor: default; opacity: .65; }
  button:focus-visible, summary:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 3px; }
  button.metric { appearance: none; padding: 0; border: 0; background: transparent; text-align: inherit; border-radius: 3px; }
  button.metric:hover { color: var(--primary-color, #03a9f4); }
  .notice { font-size: 13px; color: var(--qc-secondary); padding: 12px; border-radius: 8px; background: var(--qc-subtle); margin: 0 0 14px; }
  .notice.error { color: var(--qc-error); }
  .notice p { margin: 4px 0; }
  .icon { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
  .icon-pump { stroke-width:1.05; }
  .muted { color: var(--qc-secondary); } .good { color: var(--qc-good); } .warning { color: var(--qc-warning); } .error { color: var(--qc-error); }
  .reading { border:0; padding:0; border-radius:3px; background:transparent; text-align:inherit; font:inherit; }
  .reading:hover { text-decoration:underline; text-underline-offset:3px; }
  .value { color:var(--primary-text-color,#202530); font-weight:600; font-size:16px; overflow-wrap:anywhere; }
  .label { color:var(--qc-secondary); font-size:12px; }
  .stat { display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-width:0; }
  .stat-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px 16px; }
  .device-field { display:flex; gap:10px; align-items:center; min-width:0; }
  .device-field > .icon { width:22px; height:25px; flex:none; }
  .device-field > div { min-width:0; display:flex; flex-direction:column; align-items:flex-start; }
  .device-field .label { font-size:11px; }
  .device-field .value { font-size:15px; }
  .device-field.heat > .icon { color:var(--qc-heat); }
  .device-field.electric > .icon { color:var(--qc-electric); }
  .detail-readings { margin-top:15px; color:var(--qc-secondary); font-size:12px; }
  .detail-readings summary { cursor:pointer; }
  .detail-readings .stat-grid { margin-top:12px; }
  .section { margin-top:16px; padding-top:16px; border-top:1px solid var(--qc-line); }
  .caption { color:var(--qc-secondary); font-size:12px; margin:12px 0 0; }
  .empty { color:var(--qc-secondary); margin:0; font-size:13px; line-height:1.6; }
  .disc { width:40px; height:40px; border-radius:50%; display:grid; place-items:center; color:var(--accent,var(--qc-good)); background:color-mix(in srgb,var(--accent,var(--qc-good)) 10%,transparent); flex:none; }
  .disc .icon { width:24px; height:24px; }
  .state-line { display:flex; align-items:center; gap:7px; color:var(--qc-secondary); font-size:12px; }
  .state-line .icon { width:16px; height:16px; }
  ::selection { color: var(--primary-text-color, #202530); background: color-mix(in srgb, var(--primary-color, #03a9f4) 25%, transparent); }
  @media (max-width: 450px) { ha-card { padding: 16px; } h2 { font-size: 17px; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;
export function icon(name: string) {
  const aliases:Record<string,string>={'mdi:heat-pump':'pump','mdi:lan-disconnect':'warning','mdi:lan-connect':'connection','mdi:volume-low':'info','mdi:snowflake-melt':'snow','mdi:speedometer-slow':'shield','mdi:alert-circle-outline':'warning','mdi:water-alert-outline':'water','mdi:battery-charging':'tank','mdi:shower':'water','mdi:information-outline':'info'};
  name=aliases[name]||name;
  const paths: Record<string, unknown> = {
    pump: svg`<rect x="1.5" y="4.5" width="21" height="15" rx="1.4"/><path d="M3.5 7h5c4 0 4-1 8-1h4M3.5 9h5c4 0 4-1 8-1h4M3.5 11h5c4 0 4-1 8-1h4M3.5 13h5c4 0 4-1 8-1h4M3.5 15h5c4 0 4-1 8-1h4M2 18h6c4 0 4-2 8-2h6M4 20h2m12 0h2"/>`,
    chill: svg`<ellipse cx="12" cy="3.5" rx="5.5" ry="1.8"/><path d="M6.5 3.5v16.7c0 2.4 11 2.4 11 0V3.5M6.5 11.5c2 1.4 9 1.4 11 0M9 6v4m3-3.5V11m3-5v4"/>`,
    electric: svg`<path d="m14 2-9 12h6l-1 8 9-13h-6z"/>`,
    fan: svg`<circle cx="12" cy="12" r="2"/><path d="M10 10C3 7 8 1 12 4c2 1 2 4 1 6m1 1c5-6 10-1 7 3-1 2-4 2-7 0m-3 0c3 7-4 10-6 5-1-2 1-4 5-6"/>`,
    dot: svg`<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>`,
    heat: svg`<path d="M8 3c-5 4 5 5 0 10m4-10c-5 4 5 5 0 10m4-10c-5 4 5 5 0 10M4 17h16M6 21h12"/>`,
    water: svg`<path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13ZM8 15c0 2 1 3 3 4"/>`,
    tank: svg`<ellipse cx="12" cy="3" rx="5.5" ry="1.6"/><path d="M6.5 3v17.5c0 2.3 11 2.3 11 0V3M6.5 5.5c2.3 1.2 8.7 1.2 11 0M6.5 19.5c2.3 1.2 8.7 1.2 11 0M10.5 22v-1h3v1"/>`,
    thermometer: svg`<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0ZM12 6v11m0 0v2"/>`,
    snow: svg`<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4m13 9-4 1 1 4M4 14l4 1-1 4m13-9-4-1 1-4"/>`,
    sun: svg`<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>`,
    home: svg`<path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10"/>`,
    battery: svg`<rect x="6" y="4" width="12" height="18" rx="2"/><path d="M10 4V2h4v2m-1 4-3 5h4l-3 5"/>`,
    grid: svg`<path d="m12 2-7 20m7-20 7 20M8 9h8M6 15h12M4 5h16M3 10h18M9 5l6 10m0-10L9 15M7 22l10-7M17 22 7 15"/>`,
    shield: svg`<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm-4 10 3 3 5-6"/>`,
    clock: svg`<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>`,
    check: svg`<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>`,
    warning: svg`<path d="m12 3 10 18H2Zm0 6v5m0 3v.1"/>`,
    connection: svg`<path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9 16a4 4 0 0 1 6 0"/><circle cx="12" cy="20" r=".5"/>`,
    chart: svg`<path d="M3 3v18h18M6 15l4-5 4 3 6-8"/>`,
    info: svg`<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>`,
  };
  return svg`<svg class=${`icon icon-${name}`} viewBox=${name==='tank'||name==='chill'?'5 0 14 24':'0 0 24 24'} aria-hidden="true">${paths[name] || paths.info}</svg>`;
}
export function metricButton(label: string, entityId: string | undefined, callback: (id?: string) => void) {
  return entityId ? html`<button class="metric" @click=${() => callback(entityId)}>${label}</button>` : html`${label}`;
}
