/**
 * Seller Report v2 — Page 4: Interior & Exterior Features.
 *
 * Two tables, each split into Listing-side and Public-side columns.
 * Rows pulled from interiorFeatures / exteriorFeatures arrays when
 * present, plus specific public-record fields on the root data object.
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import type { ThemeTokens } from "../themes";
import { esc, pageWithBand } from "../shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function pageFeatures(data: SellerReportData, branding: AgentBranding, pageNum: number, totalPages: number, generatedAt: string, theme: ThemeTokens): string {
  const d = data as any;

  const feat = (arr?: Array<{ label: string; value: string }>) => {
    const map = new Map<string, string>();
    (arr || []).forEach((f) => f && f.label && map.set(f.label.toLowerCase(), f.value));
    return map;
  };
  const interior = feat(data.interiorFeatures);
  const exterior = feat(data.exteriorFeatures);

  const pickListing = (map: Map<string, string>, keys: string[]) => {
    for (const k of keys) {
      const v = map.get(k.toLowerCase());
      if (v) return v;
    }
    return "";
  };
  const cell = (s?: any) => (s == null || s === "" ? "—" : esc(String(s)));

  // INTERIOR — listing-side rows (from interiorFeatures array)
  const interiorListingRows = [
    ["Floor / Flooring", pickListing(interior, ["Floor", "Flooring", "Flooring Type"])],
    ["Interior Features", pickListing(interior, ["Interior Features", "General Features", "Features"])],
    ["Appliances", pickListing(interior, ["Appliances", "Kitchen Appliances"])],
    ["Total Rooms", pickListing(interior, ["Total Rooms"])],
    ["Fireplace", pickListing(interior, ["Fireplace"])],
    ["Laundry", pickListing(interior, ["Laundry", "Laundry Features"])],
  ].filter(([, v]) => v);

  const interiorPublicRows = [
    ["Base Area", data.sqft ? `${data.sqft.toLocaleString()} sqft` : ""],
    ["Floor Cover", d.floorCover || pickListing(interior, ["Interior Structure"])],
    ["Interior Walls", d.interiorWalls || pickListing(interior, ["Interior Walls"])],
    ["Plumbing Fixtures", d.plumbingFixtures || pickListing(interior, ["Plumbing Fixtures"])],
    ["Fireplaces", data.fireplaceCount],
    ["Basement", data.basementType ? `${data.basementType}${data.basementSize ? ` (${data.basementSize.toLocaleString()} sqft)` : ""}` : ""],
  ].filter(([, v]) => v != null && v !== "");

  // EXTERIOR
  const exteriorListingRows = [
    ["Construction", pickListing(exterior, ["Construction", "Construction Materials"]) || data.constructionType],
    ["Security", pickListing(exterior, ["Security", "Security Features"])],
    ["Road", pickListing(exterior, ["Road", "Road Surface"])],
    ["Parking", pickListing(exterior, ["Parking", "Parking Features"]) || data.parkingType],
    ["Parking Spaces", data.parkingSpaces || data.garageSpaces],
    ["Utilities", pickListing(exterior, ["Utilities", "Utility Features"])],
    ["View", pickListing(exterior, ["View"])],
    ["Lot Features", pickListing(exterior, ["Lot Size Features", "Lot Features"])],
    ["Roof", pickListing(exterior, ["Roof"]) || data.roofType],
    ["Pool", pickListing(exterior, ["Pool"]) || (data.pool === true ? "Yes" : data.pool === false ? "No" : "")],
    ["Levels / Stories", data.stories ? String(data.stories) : ""],
  ].filter(([, v]) => v != null && v !== "");

  const exteriorPublicRows = [
    ["Lot Size (sqft)", data.lotSizeSqft ? data.lotSizeSqft.toLocaleString() : ""],
    ["Lot Size (acres)", data.lotSizeAcres],
    ["Roof Type", data.roofType],
    ["Effective Year Built", d.effectiveYearBuilt],
    ["Building Condition", data.condition],
    ["Building Quality", d.buildingQuality],
    ["HOA", pickListing(exterior, ["HOA"])],
  ].filter(([, v]) => v != null && v !== "");

  const renderTable = (rows: Array<Array<any>>) => {
    if (rows.length === 0) return `<tr><td colspan="2" class="muted" style="text-align: center; padding: 14px;">—</td></tr>`;
    return rows.map(([label, value]) => `
      <tr>
        <td class="rowlbl" style="width: 40%;">${esc(String(label))}</td>
        <td>${cell(value)}</td>
      </tr>
    `).join("");
  };

  const body = `
    <h2 class="section-title">Interior &amp; Exterior Features</h2>
    <div class="section-sub">Listing vs Public Records</div>

    <h3 class="block-title">Interior Features</h3>
    <div class="two-col">
      <div>
        <div style="font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.14em; color: var(--t-accent); text-transform: uppercase; margin-bottom: 6px;">Listing</div>
        <table class="t3"><tbody>${renderTable(interiorListingRows)}</tbody></table>
      </div>
      <div>
        <div style="font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.14em; color: var(--t-text-mute); text-transform: uppercase; margin-bottom: 6px;">Public Records</div>
        <table class="t3"><tbody>${renderTable(interiorPublicRows)}</tbody></table>
      </div>
    </div>

    <h3 class="block-title" style="margin-top: 18px;">Exterior Features</h3>
    <div class="two-col">
      <div>
        <div style="font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.14em; color: var(--t-accent); text-transform: uppercase; margin-bottom: 6px;">Listing</div>
        <table class="t3"><tbody>${renderTable(exteriorListingRows)}</tbody></table>
      </div>
      <div>
        <div style="font-family: var(--t-font-mono); font-size: 9px; letter-spacing: 0.14em; color: var(--t-text-mute); text-transform: uppercase; margin-bottom: 6px;">Public Records</div>
        <table class="t3"><tbody>${renderTable(exteriorPublicRows)}</tbody></table>
      </div>
    </div>
  `;

  return pageWithBand(data, branding, pageNum, totalPages, generatedAt, theme, body, "p4");
}
