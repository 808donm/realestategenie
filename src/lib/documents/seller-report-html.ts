/**
 * Seller Report HTML Template
 *
 * Generates a complete HTML document string that Puppeteer renders to PDF.
 * Matches RPR Seller Report quality with rich layouts, charts, and photos.
 */

import { getReportBaseStyles, buildPageHeader, buildPageFooter } from "./html-to-pdf";
import type { SellerReportData } from "./seller-report-pdf";
import type { AgentBranding } from "./pdf-report-utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fmt$ = (n?: number | null) => (n != null ? `$${n.toLocaleString()}` : "-");
const fmtDate = (d?: string | null): string => {
  if (!d) return "-";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
};

function escHtml(s?: string | null): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generate the complete HTML document for a Seller Report.
 */
export function buildSellerReportHtml(data: SellerReportData, branding: AgentBranding): string {
  const cityLine = [data.city, data.state, data.zip].filter(Boolean).join(", ");
  const price = data.listPrice || data.avmValue;
  const date = data.generatedAt || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const header = buildPageHeader("Seller Report", `${escHtml(data.address)}, ${escHtml(cityLine)}`);
  const footer = buildPageFooter(date, branding.displayName);

  // Helper for data rows
  const row = (label: string, value?: string | number | null) => {
    if (value == null || value === "" || value === "-") return "";
    return `<div class="data-row"><span class="dr-label">${escHtml(label)}</span><span class="dr-value">${escHtml(String(value))}</span></div>`;
  };

  // ── Cover Page ──
  const coverPage = `
    <div class="cover-page">
      <div class="cover-title">
        ${escHtml(data.address)}
        <div class="cover-subtitle">${escHtml(cityLine)}</div>
      </div>
      <div class="cover-gold"></div>
      ${data.primaryPhotoData ? `<div style="margin: 20px auto; max-width: 500px;"><img src="${data.primaryPhotoData}" style="width: 100%; border-radius: 8px;" /></div>` : ""}
      <div class="agent-branding" style="justify-content: center; border: none; margin-top: 30px;">
        ${branding.headshotData ? `<img class="headshot" src="${branding.headshotData}" />` : ""}
        <div style="text-align: left;">
          <div class="ab-name">${escHtml(branding.displayName)}</div>
          <div class="ab-detail">${branding.licenseNumber ? `Lic# ${escHtml(branding.licenseNumber)} | ` : ""}${escHtml(branding.phone || "")} | ${escHtml(branding.brokerageName || "Real Estate Genie")}</div>
          <div class="ab-detail">${escHtml(cityLine)}</div>
        </div>
      </div>
      <div style="margin-top: 20px; font-size: 12px; color: #6b7280;">Generated: ${escHtml(date)}</div>
    </div>
  `;

  // ── Valuation Page ──
  const listingBadge = data.listingStatus
    ? `<div style="margin-bottom: 12px;"><span class="status-badge active">${escHtml(data.listingStatus)} / For Sale</span>${data.listPrice ? ` &nbsp; List Price: <strong>${fmt$(data.listPrice)}</strong>` : ""}${data.mlsNumber ? ` &nbsp; MLS# ${escHtml(data.mlsNumber)}` : ""}</div>`
    : "";

  const valCards = [
    data.avmValue != null ? `<div class="value-card"><div class="vc-label">Estimated Value</div><div class="vc-value">${fmt$(data.avmValue)}</div>${data.avmDate ? `<div class="vc-sub">As of ${escHtml(data.avmDate)}</div>` : ""}</div>` : "",
    data.cma ? `<div class="value-card gold"><div class="vc-label">CMA Value</div><div class="vc-value">${fmt$(data.cma.recommendedPrice)}</div><div class="vc-sub">Based on ${data.cma.adjustedComps.length} comps</div></div>` : "",
    data.lastSalePrice != null ? `<div class="value-card"><div class="vc-label">Last Sale</div><div class="vc-value">${fmt$(data.lastSalePrice)}</div><div class="vc-sub">${fmtDate(data.lastSaleDate)}</div></div>` : "",
    data.estimatedEquity != null ? `<div class="value-card ${data.estimatedEquity >= 0 ? "green" : "red"}"><div class="vc-label">Est. Equity</div><div class="vc-value">${data.estimatedEquity >= 0 ? "+" : ""}${fmt$(data.estimatedEquity)}</div></div>` : "",
  ].filter(Boolean).join("");

  // AVM Range Bar
  const avmBar = (data.avmLow != null && data.avmHigh != null && data.avmValue != null) ? (() => {
    const range = data.avmHigh! - data.avmLow!;
    const pct = range > 0 ? ((data.avmValue! - data.avmLow!) / range) * 100 : 50;
    return `
      <div class="avm-bar-container avoid-break">
        <div class="avm-bar-value">${fmt$(data.avmValue)}</div>
        <div class="avm-bar"><div class="avm-dot" style="left: ${pct}%;"></div></div>
        <div class="avm-bar-labels"><span>${fmt$(data.avmLow)}</span><span>${fmt$(data.avmHigh)}</span></div>
      </div>
    `;
  })() : "";

  // CMA Range
  const cmaRange = data.cma ? `
    <div style="padding: 10px 16px; background: #fffbeb; border-radius: 6px; border: 1px solid #fde68a; margin: 8px 0;" class="avoid-break">
      <div style="font-size: 9px; font-weight: 700; color: #92400e; text-transform: uppercase;">CMA Range</div>
      <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; margin-top: 4px;">
        <span>${fmt$(data.cma.cmaRange.low)}</span>
        <span style="color: #92400e;">${fmt$(data.cma.recommendedPrice)}</span>
        <span>${fmt$(data.cma.cmaRange.high)}</span>
      </div>
    </div>
  ` : "";

  // ── Property Information ──
  const propFacts = `
    <div class="section-title">Property Facts</div>
    <div class="two-col">
      <div>
        ${row("Property Type", data.propertyType)}
        ${row("Year Built", data.yearBuilt)}
        ${row("Bedrooms", data.beds)}
        ${row("Bathrooms", data.baths)}
        ${row("Living Area", data.sqft ? `${data.sqft.toLocaleString()} sqft` : null)}
        ${row("Lot Size", data.lotSizeSqft ? `${data.lotSizeSqft.toLocaleString()} sqft` : null)}
      </div>
      <div>
        ${row("Stories", data.stories)}
        ${row("Parking", data.garageSpaces)}
        ${row("Pool", data.pool != null ? (data.pool ? "Yes" : "No") : null)}
        ${row("APN / TMK", data.apn)}
        ${row("County", data.county)}
        ${row("Land Tenure", data.ownershipType)}
      </div>
    </div>
  `;

  // Building details
  const buildingDetails = (data.constructionType || data.roofType || data.heatingType) ? `
    <div class="section-title">Building Details</div>
    <div class="two-col">
      <div>
        ${row("Architecture", data.architectureStyle)}
        ${row("Construction", data.constructionType)}
        ${row("Condition", data.condition)}
        ${row("Roof", data.roofType)}
      </div>
      <div>
        ${row("Foundation", data.foundationType)}
        ${row("Heating", data.heatingType)}
        ${row("Cooling", data.coolingType)}
        ${row("Fireplaces", data.fireplaceCount)}
        ${row("Basement", data.basementType ? `${data.basementType}${data.basementSize ? ` (${data.basementSize.toLocaleString()} sqft)` : ""}` : null)}
      </div>
    </div>
  ` : "";

  // Interior/Exterior features
  const interiorSection = (data.interiorFeatures && data.interiorFeatures.length > 0) ? `
    <div class="section-title">Interior Features</div>
    ${data.interiorFeatures.map((f) => row(f.label, f.value)).join("")}
  ` : "";

  const exteriorSection = (data.exteriorFeatures && data.exteriorFeatures.length > 0) ? `
    <div class="section-title">Exterior Features</div>
    ${data.exteriorFeatures.map((f) => row(f.label, f.value)).join("")}
  ` : "";

  // MLS Description
  const descSection = data.listingDescription ? `
    <div class="section-title">Listing Description</div>
    <div style="font-size: 11px; color: #374151; line-height: 1.7; padding: 10px 14px; background: #f9fafb; border-radius: 6px;">
      ${escHtml(data.listingDescription.substring(0, 1000))}
    </div>
  ` : "";

  // Legal Description
  const legalSection = (data.legal || data.apn) ? `
    <div class="section-title">Legal Description</div>
    <div class="two-col">
      <div>
        ${row("Parcel Number", data.apn)}
        ${row("County", data.county)}
        ${row("Zoning", data.legal?.zoning)}
      </div>
      <div>
        ${row("Census Tract", data.legal?.censusTract)}
        ${row("Subdivision", data.legal?.subdivision)}
      </div>
    </div>
    ${data.legal?.legalDescription ? `<div style="margin-top: 8px; font-size: 10px; color: #6b7280;"><strong>Legal Description:</strong> ${escHtml(data.legal.legalDescription.substring(0, 300))}</div>` : ""}
  ` : "";

  // Owner Facts
  const ownerSection = (data.owner1 || data.owner2) ? `
    <div class="section-title">Owner Facts</div>
    <div class="two-col">
      <div>
        ${row("Owner Name (Public)", data.owner1)}
        ${data.owner2 ? row("Owner Name 2 (Public)", data.owner2) : ""}
        ${row("Owner Occupied", data.ownerOccupied === "Y" ? "Yes" : data.ownerOccupied === "N" ? "No" : data.ownerOccupied)}
      </div>
      <div>
        ${row("Absentee Owner", data.absenteeOwner === "A" || data.absenteeOwner === "Y" ? "Yes" : data.absenteeOwner)}
        ${row("Corporate Owner", data.corporateOwner === "Y" ? "Yes" : data.corporateOwner === "N" ? "No" : data.corporateOwner)}
        ${row("Mailing Address", data.mailingAddress)}
        ${data.deed?.buyerVesting ? row("Vesting", data.deed.buyerVesting) : ""}
      </div>
    </div>
  ` : "";

  // Location Details
  const locationSection = (data.legal?.subdivision || data.federalData?.floodZone) ? `
    <div class="section-title">Location Details</div>
    ${row("Subdivision", data.legal?.subdivision)}
    ${row("Zoning", data.legal?.zoning)}
    ${row("Flood Zone", data.federalData?.floodZone)}
  ` : "";

  // Tax Assessment
  let taxSection = "";
  if (data.taxHistory && data.taxHistory.length > 0) {
    const taxRows = data.taxHistory.slice(0, 5).map((t) => `
      <tr>
        <td><strong>${t.year}</strong></td>
        <td class="num">${fmt$(t.assessedLand || t.marketLand)}</td>
        <td class="num">${fmt$(t.assessedImpr || t.marketImpr)}</td>
        <td class="num">${fmt$(t.assessedTotal || t.marketTotal)}</td>
        <td class="num">${fmt$(t.taxAmount)}</td>
      </tr>
    `).join("");
    taxSection = `
      <div class="section-title">Tax History</div>
      <table class="comp-table avoid-break">
        <thead><tr><th>Year</th><th>Land</th><th>Improvements</th><th>Total Assessed</th><th>Tax Amount</th></tr></thead>
        <tbody>${taxRows}</tbody>
      </table>
    `;
  } else if (data.assessedTotal != null || data.taxAmount != null) {
    taxSection = `
      <div class="section-title">Tax Assessment</div>
      ${row("Assessed Total", fmt$(data.assessedTotal))}
      ${row("Land Value", fmt$(data.assessedLand))}
      ${row("Improvement Value", fmt$(data.assessedImpr))}
      ${row("Market Value", fmt$(data.marketTotal))}
      ${row("Annual Tax", fmt$(data.taxAmount))}
      ${row("Tax Year", data.taxYear)}
    `;
  }

  // Equity Section
  let equitySection = "";
  if (data.loanBalance != null || data.estimatedEquity != null) {
    const eqCards = [
      data.avmValue != null ? `<div class="value-card dark"><div class="vc-label">Property Value</div><div class="vc-value">${fmt$(data.avmValue)}</div></div>` : "",
      data.loanBalance != null ? `<div class="value-card dark"><div class="vc-label">Loan Balance</div><div class="vc-value">${fmt$(data.loanBalance)}</div></div>` : "",
      data.estimatedEquity != null ? `<div class="value-card ${data.estimatedEquity >= 0 ? "green" : "red"}"><div class="vc-label">Estimated Equity</div><div class="vc-value">${data.estimatedEquity >= 0 ? "+" : ""}${fmt$(data.estimatedEquity)}</div></div>` : "",
    ].filter(Boolean).join("");

    let equityBar = "";
    if (data.avmValue && data.loanBalance && data.avmValue > 0) {
      const loanPct = Math.min(100, (data.loanBalance / data.avmValue) * 100);
      equityBar = `<div class="equity-bar"><div class="eb-loan" style="width: ${loanPct}%;"></div><div class="eb-equity" style="width: ${100 - loanPct}%;"></div></div>`;
    }

    equitySection = `
      <div class="section-title">Estimated Equity</div>
      <div class="value-cards">${eqCards}</div>
      ${equityBar}
      ${row("Lender", data.lender)}
      ${row("Loan Type", data.loanType)}
      ${row("LTV Ratio", data.ltv != null ? `${data.ltv.toFixed(1)}%` : null)}
    `;
  }

  // Photos
  const photos = data.photoGalleryData || [];
  const photoSection = photos.length > 0 ? `
    <div class="page-break"></div>
    ${header}
    <div class="big-section-header">Photos</div>
    <div class="photo-grid large">${photos.slice(0, 16).map((url) => `<img src="${url}" />`).join("")}</div>
  ` : "";

  // Market Trends
  let marketSection = "";
  if (data.marketStats || data.marketType) {
    const marketArrowPos = data.marketType === "sellers" ? "16%" : data.marketType === "buyers" ? "83%" : "50%";
    const marketCards = [
      data.monthsOfInventory != null ? `<div class="value-card dark"><div class="vc-label">Months Inventory</div><div class="vc-value">${data.monthsOfInventory.toFixed(1)}</div></div>` : "",
      data.soldToListRatio != null ? `<div class="value-card dark"><div class="vc-label">Sold-to-List %</div><div class="vc-value">${data.soldToListRatio.toFixed(1)}%</div></div>` : "",
      data.marketStats?.avgDOM != null ? `<div class="value-card dark"><div class="vc-label">Median DOM</div><div class="vc-value">${data.marketStats.avgDOM}</div></div>` : "",
      data.marketStats?.medianPrice != null ? `<div class="value-card dark"><div class="vc-label">Median Sold</div><div class="vc-value">${fmt$(data.marketStats.medianPrice)}</div></div>` : "",
    ].filter(Boolean).join("");

    marketSection = `
      <div class="section-title">Market Trends</div>
      <div class="avoid-break">
        <div style="position: relative; margin-bottom: 4px;">
          <div class="market-arrow" style="position: absolute; left: ${marketArrowPos}; transform: translateX(-50%);"></div>
        </div>
        <div class="market-indicator" style="margin-top: 14px;">
          <div class="mi-sellers"></div><div class="mi-balanced"></div><div class="mi-buyers"></div>
        </div>
        <div class="market-indicator-labels">
          <span>Seller's Market</span><span>Balanced</span><span>Buyer's Market</span>
        </div>
      </div>
      <div class="value-cards">${marketCards}</div>
      ${data.marketStats ? `
        ${row("Active Listings", data.marketStats.totalListings)}
        ${row("Price per Sqft", data.marketStats.pricePerSqft ? `$${data.marketStats.pricePerSqft.toLocaleString()}` : null)}
      ` : ""}
    `;
  }

  // Sales History
  let salesSection = "";
  if (data.salesHistory && data.salesHistory.length > 0) {
    const salesRows = data.salesHistory.slice(0, 10).map((s, i) => {
      const amt = typeof s.amount === "object" ? (s.amount as any)?.saleAmt : s.amount;
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${fmtDate(s.date)}</td>
          <td class="num">${amt != null ? fmt$(amt) : "-"}</td>
          <td>${escHtml((s.buyer || "-").substring(0, 25))}</td>
          <td>${escHtml((s.seller || "-").substring(0, 25))}</td>
        </tr>
      `;
    }).join("");
    salesSection = `
      <div class="section-title">Sales History</div>
      <table class="comp-table avoid-break">
        <thead><tr><th></th><th>Date</th><th>Amount</th><th>Buyer</th><th>Seller</th></tr></thead>
        <tbody>${salesRows}</tbody>
      </table>
    `;
  }

  // Comparable Sales
  let compsSection = "";
  if (data.comps && data.comps.length > 0) {
    const compRows = data.comps.slice(0, 10).map((c) => `
      <tr>
        <td>${escHtml((c.address || "-").substring(0, 35))}</td>
        <td class="num">${c.price != null ? fmt$(c.price) : "-"}</td>
        <td>${c.beds || "?"}/${c.baths || "?"}</td>
        <td class="num">${c.sqft ? c.sqft.toLocaleString() : "-"}</td>
        <td>${fmtDate(c.closeDate)}</td>
        <td class="num">${c.correlation != null ? `${Math.round(c.correlation <= 1 ? c.correlation * 100 : c.correlation)}%` : "-"}</td>
      </tr>
    `).join("");
    compsSection = `
      <div class="section-title">Comparable Sales</div>
      <table class="comp-table avoid-break">
        <thead><tr><th>Address</th><th>Price</th><th>Bd/Ba</th><th>Sqft</th><th>Closed</th><th>Match</th></tr></thead>
        <tbody>${compRows}</tbody>
      </table>
    `;
  }

  // Pricing Strategy
  let pricingSection = "";
  if (data.pricingStrategy) {
    const ps = data.pricingStrategy;
    pricingSection = `
      <div class="page-break"></div>
      ${header}
      <div class="big-section-header">Pricing Strategy</div>
      <table class="comp-table avoid-break">
        <thead><tr><th></th><th>For Sale Listings</th><th>Distressed</th><th>Expired</th><th>Closed</th></tr></thead>
        <tbody>
          <tr><td><strong>Lowest Price</strong></td><td class="num">${fmt$(ps.forSale?.lowest)}</td><td class="num">${fmt$(ps.distressed?.lowest)}</td><td class="num">${fmt$(ps.expired?.lowest)}</td><td class="num">${fmt$(ps.closed?.lowest)}</td></tr>
          <tr><td><strong>Median Price</strong></td><td class="num">${fmt$(ps.forSale?.median)}</td><td class="num">${fmt$(ps.distressed?.median)}</td><td class="num">${fmt$(ps.expired?.median)}</td><td class="num">${fmt$(ps.closed?.median)}</td></tr>
          <tr><td><strong>Highest Price</strong></td><td class="num">${fmt$(ps.forSale?.highest)}</td><td class="num">${fmt$(ps.distressed?.highest)}</td><td class="num">${fmt$(ps.expired?.highest)}</td><td class="num">${fmt$(ps.closed?.highest)}</td></tr>
          ${ps.forSale?.medianPsf || ps.closed?.medianPsf ? `<tr><td><strong>Median $/Sqft</strong></td><td class="num">$${ps.forSale?.medianPsf || "-"}</td><td class="num">-</td><td class="num">-</td><td class="num">$${ps.closed?.medianPsf || "-"}</td></tr>` : ""}
          ${ps.forSale?.medianDOM || ps.closed?.medianDOM ? `<tr><td><strong>Median DOM</strong></td><td class="num">${ps.forSale?.medianDOM || "-"}</td><td class="num">-</td><td class="num">${ps.expired?.medianDOM || "-"}</td><td class="num">${ps.closed?.medianDOM || "-"}</td></tr>` : ""}
        </tbody>
      </table>
    `;
  }

  // CMA Pricing Summary
  let cmaSummary = "";
  if (data.cma) {
    cmaSummary = `
      <div class="section-title">Pricing Summary</div>
      <div class="pricing-box avoid-break">
        <div class="pb-label">Recommended Price</div>
        <div class="pb-value">${fmt$(data.cma.recommendedPrice)}</div>
        ${data.cma.recommendedPricePerSqft > 0 ? `<div class="pb-sub">at $${data.cma.recommendedPricePerSqft}/sq. ft.</div>` : ""}
        <div style="margin-top: 12px; text-align: left; font-size: 11px;">
          ${row("Average of Comps", fmt$(data.cma.averageOfComps))}
          ${row("Adjustments", data.cma.totalAdjustment !== 0 ? `${data.cma.totalAdjustment > 0 ? "+" : ""}${fmt$(data.cma.totalAdjustment)}` : "$0")}
          <div style="margin-top: 8px; padding-top: 8px; border-top: 2px solid #b4822a; display: flex; justify-content: space-between;">
            <span style="font-size: 10px; color: #6b7280;">CMA Range</span>
            <span style="font-size: 13px; font-weight: 700;">${fmt$(data.cma.cmaRange.low)} - ${fmt$(data.cma.cmaRange.high)}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Hazards
  const hazardSection = (data.hazards && data.hazards.length > 0) ? `
    <div class="section-title">Environmental & Hazard Zones</div>
    ${data.hazards.map((h) => `<div class="hazard-badge"><div class="hb-label">${escHtml(h.label)}</div><div class="hb-value">${escHtml(h.value)}</div></div>`).join("")}
  ` : "";

  // ── Assemble the complete HTML document ──
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getReportBaseStyles()}</style>
</head>
<body>

  <!-- COVER PAGE -->
  ${coverPage}

  <!-- PAGE 2: VALUATION -->
  <div class="page-break"></div>
  ${header}
  ${listingBadge}
  <div class="value-cards">${valCards}</div>
  ${avmBar}
  ${cmaRange}

  <!-- PROPERTY INFORMATION -->
  ${propFacts}
  ${buildingDetails}
  ${interiorSection}
  ${exteriorSection}
  ${descSection}

  <!-- LEGAL & OWNERSHIP -->
  ${legalSection}
  ${ownerSection}
  ${locationSection}

  <!-- TAX -->
  ${taxSection}

  <!-- EQUITY -->
  ${equitySection}

  <!-- PHOTOS -->
  ${photoSection}

  <!-- MARKET -->
  <div class="page-break"></div>
  ${header}
  <div class="big-section-header">Market Trends</div>
  ${marketSection}

  <!-- SALES HISTORY -->
  ${salesSection}

  <!-- COMPS -->
  ${compsSection}

  <!-- PRICING STRATEGY -->
  ${pricingSection}

  <!-- CMA SUMMARY -->
  ${cmaSummary}

  <!-- HAZARDS -->
  ${hazardSection}

  <!-- FOOTER -->
  ${footer}

</body>
</html>`;
}
