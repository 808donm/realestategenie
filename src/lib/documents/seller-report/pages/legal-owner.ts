/**
 * Seller Report v2 — Page 5: Legal · Owner · Hazards · Sales History.
 *
 * Four compact sections on one page. Hawaii-specific hazard rows
 * (Flood / Tsunami / Sea Level Rise / Cesspool) always render —
 * populated when available, "—" otherwise (endpoint ships later).
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import type { ThemeTokens } from "../themes";
import { esc, fmt$, fmtDate, pageWithBand } from "../shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function pageLegalOwner(data: SellerReportData, branding: AgentBranding, pageNum: number, totalPages: number, generatedAt: string, theme: ThemeTokens): string {
  const d = data as any;

  const v = (x?: any) => (x == null || x === "" ? "—" : esc(String(x)));
  const bool = (x?: any) => (x === "Y" || x === true ? "Yes" : x === "N" || x === false ? "No" : v(x));

  // ─── LEGAL DESCRIPTION ───
  const legalRows: Array<[string, string]> = [
    ["Parcel Number (APN/TMK)", v(data.apn)],
    ["County", v(data.county)],
    ["Zoning", v(data.legal?.zoning)],
    ["Census Tract", v(data.legal?.censusTract)],
    ["Subdivision", v(data.legal?.subdivision)],
    ["Block / Tract", [data.legal?.block, data.legal?.tract].filter(Boolean).join(" / ") || "—"],
    ["Current Use", v(d.currentUse)],
  ];
  const legalDesc = data.legal?.legalDescription;

  // ─── OWNER FACTS ───
  const ownerRows: Array<[string, string]> = [
    ["Owner Name (Public)", v(data.owner1)],
    ["Owner Name 2 (Public)", v(data.owner2)],
    ["Time Owned", v(d.timeOwned)],
    ["Owner Occupied", bool(data.ownerOccupied)],
    ["Absentee Owner", data.absenteeOwner === "A" || data.absenteeOwner === "Y" || data.absenteeOwner === "O" ? "Yes" : bool(data.absenteeOwner)],
    ["Corporate Owner", bool(data.corporateOwner)],
    ["Mailing Address", v(data.mailingAddress)],
    ["Vesting", v(data.deed?.buyerVesting)],
  ];

  // ─── HAZARDS ───
  // Pull named hazards out of the generic hazards array plus federal flood.
  const hazardMap = new Map<string, { value: string; sub?: string }>();
  (data.hazards || []).forEach((h) => {
    if (h && h.label) hazardMap.set(h.label.toLowerCase(), { value: h.value });
  });
  const hz = (keys: string[]) => {
    for (const k of keys) {
      const hit = hazardMap.get(k.toLowerCase());
      if (hit) return hit.value;
    }
    return null;
  };
  const flood = hz(["Flood Zone", "FEMA Flood", "Flood"]) || data.federalData?.floodZone;
  const tsunami = hz(["Tsunami Evacuation Zone", "Tsunami Zone", "Tsunami"]);
  const slr = hz(["Sea Level Rise", "SLR Exposure", "Sea Level Rise Exposure"]);
  const cesspool = hz(["Cesspool Priority", "Cesspool", "Cesspool Zone"]);

  const hazardBadges = [
    { label: "Flood Zone", value: flood, hi: false },
    { label: "Tsunami Evac Zone", value: tsunami, hi: true },
    { label: "Sea Level Rise", value: slr, hi: true },
    { label: "Cesspool Priority", value: cesspool, hi: true },
  ].map((h) => `
    <div class="hazard${h.hi ? " hi" : ""}">
      <div class="hlabel">${esc(h.label)}</div>
      <div class="hval">${h.value ? esc(String(h.value)) : "—"}</div>
      ${h.hi && !h.value ? `<div class="hsub">Hawaii-specific lookup</div>` : ""}
    </div>
  `).join("");

  // ─── SALES HISTORY ───
  const sales = (data.salesHistory || []).slice(0, 5);
  const salesRows = sales.length > 0
    ? sales.map((s) => {
        const amt = typeof s.amount === "object" ? (s.amount as any)?.saleAmt : s.amount;
        const amtDisplay = amt == null ? "—" : amt <= 100 ? "Price Not Disclosed" : fmt$(amt);
        return `
          <tr>
            <td>${esc(fmtDate(s.date || s.recordingDate || null))}</td>
            <td>${amtDisplay}</td>
            <td>${v((s.buyer || "").substring(0, 36))}</td>
            <td>${v((s.seller || "").substring(0, 36))}</td>
            <td class="muted">${v(s.docType)}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="5" class="muted" style="text-align: center; padding: 14px;">No sales history on record.</td></tr>`;

  const renderKV = (rows: Array<[string, string]>) => rows.map(([l, val]) => `
    <tr><td class="rowlbl" style="width: 48%;">${esc(l)}</td><td>${val}</td></tr>
  `).join("");

  const body = `
    <h2 class="section-title">Legal · Owner · Hazards · Sales History</h2>
    <div class="section-sub">Public records · Hawaii-specific hazards</div>

    <div class="two-col">
      <div>
        <h3 class="block-title">Legal Description</h3>
        <table class="t3"><tbody>${renderKV(legalRows)}</tbody></table>
        ${legalDesc ? `<div style="margin-top: 6px; font-size: 9px; color: var(--t-text-mute); line-height: 1.5;"><strong>Legal:</strong> ${esc(String(legalDesc).substring(0, 280))}</div>` : ""}
      </div>
      <div>
        <h3 class="block-title">Owner Facts</h3>
        <table class="t3"><tbody>${renderKV(ownerRows)}</tbody></table>
      </div>
    </div>

    <h3 class="block-title" style="margin-top: 18px;">Location &amp; Hazards</h3>
    <div style="font-size: 9px; color: var(--t-text-mute); margin-bottom: 6px;">
      Flood zone from FEMA NRI. Tsunami / Sea Level Rise / Cesspool Priority from Hawaii State GIS and DOH (Hawaii properties).
    </div>
    <div class="hazard-grid" style="grid-template-columns: repeat(4, 1fr);">${hazardBadges}</div>

    <h3 class="block-title" style="margin-top: 18px;">Sales History</h3>
    <table class="t3">
      <thead>
        <tr>
          <th style="width: 15%;">Date</th>
          <th style="width: 18%;">Amount</th>
          <th style="width: 24%;">Buyer</th>
          <th style="width: 24%;">Seller</th>
          <th style="width: 19%;">Document Type</th>
        </tr>
      </thead>
      <tbody>${salesRows}</tbody>
    </table>
  `;

  return pageWithBand(data, branding, pageNum, totalPages, generatedAt, theme, body, "p5");
}
