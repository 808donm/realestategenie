import { jsPDF } from "jspdf";
import {
  COLORS,
  pdfSafe,
  fmt$,
  fmtNum,
  fmtPct,
  drawPageHeader,
  applyFootersToAllPages,
  drawCoverPage,
  drawAgentBrandingBar,
  drawSectionTitle,
  drawRow,
  drawValueCards,
  drawAvmRangeBar,
  drawEquityBar,
  drawMarketTypeIndicator,
  drawPhotoGallery,
  drawComparisonTable,
  checkNewPage,
  type AgentBranding,
  type ValueCard,
} from "./pdf-report-utils";

// ── Report Data Shape ──

export interface PropertyReportData {
  // Property basics
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  apn?: string;
  propertyType?: string;
  yearBuilt?: number;
  // Building
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSizeSqft?: number;
  lotSizeAcres?: number;
  stories?: number;
  garageSpaces?: string;
  pool?: boolean;
  // Valuation
  avmValue?: number;
  avmLow?: number;
  avmHigh?: number;
  avmConfidence?: number;
  avmDate?: string;
  // Tax Assessment
  assessedTotal?: number;
  assessedLand?: number;
  assessedImpr?: number;
  marketTotal?: number;
  taxAmount?: number;
  taxYear?: number;
  // Sale
  lastSalePrice?: number;
  lastSaleDate?: string;
  // Equity & Mortgage
  estimatedEquity?: number;
  loanBalance?: number;
  ltv?: number;
  loanCount?: number;
  lender?: string;
  loanAmount?: number;
  loanType?: string;
  // Rental
  rentalEstimate?: number;
  rentalLow?: number;
  rentalHigh?: number;
  grossYield?: number;
  // Ownership
  owner1?: string;
  owner2?: string;
  ownerOccupied?: string;
  absenteeOwner?: string;
  mailingAddress?: string;
  corporateOwner?: string;
  // Hazard (Hawaii-specific)
  hazards?: Array<{ label: string; value: string }>;
  // Federal / Neighborhood
  federalData?: {
    medianIncome?: number;
    populationDensity?: number;
    unemploymentRate?: number;
    medianHomeValue?: number;
    povertyRate?: number;
    medianAge?: number;
    ownerOccupiedPct?: number;
    renterOccupiedPct?: number;
    mortgageRate30yr?: number;
    cpi?: number;
    floodZone?: string;
    floodRisk?: string;
  };
  // Building details
  constructionType?: string;
  roofType?: string;
  foundationType?: string;
  heatingType?: string;
  coolingType?: string;
  fireplaceCount?: number;
  basementType?: string;
  basementSize?: number;
  parkingType?: string;
  parkingSpaces?: string;
  architectureStyle?: string;
  condition?: string;
  // MLS Listing info
  mlsNumber?: string;
  listingStatus?: string;
  daysOnMarket?: number;
  listingAgentName?: string;
  listingOfficeName?: string;
  listingDescription?: string;
  ownershipType?: string;
  // Comps
  comps?: Array<{
    address?: string;
    price?: number;
    beds?: number;
    baths?: number;
    sqft?: number;
    closeDate?: string;
    correlation?: number;
    source?: string;
  }>;
  // Market Stats
  marketStats?: {
    medianPrice?: number;
    avgDOM?: number;
    totalListings?: number;
    pricePerSqft?: number;
  };
  // Sales history
  salesHistory?: Array<{
    date?: string;
    recordingDate?: string;
    amount?: number;
    buyer?: string;
    seller?: string;
    docType?: string;
  }>;
  // Photos (up to 6 MLS photos)
  photos?: string[];
  // Mortgage calculator fields
  listPrice?: number;
  taxAnnualAmount?: number;
  associationFee?: number;
  // Enhanced fields for upgraded report
  latitude?: number;
  longitude?: number;
  mapImageData?: string;
  primaryPhotoData?: string;
  photoGalleryData?: string[];
  marketType?: "sellers" | "balanced" | "buyers";
  monthsOfInventory?: number;
  soldToListRatio?: number;
  // Generated timestamp
  generatedAt: string;
}

// Re-export AgentBranding for backward compatibility
export type { AgentBranding } from "./pdf-report-utils";

// ── Helpers ──

const $ = (n?: number | null) => fmt$(n);
const num = (n?: number | null) => fmtNum(n);
const pct = (n?: number | null) => fmtPct(n);

/**
 * Generate a branded Property Intelligence Report PDF.
 * Multi-page layout with cover page, consistent headers/footers,
 * value snapshot, property details, financial analysis, comps, and market data.
 */
export function generatePropertyIntelligencePDF(data: PropertyReportData, branding: AgentBranding): Blob {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  const reportType = "Property Report";
  const subtitle = data.address;
  const cityLine = [data.city, data.state, data.zip].filter(Boolean).join(", ");

  // Helper: start new page with header
  const newPageWithHeader = (): number => {
    doc.addPage();
    return drawPageHeader(doc, reportType, pdfSafe(subtitle));
  };

  // Helper: check page break
  const ensureSpace = (needed: number): void => {
    y = checkNewPage(doc, y, needed, newPageWithHeader);
  };

  // Helper: section title
  const section = (title: string): void => {
    ensureSpace(30);
    y = drawSectionTitle(doc, title, y, margin);
  };

  // Helper: row
  const row = (label: string, value: string | undefined | null, opts?: { bold?: boolean; labelWidth?: number }): void => {
    if (!value || value === "-") return;
    ensureSpace(8);
    y = drawRow(doc, label, value, y, margin, opts);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 1: COVER PAGE
  // ═══════════════════════════════════════════════════════════════════════

  drawCoverPage(doc, {
    reportType,
    title: data.address,
    subtitle: cityLine,
    date: data.generatedAt,
    branding,
    mapImageData: data.mapImageData || null,
    heroImageData: data.primaryPhotoData || null,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 2: PROPERTY OVERVIEW & VALUE SNAPSHOT
  // ═══════════════════════════════════════════════════════════════════════

  y = newPageWithHeader();

  // Value Snapshot Cards
  section("VALUE SNAPSHOT");

  const valueCards: ValueCard[] = [
    { label: "AVM VALUE", value: $(data.avmValue), sub: data.avmDate ? `As of ${data.avmDate}` : undefined, color: COLORS.brandBlue },
    { label: "LAST SALE", value: $(data.lastSalePrice), sub: data.lastSaleDate || undefined, color: COLORS.brandBlue },
    {
      label: "EST. EQUITY",
      value: data.estimatedEquity != null ? `${data.estimatedEquity >= 0 ? "+" : ""}${$(data.estimatedEquity)}` : "-",
      color: data.estimatedEquity && data.estimatedEquity >= 0 ? COLORS.greenAccent : COLORS.redAccent,
    },
    { label: "LTV", value: data.ltv != null ? pct(data.ltv) : "-" },
  ];
  y = drawValueCards(doc, valueCards, y, margin);

  // AVM Range Bar
  if (data.avmLow != null && data.avmHigh != null && data.avmValue != null) {
    y = drawAvmRangeBar(doc, data.avmLow, data.avmValue, data.avmHigh, y, margin);
  }

  if (data.avmConfidence != null) row("Confidence Score", String(data.avmConfidence));

  // Rental Estimate
  if (data.rentalEstimate != null) {
    y += 2;
    row("Est. Monthly Rent", `${$(data.rentalEstimate)}/mo`);
    if (data.rentalLow != null && data.rentalHigh != null)
      row("Rental Range", `${$(data.rentalLow)} - ${$(data.rentalHigh)}/mo`);
    if (data.grossYield != null) row("Gross Yield", pct(data.grossYield));
  }

  y += 4;

  // ── Property Details ──
  section("PROPERTY DETAILS");
  row("Property Type", data.propertyType);
  row("Year Built", data.yearBuilt != null ? String(data.yearBuilt) : null);
  row("Bedrooms", data.beds != null ? String(data.beds) : null);
  row("Bathrooms", data.baths != null ? String(data.baths) : null);
  row("Living Area", data.sqft != null ? `${num(data.sqft)} sqft` : null);
  row(
    "Lot Size",
    data.lotSizeSqft != null
      ? `${num(data.lotSizeSqft)} sqft${data.lotSizeAcres ? ` (${data.lotSizeAcres.toFixed(2)} acres)` : ""}`
      : null,
  );
  row("Stories", data.stories != null ? String(data.stories) : null);
  row("Parking", data.garageSpaces);
  row("Pool", data.pool != null ? (data.pool ? "Yes" : "No") : null);
  row("APN / TMK", data.apn);
  row("County", data.county);
  if (data.ownershipType) row("Land Tenure", data.ownershipType, { bold: true });
  y += 4;

  // ═══════════════════════════════════════════════════════════════════════
  // BUILDING DETAILS (if available)
  // ═══════════════════════════════════════════════════════════════════════

  if (
    data.constructionType ||
    data.roofType ||
    data.heatingType ||
    data.coolingType ||
    data.fireplaceCount ||
    data.basementType ||
    data.architectureStyle
  ) {
    section("BUILDING DETAILS");
    row("Architecture", data.architectureStyle);
    row("Construction", data.constructionType);
    row("Condition", data.condition);
    row("Roof", data.roofType);
    row("Foundation", data.foundationType);
    row("Heating", data.heatingType);
    row("Cooling", data.coolingType);
    if (data.fireplaceCount) row("Fireplaces", String(data.fireplaceCount));
    if (data.basementType)
      row("Basement", `${data.basementType}${data.basementSize ? ` (${num(data.basementSize)} sqft)` : ""}`);
    row(
      "Parking",
      data.parkingType
        ? `${data.parkingType}${data.parkingSpaces ? ` (${data.parkingSpaces} spaces)` : ""}`
        : data.parkingSpaces
          ? `${data.parkingSpaces} spaces`
          : null,
    );
    y += 4;
  }

  // ── MLS Listing ──
  if (data.mlsNumber || data.listingAgentName || data.listingStatus) {
    section("MLS LISTING");
    row("MLS #", data.mlsNumber);
    row("Status", data.listingStatus);
    if (data.daysOnMarket != null) row("Days on Market", String(data.daysOnMarket));
    row("Listing Agent", data.listingAgentName);
    row("Office", data.listingOfficeName);
    if (data.listingDescription) {
      ensureSpace(20);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Description:", margin, y);
      y += 5;
      doc.setTextColor(...COLORS.textDark);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(pdfSafe(data.listingDescription.substring(0, 600)), contentW);
      descLines.slice(0, 12).forEach((line: string) => {
        ensureSpace(6);
        doc.setFontSize(8);
        doc.text(line, margin, y);
        y += 4;
      });
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAX & PUBLIC RECORDS
  // ═══════════════════════════════════════════════════════════════════════

  if (data.assessedTotal != null || data.taxAmount != null) {
    section("TAX ASSESSMENT");
    row("Assessed Total", $(data.assessedTotal));
    row("Land Value", $(data.assessedLand));
    row("Improvement Value", $(data.assessedImpr));
    row("Market Value", $(data.marketTotal));
    row("Annual Tax", $(data.taxAmount));
    row("Tax Year", data.taxYear != null ? String(data.taxYear) : null);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MORTGAGE & EQUITY
  // ═══════════════════════════════════════════════════════════════════════

  if (data.loanBalance != null || data.loanAmount != null || data.lender) {
    section("MORTGAGE & EQUITY");
    row("Loan Balance", $(data.loanBalance));
    row("Original Loan", $(data.loanAmount));
    row("Lender", data.lender);
    row("Loan Type", data.loanType);
    row("Active Loans", data.loanCount != null ? String(data.loanCount) : null);
    row("LTV Ratio", data.ltv != null ? pct(data.ltv) : null);
    row("Est. Equity", data.estimatedEquity != null ? $(data.estimatedEquity) : null, { bold: true });

    // Equity visual bar
    if (data.avmValue && data.loanBalance && data.avmValue > 0) {
      ensureSpace(20);
      y += 2;
      y = drawEquityBar(doc, data.avmValue, data.loanBalance, y, margin);
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MORTGAGE PAYMENT ESTIMATE
  // ═══════════════════════════════════════════════════════════════════════

  {
    const price = data.listPrice || data.avmValue;
    if (price && price > 0) {
      section("MORTGAGE PAYMENT ESTIMATE");
      const downPct = 20;
      const rate = 6.75;
      const termYears = 30;
      const downPayment = price * (downPct / 100);
      const loanAmt = price - downPayment;
      const monthlyRate = rate / 100 / 12;
      const numPayments = termYears * 12;
      const monthlyPI =
        monthlyRate > 0
          ? (loanAmt * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
            (Math.pow(1 + monthlyRate, numPayments) - 1)
          : loanAmt / numPayments;
      const monthlyTax = (data.taxAmount || data.taxAnnualAmount || 0) / 12;
      const monthlyHOA = (data.associationFee || 0) / 12;
      const monthlyTotal = monthlyPI + monthlyTax + monthlyHOA;

      // Summary card
      ensureSpace(22);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin - 2, y - 4, contentW + 4, 16, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Estimated Monthly Payment", margin, y + 2);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.greenAccent);
      doc.text(pdfSafe(`$${Math.round(monthlyTotal).toLocaleString()}/mo`), margin + 60, y + 4);
      y += 18;

      doc.setTextColor(...COLORS.textDark);
      row("Home Price", $(price));
      row("Down Payment (20%)", $(Math.round(downPayment)));
      row("Loan Amount", $(Math.round(loanAmt)));
      row("Interest Rate", `${rate}% (30-year fixed)`);
      row("Principal & Interest", `$${Math.round(monthlyPI).toLocaleString()}/mo`);
      if (monthlyTax > 0) row("Property Tax", `$${Math.round(monthlyTax).toLocaleString()}/mo`);
      if (monthlyHOA > 0) row("HOA", `$${Math.round(monthlyHOA).toLocaleString()}/mo`);
      row("Total Interest (30yr)", $(Math.round(monthlyPI * numPayments - loanAmt)));
      y += 4;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SALES HISTORY
  // ═══════════════════════════════════════════════════════════════════════

  if (data.salesHistory && data.salesHistory.length > 0) {
    section("SALES HISTORY");

    const headers = ["", "Date", "Amount", "Buyer", "Seller"];
    const rows = data.salesHistory.slice(0, 10).map((sale, i) => ({
      label: String(i + 1),
      values: [
        sale.date || "-",
        sale.amount != null ? $(sale.amount) : "-",
        (sale.buyer || "-").substring(0, 22),
        (sale.seller || "-").substring(0, 22),
      ],
    }));

    y = drawComparisonTable(doc, headers, rows, margin, y, contentW);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OWNERSHIP
  // ═══════════════════════════════════════════════════════════════════════

  if (data.owner1 || data.owner2 || data.mailingAddress) {
    section("OWNERSHIP");
    row("Owner", data.owner1, { bold: true });
    if (data.owner2) row("Co-Owner", data.owner2);
    row("Owner Occupied", data.ownerOccupied === "Y" ? "Yes" : data.ownerOccupied === "N" ? "No" : data.ownerOccupied);
    row("Absentee Owner", data.absenteeOwner === "A" ? "Yes" : data.absenteeOwner);
    row(
      "Corporate Owner",
      data.corporateOwner === "Y" ? "Yes" : data.corporateOwner === "N" ? "No" : data.corporateOwner,
    );
    row("Mailing Address", data.mailingAddress);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COMPARABLE SALES
  // ═══════════════════════════════════════════════════════════════════════

  if (data.comps && data.comps.length > 0) {
    section("COMPARABLE SALES");

    const compHeaders = ["Address", "Price", "Bd/Ba", "Sqft", "Closed", "Match"];
    const compRows = data.comps.slice(0, 10).map((comp) => ({
      label: (comp.address || "-").substring(0, 30),
      values: [
        comp.price != null ? $(comp.price) : "-",
        `${comp.beds || "?"}/${comp.baths || "?"}`,
        comp.sqft != null ? num(comp.sqft) : "-",
        comp.closeDate || "-",
        comp.correlation != null
          ? `${Math.round(comp.correlation <= 1 ? comp.correlation * 100 : comp.correlation)}%`
          : "-",
      ],
    }));

    y = drawComparisonTable(doc, compHeaders, compRows, margin, y, contentW);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MARKET TRENDS
  // ═══════════════════════════════════════════════════════════════════════

  if (data.marketStats || data.marketType) {
    section("AREA MARKET STATISTICS");

    // Market type indicator
    if (data.marketType) {
      y = drawMarketTypeIndicator(doc, data.marketType, y, margin);
    }

    // Key stats as value cards
    const marketCards: ValueCard[] = [];
    if (data.monthsOfInventory != null)
      marketCards.push({ label: "MONTHS INVENTORY", value: data.monthsOfInventory.toFixed(1) });
    if (data.soldToListRatio != null)
      marketCards.push({ label: "SOLD-TO-LIST", value: `${data.soldToListRatio.toFixed(1)}%` });
    if (data.marketStats?.avgDOM != null)
      marketCards.push({ label: "AVG DOM", value: String(data.marketStats.avgDOM) });
    if (data.marketStats?.medianPrice != null)
      marketCards.push({ label: "MEDIAN PRICE", value: $(data.marketStats.medianPrice) });

    if (marketCards.length > 0) {
      ensureSpace(24);
      y = drawValueCards(doc, marketCards, y, margin);
    }

    if (data.marketStats) {
      const ms = data.marketStats;
      row("Active Listings", ms.totalListings != null ? String(ms.totalListings) : null);
      row("Price per Sqft", ms.pricePerSqft != null ? `$${ms.pricePerSqft.toLocaleString()}` : null);
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HAZARD & ENVIRONMENTAL ZONES
  // ═══════════════════════════════════════════════════════════════════════

  if ((data.hazards && data.hazards.length > 0) || data.federalData?.floodZone) {
    section("HAZARD & ENVIRONMENTAL ZONES");

    if (data.hazards) {
      data.hazards.forEach((h) => {
        ensureSpace(10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.redAccent);
        doc.text(pdfSafe(h.label), margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.textDark);
        doc.text(pdfSafe(h.value), margin + 56, y);
        y += 6;
      });
    }

    if (data.federalData?.floodZone) row("FEMA Flood Zone", data.federalData.floodZone);
    if (data.federalData?.floodRisk) row("Flood Risk", data.federalData.floodRisk);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD & ECONOMIC CONTEXT
  // ═══════════════════════════════════════════════════════════════════════

  if (data.federalData) {
    const fd = data.federalData;
    const hasDemo = fd.medianIncome != null || fd.populationDensity != null || fd.medianAge != null;
    const hasEcon = fd.unemploymentRate != null || fd.mortgageRate30yr != null;

    if (hasDemo || hasEcon) {
      section("NEIGHBORHOOD & ECONOMIC CONTEXT");
      row("Median Household Income", $(fd.medianIncome));
      row("Median Home Value (Area)", $(fd.medianHomeValue));
      row("Median Age", fd.medianAge != null ? String(fd.medianAge) : null);
      row("Population Density", fd.populationDensity != null ? `${num(fd.populationDensity)} /sq mi` : null);
      row("Unemployment Rate", fd.unemploymentRate != null ? pct(fd.unemploymentRate) : null);
      row("Poverty Rate", fd.povertyRate != null ? pct(fd.povertyRate) : null);
      row("Owner-Occupied", fd.ownerOccupiedPct != null ? pct(fd.ownerOccupiedPct) : null);
      row("Renter-Occupied", fd.renterOccupiedPct != null ? pct(fd.renterOccupiedPct) : null);
      row("30-yr Mortgage Rate", fd.mortgageRate30yr != null ? pct(fd.mortgageRate30yr) : null);
      y += 4;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHOTO GALLERY (if photos available)
  // ═══════════════════════════════════════════════════════════════════════

  const galleryPhotos = data.photoGalleryData || [];
  if (galleryPhotos.length > 0) {
    y = newPageWithHeader();
    y = drawSectionTitle(doc, "PHOTOS", y, margin);
    y = drawPhotoGallery(doc, galleryPhotos.slice(0, 6), y, margin);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // APPLY FOOTERS TO ALL PAGES
  // ═══════════════════════════════════════════════════════════════════════

  applyFootersToAllPages(doc, data.generatedAt, branding.displayName);

  return doc.output("blob");
}
