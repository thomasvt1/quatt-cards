import { css, html } from 'lit';
import { BaseCard } from '../base-card';
import { icon } from '../ui';
import { statusField } from '../fields';
export class QuattStatusCard extends BaseCard {
  static getStubConfig() { return {type:'custom:quatt-status-card'}; }
  static styles=[BaseCard.styles,css`
    ha-card{min-height:410px}ha-card.custom-fields{min-height:0}
    .rows{display:grid}.row{display:flex;gap:12px;align-items:center;padding:16px 0;text-align:left;border:0;border-bottom:1px solid var(--qc-line);background:transparent;width:100%;font:inherit;color:inherit}
    [role=listitem]:last-child .row{border-bottom:0}.row .disc{width:30px;height:30px;background:none;border-radius:0;color:var(--primary-text-color)}.row .disc .icon{width:27px;height:27px;stroke-width:1.3}
    .row .disc.warning{--accent:var(--qc-warning)}.row .disc.error{--accent:var(--qc-error)}.row .disc.neutral{--accent:var(--qc-secondary)}
    .row strong{font-size:13px;font-weight:500;display:block}.row small{display:block;color:var(--qc-secondary);font-size:12px;margin-top:3px;line-height:1.5}
    button.row:hover strong{text-decoration:underline;text-underline-offset:3px}.row>span:last-child{min-width:0;overflow-wrap:anywhere}
  `];
  protected render() {
    const rows=this.snapshot.status.filter(row=>this.showField(statusField(row.key)));
    return html`<ha-card class=${this.config.fields?'custom-fields':''}>${this.renderHeader('Status')}${this.renderNotice()}<div class="rows" role="list" aria-label="Quatt system status">${rows.map(row=>{
      const content=html`<span class=${`disc ${row.tone}`}>${icon(row.icon)}</span><span><strong>${row.title}</strong>${row.detail?html`<small>${row.detail}</small>`:''}</span>`;
      return html`<div role="listitem">${row.entityId&&/^(sensor|binary_sensor)\./.test(row.entityId)?html`<button class="row" @click=${()=>this.moreInfo(row.entityId)} aria-label=${`${row.title}. ${row.detail||''} Show details`}>${content}</button>`:html`<div class="row">${content}</div>`}</div>`;
    })}</div>${!rows.length?html`<p class="empty">No status readings to show. Check Displayed fields in the card editor.</p>`:''}</ha-card>`;
  }
}
