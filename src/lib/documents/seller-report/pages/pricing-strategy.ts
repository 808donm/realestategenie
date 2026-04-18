/**
 * Seller Report v2 — Page 12: Pricing Strategy & Refined Value
 *
 * Three stacked blocks:
 * - Pricing Strategy · Comparable Groups (For Sale / Distressed / Expired / Closed)
 * - Sold Price Comparison · Last 90 Days + CMA Summary
 * - Refined Value Summary — agent-editable; always present with "—" fallbacks.
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import type { ThemeTokens } from "../themes";
import { esc, fmt$, pageWithBand } from "../shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function pagePricingStrategy(data: SellerReportData, branding: AgentBranding, pageNum: number, totalPages: number, generatedAt: string, theme: ThemeTokens): string {
  const d = data as any;
  const ps = data.pricingStrategy || {};
  const cma = data.cma;
  const refined = d.refinedValue as
    | { original?: number; changesHomeFacts?: number; homeImprovements?: number; neededImprovements?: number; marketConditions?: number; total?: number; totalPsf?: number }
    | undefined;

  const cell = (n?: number | null) => (n == null || isNaN(Number(n)) ? "—" : fmt$(n));
  const psfCell = (n?: number | null) => (n == null || isNaN(Number(n)) ? "—" : `$${Math.round(n).toLocaleString()}`);
  const domCell = (n?: number | null) => (n == null || isNaN(Number(n)) ? "—" : String(Math.round(n)));

  // ─── Pricing Strategy · 4-column comparable groups ───
  const psTable = `
    <table class="t3">
      <thead>
        <tr>
          <th>&nbsp;</th>
          <th>For Sale / For Lease</th>
          <th>Distressed</th>
          <th>Expired</th>
          <th>Closed</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="rowlbl">Lowest</td>
          <td>${cell(ps.forSale?.lowest)}</td>
          <td>${cell(ps.distressed?.lowest)}</td>
          <td>${cell(ps.expired?.lowest)}</td>
          <td>${cell(ps.closed?.lowest)}</td>
        </tr>
        <tr>
          <td class="rowlbl">Median</td>
          <td>${cell(ps.forSale?.median)}</td>
          <td>${cell(ps.distressed?.median)}</td>
          <td>${cell(ps.expired?.median)}</td>
          <td>${cell(ps.closed?.median)}</td>
        </tr>
        <tr>
          <td class="rowlbl">Highest</td>
          <td>${cell(ps.forSale?.highest)}</td>
          <td>${cell(ps.distressed?.highest)}</td>
          <td>${cell(ps.expired?.highest)}</td>
          <td>${cell(ps.closed?.highest)}</td>
        </tr>
        <tr>
          <td class="rowlbl">Median $/sqft</td>
          <td>${psfCell(ps.forSale?.medianPsf)}</td>
          <td>${psfCell((ps.distressed as any)?.medianPsf)}</td>
          <td>${psfCell((ps.expired as any)?.medianPsf)}</td>
          <td>${psfCell(ps.closed?.medianPsf)}</td>
        </tr>
        <tr>
          <td class="rowlbl">Median DOM</td>
          <td>${domCell(ps.forSale?.medianDOM)}</td>
          <td class="muted">—</td>
          <td>${domCell(ps.expired?.medianDOM)}</td>
          <td>${domCell(ps.closed?.medianDOM)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // ─── Sold Price Comparison (last 90 days) ───
  const sc = d.soldComparison90d as { low?: number; median?: number; high?: number; lowPsf?: number; medianPsf?: number; highPsf?: number } | undefined;
  const filterLine = [
    data.beds ? `${data.beds} bed` : null,
    data.baths ? `${data.baths} bath` : null,
    data.sqft ? `${Math.round(data.sqft * 0.85).toLocaleString()}–${Math.round(data.sqft * 1.15).toLocaleString()} sqft` : null,
  ].filter(Boolean).join(" · ") || "Similar beds · baths · sqft";

  const soldCompBlock = `
    <div>
      <h3 class="ps-title">Sold Price Comparison · Last 90 Days</h3>
      <div style="font-size: 9px; color: var(--t-text-mute); margin-bottom: 4px;">Similar: ${esc(filterLine)}</div>
      <table class="t3">
        <thead>
          <tr><th>&nbsp;</th><th>Sold Price</th><th>$/sqft</th></tr>
        </thead>
        <tbody>
          <tr><td class="rowlbl">Lowest</td><td>${cell(sc?.low)}</td><td>${psfCell(sc?.lowPsf)}</td></tr>
          <tr><td class="rowlbl">Median</td><td>${cell(sc?.median)}</td><td>${psfCell(sc?.medianPsf)}</td></tr>
          <tr><td class="rowlbl">Highest</td><td>${cell(sc?.high)}</td><td>${psfCell(sc?.highPsf)}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // ─── CMA Summary ───
  const cmaBlock = `
    <div>
      <h3 class="ps-title">CMA Summary <span style="font-family: var(--t-font-mono); font-size: 8.5px; font-weight: 500; color: var(--t-accent); letter-spacing: 0.12em; margin-left: 6px;">${cma ? "AGENT-SELECTED" : "NOT YET RUN"}</span></h3>
      <div style="font-size: 9px; color: var(--t-text-mute); margin-bottom: 4px;">${cma ? `${cma.adjustedComps?.length || 0} comps selected by agent · adjustments applied` : "Run a CMA to populate this section"}</div>
      <table class="t3">
        <tbody>
          <tr><td class="rowlbl" style="width: 55%;">Average of Comps</td><td style="text-align: right; font-family: var(--t-font-mono);">${cell(cma?.averageOfComps)}</td></tr>
          <tr><td class="rowlbl">Total Adjustments</td><td style="text-align: right; font-family: var(--t-font-mono);">${cma && cma.totalAdjustment != null ? `${cma.totalAdjustment >= 0 ? "+" : ""}${fmt$(cma.totalAdjustment)}` : "—"}</td></tr>
          <tr><td class="rowlbl">CMA Result</td><td style="text-align: right; font-family: var(--t-font-mono); font-weight: 700; color: var(--t-accent);">${cell(cma?.recommendedPrice)}</td></tr>
          <tr><td class="rowlbl">Result $/sqft</td><td style="text-align: right; font-family: var(--t-font-mono);">${psfCell(cma?.recommendedPricePerSqft)}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // ─── Refined Value ───
  const refinedBlock = `
    <h3 class="ps-title" style="margin-top: 18px;">Refined Value Summary</h3>
    <div style="background: var(--t-card-bg); border: 1px solid var(--t-card-border); padding: 16px 22px;">
      <table class="rv-table">
        <tbody>
          <tr>
            <td>Original Estimated Value (Genie AVM™)</td>
            <td>${cell(refined?.original ?? data.avmValue)}</td>
          </tr>
          <tr>
            <td>Changes Based on Home Facts</td>
            <td>${fmtSigned(refined?.changesHomeFacts)}</td>
          </tr>
          <tr>
            <td>Home Improvement Adjustments</td>
            <td>${fmtSigned(refined?.homeImprovements)}</td>
          </tr>
          <tr>
            <td>Needed Improvement Adjustments</td>
            <td>${fmtSigned(refined?.neededImprovements)}</td>
          </tr>
          <tr>
            <td>Market Condition Adjustments</td>
            <td>${fmtSigned(refined?.marketConditions)}</td>
          </tr>
          <tr class="total">
            <td>Estimate + Adjustments</td>
            <td>${cell(refined?.total ?? data.avmValue)}${refined?.totalPsf ? ` <span style="font-family: var(--t-font-sans); font-weight: 500; font-size: 10px; color: var(--t-text-mute);">· ${psfCell(refined.totalPsf)}/sqft</span>` : ""}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const body = `
    <h2 class="section-title">Pricing Strategy &amp; Refined Value</h2>
    <div class="section-sub">CMA workbench · agent-editable</div>

    <h3 class="ps-title">Pricing Strategy · Comparable Groups</h3>
    ${psTable}

    <div class="two-col" style="margin-top: 16px;">
      ${soldCompBlock}
      ${cmaBlock}
    </div>

    ${refinedBlock}

    <p style="font-size: 9px; color: var(--t-text-mute); margin-top: 16px; line-height: 1.5;">
      Refined values reflect the agent's professional judgment and are not a formal appraisal. Adjustments are agent-editable; rows marked "—" can be populated from the CMA workbench.
    </p>
  `;

  return pageWithBand(data, branding, pageNum, totalPages, generatedAt, theme, body, "p12");
}

function fmtSigned(n?: number | null): string {
  if (n == null || isNaN(Number(n))) return "—";
  const v = Number(n);
  if (v === 0) return "$0";
  return v > 0 ? `+$${v.toLocaleString()}` : `−$${Math.abs(v).toLocaleString()}`;
}
