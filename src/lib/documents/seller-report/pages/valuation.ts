/**
 * Seller Report v2 — Page 2: Valuation
 *
 * Genie AVM™ primary card + list price + equity side cards, range bar,
 * tax & assessment strip.
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import type { ThemeTokens } from "../themes";
import { esc, fmt$, fmtDateShort, pageWithBand } from "../shell";
import { avmRangeBar, svgConfidenceStars } from "../svg";

export function pageValuation(data: SellerReportData, branding: AgentBranding, pageNum: number, totalPages: number, generatedAt: string, theme: ThemeTokens): string {
  const avm = data.avmValue;
  const avmDate = data.avmDate ? fmtDateShort(data.avmDate) : null;
  const avmLow = data.avmLow;
  const avmHigh = data.avmHigh;
  const confidence = (data as any).avmConfidence ?? 4;
  const monthDelta = (data as any).avmMonthChange ?? (data as any).momPriceChange;
  const yearDelta = (data as any).avmYearChange ?? (data as any).yoyPriceChange;
  const compDataPoints = (data as any).avmCompCount || (data.comps && data.comps.length);

  const deltaPill = (val?: number | null, isPct = false) => {
    if (val == null || !isFinite(val)) return `<strong>—</strong>`;
    const up = val >= 0;
    const cls = up ? "delta-up" : "delta-dn";
    const arrow = up ? "+" : "";
    const text = isPct ? `${arrow}${val.toFixed(1)}%` : `${arrow}${fmt$(Math.abs(val) * (up ? 1 : -1))}`;
    return `<strong class="${cls}">${text}</strong>`;
  };

  const hasLoan = data.loanBalance != null && data.loanBalance > 0;
  const equityLabel = hasLoan ? fmt$(data.estimatedEquity) : "Free & Clear";
  const equitySub = hasLoan
    ? `${data.ltv != null ? `LTV ${data.ltv.toFixed(1)}% · ` : ""}Loan balance ${fmt$(data.loanBalance)}`
    : "No open mortgage of record";

  const listPriceCard = data.listPrice
    ? `
      <div class="val-card">
        <div class="label">List Price</div>
        <div class="value" style="color: var(--gold-600);">${fmt$(data.listPrice)}</div>
        <div class="sub">${data.listingStatus ? `${esc(data.listingStatus)}` : "Active"}${(data as any).listDate ? ` since ${esc(fmtDateShort((data as any).listDate))}` : ""}${data.mlsNumber ? ` · MLS #${esc(data.mlsNumber)}` : ""}</div>
      </div>
    `
    : `
      <div class="val-card">
        <div class="label">Tax Assessment</div>
        <div class="value">${fmt$(data.assessedTotal)}</div>
        <div class="sub">${data.taxYear ? `Tax year ${esc(data.taxYear)}` : "Assessor of record"}${data.assessedTotal != null && avm != null ? (data.assessedTotal < avm ? " · Below market value" : " · At or above market") : ""}</div>
      </div>
    `;

  const body = `
    <h2 class="section-title">Property Valuation</h2>
    <div class="section-sub">Genie AVM™${avmDate ? ` · Updated ${esc(avmDate)}` : ""}</div>

    <div class="val-grid">
      <div class="val-card primary">
        <div>
          <div class="label">Genie AVM™ Estimated Value</div>
          <div class="value">${fmt$(avm)}</div>
          <div class="sub">${avmDate ? `Updated ${esc(avmDate)}` : "Current estimate"}${compDataPoints ? ` · Based on ${compDataPoints} comparable data points` : ""}</div>
        </div>
        <div class="avm-meta">
          <div class="row"><span>Confidence</span>${svgConfidenceStars(confidence)}</div>
          <div class="row"><span>Month change</span>${deltaPill(monthDelta, false)}</div>
          <div class="row"><span>12-mo change</span>${deltaPill(yearDelta, true)}</div>
        </div>
      </div>

      ${listPriceCard}

      <div class="val-card">
        <div class="label">Estimated Equity</div>
        <div class="value">${esc(equityLabel)}</div>
        <div class="sub">${esc(equitySub)}</div>
      </div>

      ${avmLow != null && avmHigh != null && avm != null
        ? avmRangeBar(avmLow, avmHigh, avm)
        : ""}
    </div>

    <h3 class="block-title">Tax &amp; Assessment</h3>
    <div class="tax-strip">
      <div>
        <div class="tlabel">Assessed Total</div>
        <div class="tval">${fmt$(data.assessedTotal)}</div>
      </div>
      <div>
        <div class="tlabel">Land Value</div>
        <div class="tval">${fmt$(data.assessedLand)}</div>
      </div>
      <div>
        <div class="tlabel">Improvement</div>
        <div class="tval">${fmt$(data.assessedImpr)}</div>
      </div>
      <div>
        <div class="tlabel">Annual Tax</div>
        <div class="tval">${fmt$(data.taxAmount)}</div>
      </div>
    </div>

    <p style="font-size: 9px; color: var(--ink-mute); margin-top: 18px; line-height: 1.5;">
      This report contains data from public records, MLS, and proprietary sources. Values are automated estimates, not formal appraisals.
    </p>
  `;

  return pageWithBand(data, branding, pageNum, totalPages, generatedAt, theme, body, "p2");
}
