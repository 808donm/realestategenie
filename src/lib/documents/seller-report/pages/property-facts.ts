/**
 * Seller Report v2 — Page 3: Property Facts
 *
 * Three-column table: Public Records · Listing · Agent Refinements.
 * Empty cells render "—". Agent column stays dashes until agent
 * refinements UI lands.
 */

import type { SellerReportData } from "../../seller-report-pdf";
import type { AgentBranding } from "../../pdf-report-utils";
import type { ThemeTokens } from "../themes";
import { esc, pageWithBand } from "../shell";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function pagePropertyFacts(data: SellerReportData, branding: AgentBranding, pageNum: number, totalPages: number, generatedAt: string, theme: ThemeTokens): string {
  const d = data as any;

  const num = (n?: number | null, unit = "") => (n == null || isNaN(Number(n)) ? "—" : `${Number(n).toLocaleString()}${unit}`);
  const bool = (v?: any) => (v === true || v === "Y" ? "Yes" : v === false || v === "N" ? "No" : v ? esc(String(v)) : "—");
  const str = (v?: any) => (v == null || v === "" ? "—" : esc(String(v)));

  // Build row: [label, publicValue, listingValue]. Agent column always "—" for v1.
  const rows: Array<[string, string, string]> = [
    ["Property Type", str(data.propertyType), d.listingPropertyType ? str(d.listingPropertyType) : "—"],
    ["Property Subtype", str(d.propertySubtype), str(d.listingPropertySubtype)],
    ["Bedrooms", num(data.beds), d.listingBeds != null ? num(d.listingBeds) : "—"],
    ["Bathrooms (Total)", num(data.baths), d.listingBathsTotal != null ? num(d.listingBathsTotal) : "—"],
    ["Full Baths", num(d.bathsFull), "—"],
    ["Partial Baths", num(d.bathsPartial), "—"],
    ["Living Area", num(data.sqft, " sqft"), d.listingLivingArea ? num(d.listingLivingArea, " sqft") : "—"],
    ["Building Area", num(d.buildingArea, " sqft"), "—"],
    ["Lot Size", data.lotSizeSqft ? `${num(data.lotSizeSqft, " sqft")}${data.lotSizeAcres ? ` (${data.lotSizeAcres} ac)` : ""}` : "—", "—"],
    ["Lot Dimensions", str(d.lotDimensions), "—"],
    ["Garage", bool(data.garageSpaces || d.garage), "—"],
    ["Garage Spaces", str(data.garageSpaces || d.garageCount), "—"],
    ["Parking", str(data.parkingType || data.parkingSpaces), "—"],
    ["Pool", bool(data.pool), "—"],
    ["Year Built", num(data.yearBuilt), "—"],
    ["Year Built (Effective)", num(d.effectiveYearBuilt), "—"],
    ["Total Rooms", num(d.totalRooms), "—"],
    ["Stories", num(data.stories), "—"],
    ["Units", num(d.units), "—"],
    ["Construction", str(data.constructionType), "—"],
    ["Exterior Walls", str(d.exteriorWalls), "—"],
    ["Foundation", str(data.foundationType), "—"],
    ["Roofing", str(data.roofType), "—"],
    ["Heating", str(data.heatingType), "—"],
    ["Cooling", str(data.coolingType), "—"],
    ["Basement", data.basementType ? `${esc(data.basementType)}${data.basementSize ? ` (${num(data.basementSize, " sqft")})` : ""}` : "—", "—"],
    ["Condition", str(data.condition), "—"],
  ];

  const tbody = rows.map(([label, pub, list]) => `
    <tr>
      <td class="rowlbl">${esc(label)}</td>
      <td>${pub}</td>
      <td>${list}</td>
      <td class="muted">—</td>
    </tr>
  `).join("");

  const body = `
    <h2 class="section-title">Property Facts</h2>
    <div class="section-sub">Public Records · Listing · Agent Refinements</div>

    <table class="t3">
      <thead>
        <tr>
          <th style="width: 28%;">&nbsp;</th>
          <th style="width: 24%;">Public Records</th>
          <th style="width: 24%;">Listing</th>
          <th style="width: 24%;">Agent Refinements</th>
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>

    <p style="font-size: 9px; color: var(--t-text-mute); margin-top: 14px; line-height: 1.5;">
      Public records sourced from county assessor and Bureau of Conveyances. Listing data reflects the current MLS listing if active. Agent refinements are custom corrections from the listing agent and supersede automated fields.
    </p>
  `;

  return pageWithBand(data, branding, pageNum, totalPages, generatedAt, theme, body, "p3");
}
