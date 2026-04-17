/**
 * Seller Report HTML Template
 *
 * Generates a complete HTML document that Puppeteer renders to PDF.
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

function esc(s?: string | null): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Generate the complete HTML document for a Seller Report.
 */
export function buildSellerReportHtml(data: SellerReportData, branding: AgentBranding): string {
  const cityLine = [data.city, data.state, data.zip].filter(Boolean).join(", ");
  const date = data.generatedAt || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const hdr = buildPageHeader("Seller Report", `${esc(data.address)}`);
  const ftr = buildPageFooter(date, branding.displayName);

  // Find real last sale (filter out $0 trust transfers)
  const realLastSale = data.lastSalePrice && data.lastSalePrice > 1000
    ? { price: data.lastSalePrice, date: data.lastSaleDate }
    : data.salesHistory?.find((s) => {
        const amt = typeof s.amount === "object" ? (s.amount as any)?.saleAmt : s.amount;
        return amt && amt > 1000;
      });
  const lastSaleAmt = realLastSale
    ? (typeof (realLastSale as any).price === "number" ? (realLastSale as any).price : typeof (realLastSale as any).amount === "object" ? ((realLastSale as any).amount as any)?.saleAmt : (realLastSale as any).amount)
    : null;
  const lastSaleDate = realLastSale ? ((realLastSale as any).date || data.lastSaleDate) : null;

  // Equity logic: if no loan balance, show "Free & Clear"
  const hasLoanData = data.loanBalance != null && data.loanBalance > 0;
  const equityLabel = hasLoanData ? `${data.estimatedEquity != null && data.estimatedEquity >= 0 ? "+" : ""}${fmt$(data.estimatedEquity)}` : "Free & Clear";
  const equityColor = hasLoanData ? (data.estimatedEquity != null && data.estimatedEquity >= 0 ? "green" : "red") : "green";

  const row = (label: string, value?: string | number | null) => {
    if (value == null || value === "" || value === "-") return "";
    return `<div class="data-row"><span class="dr-label">${esc(label)}</span><span class="dr-value">${esc(String(value))}</span></div>`;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════════════════════════════════

  const mapImage = data.mapImageData
    ? `<div style="margin: 20px auto; max-width: 500px;"><img src="${data.mapImageData}" style="width: 100%; border-radius: 8px;" /></div>`
    : "";
  const heroImage = data.primaryPhotoData
    ? `<div style="margin: 20px auto; max-width: 500px;"><img src="${data.primaryPhotoData}" style="width: 100%; border-radius: 8px;" /></div>`
    : "";

  const coverPage = `
    <div class="cover-page">
      <div class="cover-title">
        ${esc(data.address)}
        <div class="cover-subtitle">${esc(cityLine)}</div>
      </div>
      <div class="cover-gold"></div>
      ${heroImage || mapImage}
      <div class="agent-branding" style="justify-content: center; border: none; margin-top: 20px;">
        ${branding.headshotData ? `<img class="headshot" src="${branding.headshotData}" />` : ""}
        <div style="text-align: left;">
          <div class="ab-name">${esc(branding.displayName)}</div>
          <div class="ab-detail">${branding.licenseNumber ? `Lic# ${esc(branding.licenseNumber)} | ` : ""}${esc(branding.phone || "")} | ${esc(branding.brokerageName || "Real Estate Genie")}</div>
          <div class="ab-detail">${esc(cityLine)}</div>
        </div>
      </div>
      <div style="margin-top: 16px; font-size: 12px; color: #6b7280;">Generated: ${esc(date)}</div>
    </div>
  `;

  // ═══════════════════════════════════════════════════════════════════════
  // VALUATION SUMMARY (page 2)
  // ═══════════════════════════════════════════════════════════════════════

  const listingBadge = data.listingStatus
    ? `<div style="margin-bottom: 12px;"><span class="status-badge active">${esc(data.listingStatus)} / For Sale</span>${data.listPrice ? ` &nbsp; List Price: <strong>${fmt$(data.listPrice)}</strong>` : ""}${data.mlsNumber ? ` &nbsp; MLS# ${esc(data.mlsNumber)}` : ""}</div>`
    : "";

  const valCards = [
    data.avmValue != null ? `<div class="value-card"><div class="vc-label">Estimated Value</div><div class="vc-value">${fmt$(data.avmValue)}</div>${data.avmDate ? `<div class="vc-sub">As of ${esc(data.avmDate)}</div>` : ""}</div>` : "",
    data.cma ? `<div class="value-card gold"><div class="vc-label">CMA Value</div><div class="vc-value">${fmt$(data.cma.recommendedPrice)}</div><div class="vc-sub">Based on ${data.cma.adjustedComps.length} comps</div></div>` : "",
    lastSaleAmt != null && lastSaleAmt > 1000 ? `<div class="value-card"><div class="vc-label">Last Sale</div><div class="vc-value">${fmt$(lastSaleAmt)}</div><div class="vc-sub">${fmtDate(lastSaleDate)}</div></div>` : "",
    `<div class="value-card ${equityColor}"><div class="vc-label">Est. Equity</div><div class="vc-value">${equityLabel}</div></div>`,
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
      </div>`;
  })() : "";

  // ═══════════════════════════════════════════════════════════════════════
  // AI-GENERATED PROPERTY NARRATIVE
  // ═══════════════════════════════════════════════════════════════════════

  const aiNarrative = (data as any).aiNarrative ? `
    <div style="margin: 20px 0; padding: 16px 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #1e40af;">
      <div style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; margin-bottom: 8px;">Property Analysis</div>
      <div style="font-size: 11px; color: #374151; line-height: 1.8;">
        ${esc((data as any).aiNarrative).replace(/\n\n/g, '</div><div style="font-size: 11px; color: #374151; line-height: 1.8; margin-top: 10px;">').replace(/\n/g, '<br/>')}
      </div>
    </div>
  ` : "";

  // ═══════════════════════════════════════════════════════════════════════
  // PROPERTY INFORMATION (continuous flow, no forced page breaks)
  // ═══════════════════════════════════════════════════════════════════════

  const propFacts = `
    <div class="section-title">Property Facts</div>
    <div class="two-col avoid-break">
      <div>
        ${row("Property Type", data.propertyType)}
        ${row("Year Built", data.yearBuilt)}
        ${row("Bedrooms", data.beds)}
        ${row("Bathrooms", data.baths)}
        ${row("Living Area", data.sqft ? `${data.sqft.toLocaleString()} sqft` : null)}
        ${row("Lot Size", data.lotSizeSqft ? `${data.lotSizeSqft.toLocaleString()} sqft${data.lotSizeAcres ? ` (${data.lotSizeAcres} acres)` : ""}` : null)}
      </div>
      <div>
        ${row("Stories", data.stories)}
        ${row("Parking", data.parkingSpaces || data.garageSpaces)}
        ${row("Pool", data.pool != null ? (data.pool ? "Yes" : "No") : null)}
        ${row("APN / TMK", data.apn)}
        ${row("County", data.county)}
        ${row("Land Tenure", data.ownershipType)}
      </div>
    </div>
  `;

  // Building details
  const buildingDetails = (data.constructionType || data.roofType || data.heatingType || data.coolingType || data.foundationType || data.architectureStyle || data.condition) ? `
    <div class="section-title">Building Details</div>
    <div class="two-col avoid-break">
      <div>
        ${row("Architecture", data.architectureStyle)}
        ${row("Construction", data.constructionType)}
        ${row("Condition", data.condition)}
        ${row("Roof", data.roofType)}
        ${row("Exterior Walls", (data as any).exteriorWalls)}
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

  // Interior features
  const interiorSection = (data.interiorFeatures && data.interiorFeatures.length > 0) ? `
    <div class="section-title">Interior Features</div>
    <div class="avoid-break">${data.interiorFeatures.map((f) => row(f.label, f.value)).join("")}</div>
  ` : "";

  // Exterior features
  const exteriorSection = (data.exteriorFeatures && data.exteriorFeatures.length > 0) ? `
    <div class="section-title">Exterior Features</div>
    <div class="avoid-break">${data.exteriorFeatures.map((f) => row(f.label, f.value)).join("")}</div>
  ` : "";

  // MLS Description
  const descSection = data.listingDescription ? `
    <div class="section-title">Listing Description</div>
    <div style="font-size: 11px; color: #374151; line-height: 1.7; padding: 10px 14px; background: #f9fafb; border-radius: 6px;" class="avoid-break">
      ${esc(data.listingDescription.substring(0, 1000))}
    </div>
  ` : "";

  // Legal Description
  const legalSection = (data.legal || data.apn) ? `
    <div class="section-title">Legal Description</div>
    <div class="two-col avoid-break">
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
    ${data.legal?.legalDescription ? `<div style="margin-top: 6px; font-size: 10px; color: #6b7280;"><strong>Legal Description:</strong> ${esc(data.legal.legalDescription.substring(0, 300))}</div>` : ""}
  ` : "";

  // Owner Facts
  const ownerSection = (data.owner1 || data.owner2) ? `
    <div class="section-title">Owner Facts</div>
    <div class="two-col avoid-break">
      <div>
        ${row("Owner Name (Public)", data.owner1)}
        ${data.owner2 ? row("Owner Name 2 (Public)", data.owner2) : ""}
        ${row("Owner Occupied", data.ownerOccupied === "Y" ? "Yes" : data.ownerOccupied === "N" ? "No" : data.ownerOccupied)}
      </div>
      <div>
        ${row("Absentee Owner", data.absenteeOwner === "A" || data.absenteeOwner === "Y" ? "Yes" : data.absenteeOwner === "O" ? "Yes" : data.absenteeOwner)}
        ${row("Corporate Owner", data.corporateOwner === "Y" ? "Yes" : data.corporateOwner === "N" ? "No" : data.corporateOwner)}
        ${row("Mailing Address", data.mailingAddress)}
        ${data.deed?.buyerVesting ? row("Vesting", data.deed.buyerVesting) : ""}
      </div>
    </div>
  ` : "";

  // Location Details
  const locationSection = (data.legal?.subdivision || data.federalData?.floodZone) ? `
    <div class="section-title">Location Details</div>
    <div class="avoid-break">
      ${row("Subdivision", data.legal?.subdivision)}
      ${row("Zoning", data.legal?.zoning)}
      ${row("Flood Zone", data.federalData?.floodZone)}
    </div>
  ` : "";

  // Tax Assessment
  let taxSection = "";
  if (data.taxHistory && data.taxHistory.length > 0) {
    const taxRows = data.taxHistory.slice(0, 5).map((t) => `
      <tr><td><strong>${t.year}</strong></td><td class="num">${fmt$(t.assessedLand || t.marketLand)}</td><td class="num">${fmt$(t.assessedImpr || t.marketImpr)}</td><td class="num">${fmt$(t.assessedTotal || t.marketTotal)}</td><td class="num">${fmt$(t.taxAmount)}</td></tr>
    `).join("");
    taxSection = `
      <div class="section-title">Tax History</div>
      <table class="comp-table avoid-break"><thead><tr><th>Year</th><th>Land</th><th>Improvements</th><th>Total Assessed</th><th>Tax Amount</th></tr></thead><tbody>${taxRows}</tbody></table>
    `;
  } else if (data.assessedTotal != null || data.taxAmount != null) {
    taxSection = `
      <div class="section-title">Tax Assessment</div>
      <div class="avoid-break">
        ${row("Assessed Total", fmt$(data.assessedTotal))}
        ${row("Land Value", fmt$(data.assessedLand))}
        ${row("Improvement Value", fmt$(data.assessedImpr))}
        ${row("Market Value", fmt$(data.marketTotal))}
        ${row("Annual Tax", fmt$(data.taxAmount))}
        ${row("Tax Year", data.taxYear)}
      </div>
    `;
  }

  // Equity Section
  let equitySection = "";
  if (data.avmValue != null) {
    const eqCards = [
      `<div class="value-card dark"><div class="vc-label">Property Value</div><div class="vc-value">${fmt$(data.avmValue)}</div></div>`,
      hasLoanData ? `<div class="value-card dark"><div class="vc-label">Loan Balance</div><div class="vc-value">${fmt$(data.loanBalance)}</div></div>` : "",
      `<div class="value-card ${equityColor}"><div class="vc-label">Estimated Equity</div><div class="vc-value">${equityLabel}</div></div>`,
    ].filter(Boolean).join("");

    let equityBar = "";
    if (hasLoanData && data.avmValue > 0) {
      const loanPct = Math.min(100, (data.loanBalance! / data.avmValue) * 100);
      equityBar = `<div class="equity-bar"><div class="eb-loan" style="width: ${loanPct}%;"></div><div class="eb-equity" style="width: ${100 - loanPct}%;"></div></div>
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #6b7280; margin-top: 2px;">
          <span>Loan ${Math.round(loanPct)}%</span><span>Equity ${Math.round(100 - loanPct)}%</span>
        </div>`;
    }

    equitySection = `
      <div class="section-title">Estimated Equity</div>
      <div class="value-cards avoid-break">${eqCards}</div>
      ${equityBar}
      <div class="avoid-break">
        ${row("Lender", data.lender)}
        ${row("Loan Type", data.loanType)}
        ${row("LTV Ratio", data.ltv != null ? `${data.ltv.toFixed(1)}%` : null)}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HOME EQUITY ANALYSIS (visual)
  // ═══════════════════════════════════════════════════════════════════════

  let equityAnalysis = "";
  if (data.avmValue) {
    const purchasePrice = lastSaleAmt && lastSaleAmt > 1000 ? lastSaleAmt : null;
    const appreciation = purchasePrice ? data.avmValue - purchasePrice : null;
    const appreciationPct = purchasePrice ? ((appreciation! / purchasePrice) * 100).toFixed(1) : null;
    const yearsOwned = lastSaleDate ? Math.max(1, Math.round((Date.now() - new Date(lastSaleDate).getTime()) / (365.25 * 86400000))) : null;
    const annualAppreciation = appreciationPct && yearsOwned ? (Number(appreciationPct) / yearsOwned).toFixed(1) : null;

    equityAnalysis = `
      <div class="section-title">Home Equity Analysis</div>
      <div class="avoid-break" style="margin-bottom: 16px;">
        <div class="value-cards">
          <div class="value-card"><div class="vc-label">Current Value</div><div class="vc-value">${fmt$(data.avmValue)}</div></div>
          ${purchasePrice ? `<div class="value-card"><div class="vc-label">Purchase Price</div><div class="vc-value">${fmt$(purchasePrice)}</div><div class="vc-sub">${fmtDate(lastSaleDate)}</div></div>` : ""}
          ${appreciation ? `<div class="value-card green"><div class="vc-label">Appreciation</div><div class="vc-value">+${fmt$(appreciation)}</div><div class="vc-sub">${appreciationPct}%${yearsOwned ? ` over ${yearsOwned} years` : ""}</div></div>` : ""}
          ${annualAppreciation ? `<div class="value-card"><div class="vc-label">Annual Avg</div><div class="vc-value">+${annualAppreciation}%/yr</div></div>` : ""}
        </div>
        ${purchasePrice ? `
          <div style="margin-top: 8px;">
            <div style="display: flex; height: 20px; border-radius: 4px; overflow: hidden;">
              <div style="width: ${Math.round((purchasePrice / data.avmValue) * 100)}%; background: #6b7280; display: flex; align-items: center; justify-content: center; font-size: 8px; color: white; font-weight: 600;">Purchase</div>
              <div style="flex: 1; background: #15803d; display: flex; align-items: center; justify-content: center; font-size: 8px; color: white; font-weight: 600;">Appreciation +${fmt$(appreciation)}</div>
            </div>
          </div>
        ` : ""}
        ${data.assessedTotal ? `<div style="margin-top: 8px; font-size: 10px; color: #6b7280;">County Assessment: ${fmt$(data.assessedTotal)} (${data.taxYear || "current"}) | ${data.assessedTotal < data.avmValue ? "Below market value" : "At or above market value"}</div>` : ""}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCHOOLS
  // ═══════════════════════════════════════════════════════════════════════

  const schools = (data as any).schools || [];
  const schoolsSection = schools.length > 0 ? `
    <div class="section-title">Nearby Schools</div>
    <table class="comp-table avoid-break">
      <thead><tr><th>School</th><th>Level</th><th>Grades</th><th>Distance</th><th>Enrollment</th><th>Rating</th></tr></thead>
      <tbody>${schools.slice(0, 8).map((s: any) => `
        <tr>
          <td>${esc(s.name)}</td>
          <td>${esc(s.level || s.type || "")}</td>
          <td>${esc(s.grades || s.gradeRange || "")}</td>
          <td>${s.distance || "-"}</td>
          <td class="num">${s.enrollment || "-"}</td>
          <td>${esc(s.overallGrade || s.rating || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : "";

  // ═══════════════════════════════════════════════════════════════════════
  // HAZARD ZONES
  // ═══════════════════════════════════════════════════════════════════════

  const hazardSection = (data.hazards && data.hazards.length > 0) ? `
    <div class="section-title">Environmental & Hazard Zones</div>
    ${data.hazards.map((h) => `<div class="hazard-badge"><div class="hb-label">${esc(h.label)}</div><div class="hb-value">${esc(h.value)}</div></div>`).join("")}
  ` : "";

  // ═══════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD DEMOGRAPHICS
  // ═══════════════════════════════════════════════════════════════════════

  const demographics = (data as any).demographics || (data as any).federalData;
  let demographicsSection = "";
  if (demographics) {
    const census = demographics.census || demographics;
    demographicsSection = `
      <div class="section-title">Neighborhood Demographics</div>
      <div class="two-col avoid-break">
        <div>
          ${row("Median Household Income", census.medianHouseholdIncome || census.medianIncome ? fmt$(census.medianHouseholdIncome || census.medianIncome) : null)}
          ${row("Median Home Value (Area)", census.medianHomeValue ? fmt$(census.medianHomeValue) : null)}
          ${row("Population", census.totalPopulation ? Number(census.totalPopulation).toLocaleString() : null)}
          ${row("Median Age", census.medianAge)}
        </div>
        <div>
          ${row("Owner-Occupied", census.ownerOccupiedPct ? `${census.ownerOccupiedPct}%` : null)}
          ${row("Renter-Occupied", census.renterOccupiedPct ? `${census.renterOccupiedPct}%` : null)}
          ${row("Unemployment Rate", census.unemploymentRate ? `${census.unemploymentRate}%` : null)}
          ${row("Population Density", census.populationDensity ? `${Number(census.populationDensity).toLocaleString()}/sq mi` : null)}
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHOTOS (uploaded by agent + MLS if available)
  // ═══════════════════════════════════════════════════════════════════════

  const allPhotos = [...(data.photoGalleryData || []), ...((data as any).uploadedPhotos || [])];
  const photoSection = allPhotos.length > 0 ? `
    <div class="page-break"></div>
    ${hdr}<div class="gold-accent"></div>
    <div class="big-section-header">Photos</div>
    <div class="photo-grid large">${allPhotos.slice(0, 16).map((url: string) => `<img src="${url}" />`).join("")}</div>
  ` : "";

  // ═══════════════════════════════════════════════════════════════════════
  // MARKET TRENDS
  // ═══════════════════════════════════════════════════════════════════════

  let marketSection = "";
  if (data.marketStats || data.marketType) {
    const marketArrowPos = data.marketType === "sellers" ? "16%" : data.marketType === "buyers" ? "83%" : "50%";
    const mCards = [
      data.monthsOfInventory != null ? `<div class="value-card dark"><div class="vc-label">Months Inventory</div><div class="vc-value">${data.monthsOfInventory.toFixed(1)}</div></div>` : "",
      data.soldToListRatio != null ? `<div class="value-card dark"><div class="vc-label">Sold-to-List %</div><div class="vc-value">${data.soldToListRatio.toFixed(1)}%</div></div>` : "",
      data.marketStats?.avgDOM != null ? `<div class="value-card dark"><div class="vc-label">Median DOM</div><div class="vc-value">${data.marketStats.avgDOM}</div></div>` : "",
      data.marketStats?.medianPrice != null ? `<div class="value-card dark"><div class="vc-label">Median Sold</div><div class="vc-value">${fmt$(data.marketStats.medianPrice)}</div></div>` : "",
    ].filter(Boolean).join("");

    // Build chart data from monthly trends
    const trends = (data as any).monthlyTrends || [];
    let chartHtml = "";
    if (trends.length >= 3) {
      const labels = trends.map((t: any) => t.month || "").map((m: string) => {
        if (!m) return "";
        // Format "2025-08" to "Aug '25"
        const parts = m.split("-");
        if (parts.length === 2) {
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          return `${months[parseInt(parts[1]) - 1] || parts[1]} '${parts[0].slice(2)}`;
        }
        return m;
      });
      const prices = trends.map((t: any) => t.medianPrice || t.avgPrice || 0);
      const listings = trends.map((t: any) => t.listings || 0);
      const doms = trends.map((t: any) => t.dom || 0);

      chartHtml = `
        <div class="section-title" style="margin-top: 20px;">Median Sale Price Trend</div>
        <div class="chart-container" style="height: 220px;"><canvas id="priceChart"></canvas></div>

        <div class="section-title" style="margin-top: 16px;">Listings & Days on Market</div>
        <div class="chart-container" style="height: 200px;"><canvas id="listingsChart"></canvas></div>

        <script data-chart>
          // Price Trend Chart - executed by Puppeteer after Chart.js loads
          new Chart(document.getElementById('priceChart'), {
            type: 'line',
            data: {
              labels: ${JSON.stringify(labels)},
              datasets: [{
                label: 'Median Price',
                data: ${JSON.stringify(prices)},
                borderColor: '#1e40af',
                backgroundColor: 'rgba(30,64,175,0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#1e40af',
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { ticks: { callback: function(v) { return '$' + (v/1000).toFixed(0) + 'K'; } } },
                x: { ticks: { font: { size: 9 } } }
              }
            }
          });

          // Listings + DOM Chart
          new Chart(document.getElementById('listingsChart'), {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(labels)},
              datasets: [
                { label: 'Listings', data: ${JSON.stringify(listings)}, backgroundColor: '#3b82f6', borderRadius: 3 },
                { label: 'Avg DOM', data: ${JSON.stringify(doms)}, backgroundColor: '#f59e0b', borderRadius: 3 }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: { legend: { position: 'bottom', labels: { font: { size: 9 } } } },
              scales: {
                y: { beginAtZero: true },
                x: { ticks: { font: { size: 9 } } }
              }
            }
          });
        </script>
      `;
    }

    marketSection = `
      <div class="page-break"></div>
      ${hdr}<div class="gold-accent"></div>
      <div class="big-section-header">Market Trends</div>
      <div class="section-title">Market Trends</div>
      <div class="avoid-break">
        <div style="position: relative; height: 18px; margin-bottom: 4px;">
          <div class="market-arrow" style="position: absolute; left: ${marketArrowPos}; transform: translateX(-50%);"></div>
        </div>
        <div class="market-indicator"><div class="mi-sellers"></div><div class="mi-balanced"></div><div class="mi-buyers"></div></div>
        <div class="market-indicator-labels"><span>Seller's Market</span><span>Balanced</span><span>Buyer's Market</span></div>
      </div>
      <div class="value-cards">${mCards}</div>
      ${data.marketStats ? `${row("Active Listings", data.marketStats.totalListings)}${row("Price per Sqft", data.marketStats.pricePerSqft ? `$${data.marketStats.pricePerSqft.toLocaleString()}` : null)}` : ""}
      ${chartHtml}
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SALES HISTORY
  // ═══════════════════════════════════════════════════════════════════════

  let salesSection = "";
  if (data.salesHistory && data.salesHistory.length > 0) {
    const salesRows = data.salesHistory.slice(0, 10).map((s, i) => {
      const amt = typeof s.amount === "object" ? (s.amount as any)?.saleAmt : s.amount;
      const amtDisplay = amt == null ? "-" : amt <= 100 ? "Price Not Disclosed" : fmt$(amt);
      return `<tr><td>${i + 1}</td><td>${fmtDate(s.date)}</td><td class="num">${amtDisplay}</td><td>${esc((s.buyer || "-").substring(0, 25))}</td><td>${esc((s.seller || "-").substring(0, 25))}</td></tr>`;
    }).join("");
    salesSection = `
      <div class="section-title">Sales History</div>
      <table class="comp-table avoid-break"><thead><tr><th></th><th>Date</th><th>Amount</th><th>Buyer</th><th>Seller</th></tr></thead><tbody>${salesRows}</tbody></table>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COMPARABLE SALES
  // ═══════════════════════════════════════════════════════════════════════

  let compsSection = "";
  if (data.comps && data.comps.length > 0) {
    const compRows = data.comps.slice(0, 10).map((c) => `
      <tr><td>${esc((c.address || "-").substring(0, 35))}</td><td class="num">${c.price != null ? fmt$(c.price) : "-"}</td><td>${c.beds || "?"}/${c.baths || "?"}</td><td class="num">${c.sqft ? c.sqft.toLocaleString() : "-"}</td><td>${fmtDate(c.closeDate)}</td><td class="num">${c.correlation != null && c.correlation > 0 ? `${Math.round(c.correlation <= 1 ? c.correlation * 100 : c.correlation)}%` : "-"}</td></tr>
    `).join("");
    compsSection = `
      <div class="section-title">Comparable Sales</div>
      <table class="comp-table avoid-break"><thead><tr><th>Address</th><th>Price</th><th>Bd/Ba</th><th>Sqft</th><th>Closed</th><th>Match</th></tr></thead><tbody>${compRows}</tbody></table>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRICING STRATEGY
  // ═══════════════════════════════════════════════════════════════════════

  let pricingSection = "";
  if (data.pricingStrategy) {
    const ps = data.pricingStrategy;
    pricingSection = `
      <div class="page-break"></div>
      ${hdr}<div class="gold-accent"></div>
      <div class="big-section-header">Pricing Strategy</div>
      <table class="comp-table avoid-break">
        <thead><tr><th></th><th>For Sale Listings</th><th>Distressed</th><th>Expired</th><th>Closed</th></tr></thead>
        <tbody>
          <tr><td><strong>Lowest Price</strong></td><td class="num">${fmt$(ps.forSale?.lowest)}</td><td class="num">${fmt$(ps.distressed?.lowest)}</td><td class="num">${fmt$(ps.expired?.lowest)}</td><td class="num">${fmt$(ps.closed?.lowest)}</td></tr>
          <tr><td><strong>Median Price</strong></td><td class="num">${fmt$(ps.forSale?.median)}</td><td class="num">${fmt$(ps.distressed?.median)}</td><td class="num">${fmt$(ps.expired?.median)}</td><td class="num">${fmt$(ps.closed?.median)}</td></tr>
          <tr><td><strong>Highest Price</strong></td><td class="num">${fmt$(ps.forSale?.highest)}</td><td class="num">${fmt$(ps.distressed?.highest)}</td><td class="num">${fmt$(ps.expired?.highest)}</td><td class="num">${fmt$(ps.closed?.highest)}</td></tr>
        </tbody>
      </table>
    `;
  }

  // CMA Summary
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
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ASSEMBLE DOCUMENT
  // ═══════════════════════════════════════════════════════════════════════

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getReportBaseStyles()}</style>
</head>
<body>

  ${coverPage}

  <div class="page-break"></div>
  ${hdr}<div class="gold-accent"></div>
  ${listingBadge}
  <div class="value-cards">${valCards}</div>
  ${avmBar}
  ${aiNarrative}

  ${propFacts}
  ${buildingDetails}
  ${interiorSection}
  ${exteriorSection}
  ${descSection}
  ${legalSection}
  ${ownerSection}
  ${locationSection}
  ${taxSection}
  ${equityAnalysis}
  ${equitySection}
  ${hazardSection}
  ${schoolsSection}
  ${demographicsSection}

  ${photoSection}
  ${marketSection}
  ${salesSection}
  ${compsSection}
  ${pricingSection}
  ${cmaSummary}

  ${ftr}

</body>
</html>`;
}
