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
  drawSectionTitle,
  drawRow,
  drawValueCards,
  drawAvmRangeBar,
  drawMarketTypeIndicator,
  drawPhotoGallery,
  drawComparisonTable,
  drawHorizontalBarChart,
  checkNewPage,
  type AgentBranding,
  type ValueCard,
  type BarChartItem,
} from "./pdf-report-utils";
import type { PropertyReportData } from "./property-intelligence-report";
import type { CensusDetailedDemographics } from "@/lib/integrations/federal-data-client";

export interface BuyerReportData extends PropertyReportData {
  personalNote?: string;
  // Multi-geography demographics for neighborhood section
  demographics?: {
    zip?: CensusDetailedDemographics & Record<string, unknown>;
    county?: CensusDetailedDemographics & Record<string, unknown>;
    state?: CensusDetailedDemographics & Record<string, unknown>;
    national?: CensusDetailedDemographics & Record<string, unknown>;
  };
  walkScore?: number;
  amenityScore?: number;
  leisureScore?: number;
}

// ── Helpers ──

const $ = (n?: number | null) => fmt$(n);
const num = (n?: number | null) => fmtNum(n);
const pct = (n?: number | null) => fmtPct(n);
const fmtK = (n?: number | null) => {
  if (n == null) return "-";
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtDate = (d?: string | null): string | undefined => {
  if (!d) return undefined;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
};

/**
 * Generate a branded Buyer Report PDF.
 * Focused on property details, mortgage estimate, photos, market trends,
 * neighborhood demographics, walkability, comps, and hazards.
 */
export function generateBuyerReportPDF(data: BuyerReportData, branding: AgentBranding): Blob {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  const reportType = "Buyer Report";
  const subtitle = data.address;
  const cityLine = [data.city, data.state, data.zip].filter(Boolean).join(", ");

  const newPageWithHeader = (): number => {
    doc.addPage();
    return drawPageHeader(doc, reportType, pdfSafe(subtitle));
  };

  const ensureSpace = (needed: number): void => {
    y = checkNewPage(doc, y, needed, newPageWithHeader);
  };

  const section = (title: string): void => {
    ensureSpace(30);
    y = drawSectionTitle(doc, title, y, margin);
  };

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
  // PAGE 2: VALUATION OVERVIEW + BASIC FACTS
  // ═══════════════════════════════════════════════════════════════════════

  y = newPageWithHeader();

  // Personal note
  if (data.personalNote) {
    ensureSpace(30);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin - 2, y - 4, contentW + 4, 22, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.textDark);
    const noteLines = doc.splitTextToSize(pdfSafe(data.personalNote.substring(0, 400)), contentW - 4);
    noteLines.slice(0, 5).forEach((line: string) => {
      doc.text(line, margin, y);
      y += 4;
    });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.brandBlue);
    doc.text(pdfSafe(branding.displayName), margin, y + 2);
    y += 10;
  }

  // Listing status badge
  if (data.listingStatus) {
    ensureSpace(10);
    const statusColor = data.listingStatus === "Active" ? COLORS.greenAccent : COLORS.brandBlue;
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(margin, y - 3, 50, 6, 1, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(pdfSafe(`${data.listingStatus} / For Sale`), margin + 2, y + 1);
    y += 8;
  }

  // Price + AVM value cards
  const price = data.listPrice || data.avmValue;
  const priceCards: ValueCard[] = [];
  if (price) priceCards.push({ label: data.listingStatus === "Closed" ? "CLOSED PRICE" : "LIST PRICE", value: $(price), color: COLORS.brandBlue });
  if (data.avmValue) priceCards.push({ label: "AVM", value: $(data.avmValue), sub: data.avmDate ? `Updated ${data.avmDate}` : undefined });
  if (priceCards.length > 0) {
    y = drawValueCards(doc, priceCards, y, margin);
  }

  // AVM Range
  if (data.avmLow != null && data.avmHigh != null && data.avmValue != null) {
    y = drawAvmRangeBar(doc, data.avmLow, data.avmValue, data.avmHigh, y, margin);
  }

  // Basic facts row
  y += 4;
  const factParts: string[] = [];
  if (data.beds) factParts.push(`${data.beds} Beds`);
  if (data.baths) factParts.push(`${data.baths} Baths`);
  if (data.sqft) factParts.push(`${num(data.sqft)} Sq Ft`);
  if (data.lotSizeSqft) factParts.push(`${num(data.lotSizeSqft)} Lot`);
  if (factParts.length > 0) {
    ensureSpace(10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe(factParts.join("   |   ")), margin, y);
    y += 8;
  }

  section("BASIC FACTS");
  row("Type", data.propertyType);
  if (data.daysOnMarket != null) row("Days on Market", String(data.daysOnMarket));
  row("Year Built", data.yearBuilt != null ? String(data.yearBuilt) : null);
  if (price && data.sqft) row("Price per Sqft", `$${Math.round(price / data.sqft).toLocaleString()}`);
  if (price && data.avmValue && data.avmValue > 0) row("Price to Est. Value", `${Math.round((price / data.avmValue) * 100)}%`);
  row("Zoning", data.legal?.zoning);
  row("Land Use", data.propertyType);
  row("APN / TMK", data.apn);
  row("Land Tenure", data.ownershipType);
  y += 4;

  // MLS Listing details (if available)
  if (data.mlsNumber || data.listingAgentName) {
    section("MLS LISTING");
    row("MLS #", data.mlsNumber);
    row("Status", data.listingStatus);
    if (data.daysOnMarket != null) row("Days on Market", String(data.daysOnMarket));
    row("Listing Agent", data.listingAgentName);
    row("Office", data.listingOfficeName);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROPERTY INFORMATION
  // ═══════════════════════════════════════════════════════════════════════

  section("PROPERTY INFORMATION");
  row("Property Type", data.propertyType);
  row("Year Built", data.yearBuilt != null ? String(data.yearBuilt) : null);
  row("Bedrooms", data.beds != null ? String(data.beds) : null);
  row("Bathrooms", data.baths != null ? String(data.baths) : null);
  row("Living Area", data.sqft != null ? `${num(data.sqft)} sqft` : null);
  row("Lot Size", data.lotSizeSqft != null ? `${num(data.lotSizeSqft)} sqft` : null);
  row("Stories", data.stories != null ? String(data.stories) : null);
  row("Parking", data.garageSpaces);
  row("Pool", data.pool != null ? (data.pool ? "Yes" : "No") : null);
  row("County", data.county);
  y += 4;

  // Building details
  if (data.constructionType || data.roofType || data.heatingType || data.coolingType || data.architectureStyle) {
    section("BUILDING DETAILS");
    row("Architecture", data.architectureStyle);
    row("Construction", data.constructionType);
    row("Condition", data.condition);
    row("Roof", data.roofType);
    row("Foundation", data.foundationType);
    row("Heating", data.heatingType);
    row("Cooling", data.coolingType);
    if (data.fireplaceCount) row("Fireplaces", String(data.fireplaceCount));
    if (data.basementType) row("Basement", `${data.basementType}${data.basementSize ? ` (${num(data.basementSize)} sqft)` : ""}`);
    y += 4;
  }

  // Interior features
  if (data.interiorFeatures && data.interiorFeatures.length > 0) {
    section("INTERIOR FEATURES");
    data.interiorFeatures.forEach((f) => row(f.label, f.value));
    y += 4;
  }

  // Exterior features
  if (data.exteriorFeatures && data.exteriorFeatures.length > 0) {
    section("EXTERIOR FEATURES");
    data.exteriorFeatures.forEach((f) => row(f.label, f.value));
    y += 4;
  }

  // MLS Description
  if (data.listingDescription) {
    section("DESCRIPTION");
    ensureSpace(20);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    const descLines = doc.splitTextToSize(pdfSafe(data.listingDescription.substring(0, 800)), contentW);
    descLines.slice(0, 15).forEach((line: string) => {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4;
    });
    y += 4;
  }

  // Legal / Location
  if (data.legal || data.federalData?.floodZone) {
    section("LOCATION DETAILS");
    if (data.legal?.subdivision) row("Subdivision", data.legal.subdivision);
    if (data.legal?.zoning) row("Zoning", data.legal.zoning);
    if (data.federalData?.floodZone) row("Flood Zone", data.federalData.floodZone);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAX ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════

  if (data.taxHistory && data.taxHistory.length > 0) {
    section("TAX HISTORY");
    const taxHeaders = ["Year", "Land", "Improvements", "Total Assessed", "Tax Amount"];
    const taxRows = data.taxHistory.slice(0, 5).map((t) => ({
      label: String(t.year),
      values: [$(t.assessedLand || t.marketLand), $(t.assessedImpr || t.marketImpr), $(t.assessedTotal || t.marketTotal), $(t.taxAmount)],
    }));
    y = drawComparisonTable(doc, taxHeaders, taxRows, margin, y, contentW);
    y += 4;
  } else if (data.assessedTotal != null || data.taxAmount != null) {
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
  // PHOTOS
  // ═══════════════════════════════════════════════════════════════════════

  const galleryPhotos = data.photoGalleryData || [];
  if (galleryPhotos.length > 0) {
    y = newPageWithHeader();
    y = drawSectionTitle(doc, "PHOTOS", y, margin);
    y = drawPhotoGallery(doc, galleryPhotos.slice(0, 12), y, margin);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MORTGAGE PAYMENT ESTIMATE
  // ═══════════════════════════════════════════════════════════════════════

  if (price && price > 0) {
    section("MORTGAGE PAYMENT ESTIMATE");
    const downPct = 20;
    const rate = 6.75;
    const termYears = 30;
    const downPayment = price * (downPct / 100);
    const loanAmt = price - downPayment;
    const monthlyRate = rate / 100 / 12;
    const numPayments = termYears * 12;
    const monthlyPI = monthlyRate > 0
      ? (loanAmt * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : loanAmt / numPayments;
    const monthlyTax = (data.taxAmount || data.taxAnnualAmount || 0) / 12;
    const monthlyHOA = (data.associationFee || 0) / 12;
    const monthlyTotal = monthlyPI + monthlyTax + monthlyHOA;

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

  // ═══════════════════════════════════════════════════════════════════════
  // MARKET TRENDS
  // ═══════════════════════════════════════════════════════════════════════

  if (data.marketStats || data.marketType) {
    section("MARKET TRENDS");

    if (data.marketType) {
      y = drawMarketTypeIndicator(doc, data.marketType, y, margin);
    }

    const marketCards: ValueCard[] = [];
    if (data.monthsOfInventory != null) marketCards.push({ label: "MONTHS INVENTORY", value: data.monthsOfInventory.toFixed(1) });
    if (data.soldToListRatio != null) marketCards.push({ label: "SOLD-TO-LIST", value: `${data.soldToListRatio.toFixed(1)}%` });
    if (data.marketStats?.avgDOM != null) marketCards.push({ label: "MEDIAN DOM", value: String(data.marketStats.avgDOM) });
    if (data.marketStats?.medianPrice != null) marketCards.push({ label: "MEDIAN SOLD", value: $(data.marketStats.medianPrice) });

    if (marketCards.length > 0) {
      ensureSpace(24);
      y = drawValueCards(doc, marketCards, y, margin);
    }

    // MoM indicators
    if (data.marketTrends) {
      const mt = data.marketTrends;
      const trend = (v?: number) => v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}% MoM` : null;
      if (mt.medianPriceMoM != null) row("Median Price Trend", trend(mt.medianPriceMoM));
      if (mt.inventoryMoM != null) row("Inventory Trend", trend(mt.inventoryMoM));
      if (mt.domMoM != null) row("DOM Trend", trend(mt.domMoM));
      if (mt.soldToListMoM != null) row("Sold-to-List Trend", trend(mt.soldToListMoM));
    }

    if (data.marketStats) {
      row("Active Listings", data.marketStats.totalListings != null ? String(data.marketStats.totalListings) : null);
      row("Price per Sqft", data.marketStats.pricePerSqft != null ? `$${data.marketStats.pricePerSqft.toLocaleString()}` : null);
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD DEMOGRAPHICS
  // ═══════════════════════════════════════════════════════════════════════

  const demo = data.demographics;
  if (demo) {
    const geoHeaders = ["", data.zip || "ZIP", data.county || "County", data.state || "State", "USA"];

    const geoVal = (field: string): string[] => {
      const levels = [demo.zip, demo.county, demo.state, demo.national];
      return levels.map((level) => {
        if (!level) return "-";
        const val = (level as Record<string, unknown>)[field];
        if (val == null) return "-";
        if (typeof val === "number") {
          if (field.includes("median") || field.includes("Home") || field.includes("Income")) return $(val);
          if (field.includes("Pct") || field.includes("pct")) return `${val}%`;
          return fmtK(val);
        }
        return String(val);
      });
    };

    // Housing Stats
    ensureSpace(60);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("Neighborhood", margin, y + 4);
    y += 12;

    section("HOUSING FACTS & STATS");
    const housingRows = [
      { label: "Median Home Value", values: geoVal("medianHomeValue") },
      { label: "Median Household Income", values: geoVal("medianHouseholdIncome") },
      { label: "Median Age", values: geoVal("medianAge") },
      {
        label: "Own %",
        values: [demo.zip, demo.county, demo.state, demo.national].map((l) => {
          if (!l?.ownerOccupied || !l?.totalHousingUnits) return "-";
          return `${Math.round(((l.ownerOccupied as number) / (l.totalHousingUnits as number)) * 100)}%`;
        }),
      },
      {
        label: "Rent %",
        values: [demo.zip, demo.county, demo.state, demo.national].map((l) => {
          if (!l?.renterOccupied || !l?.totalHousingUnits) return "-";
          return `${Math.round(((l.renterOccupied as number) / (l.totalHousingUnits as number)) * 100)}%`;
        }),
      },
    ];
    y = drawComparisonTable(doc, geoHeaders, housingRows, margin, y, contentW);
    y += 6;

    // People Stats
    section("PEOPLE FACTS & STATS");
    const peopleRows = [
      { label: "Population", values: [demo.zip, demo.county, demo.state, demo.national].map((l) => l?.totalPopulation != null ? fmtK(l.totalPopulation as number) : "-") },
      { label: "Median Age", values: geoVal("medianAge") },
    ];
    y = drawComparisonTable(doc, geoHeaders, peopleRows, margin, y, contentW);
    y += 6;

    // Age distribution
    if (demo.zip?.ageGroups) {
      ensureSpace(60);
      section("POPULATION BY AGE GROUP");
      const ageData: BarChartItem[] = [
        { label: "Under 18", value: demo.zip.ageGroups.under18, displayValue: `${demo.zip.ageGroups.under18}%` },
        { label: "18-24", value: demo.zip.ageGroups.from18to24, displayValue: `${demo.zip.ageGroups.from18to24}%` },
        { label: "25-34", value: demo.zip.ageGroups.from25to34, displayValue: `${demo.zip.ageGroups.from25to34}%` },
        { label: "35-44", value: demo.zip.ageGroups.from35to44, displayValue: `${demo.zip.ageGroups.from35to44}%` },
        { label: "45-54", value: demo.zip.ageGroups.from45to54, displayValue: `${demo.zip.ageGroups.from45to54}%` },
        { label: "55-64", value: demo.zip.ageGroups.from55to64, displayValue: `${demo.zip.ageGroups.from55to64}%` },
        { label: "65+", value: demo.zip.ageGroups.over65, displayValue: `${demo.zip.ageGroups.over65}%` },
      ];
      y = drawHorizontalBarChart(doc, ageData, {
        x: margin, y, width: contentW, labelWidth: 35, barHeight: 7, barGap: 3,
        maxValue: Math.max(...ageData.map((d) => d.value), 1), barColor: COLORS.brandBlue,
      });
      y += 6;
    }

    // Income brackets
    if (demo.zip?.incomeBrackets) {
      ensureSpace(60);
      section("HOUSEHOLD INCOME BRACKETS");
      const ib = demo.zip.incomeBrackets;
      const incomeData: BarChartItem[] = [
        { label: ">$200K", value: ib.over200k, displayValue: `${ib.over200k}%` },
        { label: "$150K-$200K", value: ib.from150kTo200k, displayValue: `${ib.from150kTo200k}%` },
        { label: "$100K-$150K", value: ib.from100kTo150k, displayValue: `${ib.from100kTo150k}%` },
        { label: "$75K-$100K", value: ib.from75kTo100k, displayValue: `${ib.from75kTo100k}%` },
        { label: "$50K-$75K", value: ib.from50kTo75k, displayValue: `${ib.from50kTo75k}%` },
        { label: "$25K-$50K", value: ib.from25kTo50k, displayValue: `${ib.from25kTo50k}%` },
        { label: "<$25K", value: ib.under25k, displayValue: `${ib.under25k}%` },
      ];
      y = drawHorizontalBarChart(doc, incomeData, {
        x: margin, y, width: contentW, labelWidth: 40, barHeight: 7, barGap: 3,
        maxValue: Math.max(...incomeData.map((d) => d.value), 1), barColor: COLORS.brandBlue,
      });
      y += 6;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WALKABILITY SCORES
  // ═══════════════════════════════════════════════════════════════════════

  if (data.walkScore != null || data.walkabilityScore != null) {
    ensureSpace(30);
    section("WALKABILITY");
    const ws = data.walkScore ?? data.walkabilityScore;
    if (ws != null) {
      const cx = margin + contentW * 0.8;
      const cy = y + 8;
      doc.setDrawColor(...COLORS.brandBlue);
      doc.setLineWidth(1.5);
      doc.circle(cx, cy, 12, "S");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.brandBlue);
      doc.text(ws <= 5 ? ws.toFixed(1) : String(ws), cx, cy + 2, { align: "center" });
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("out of 5", cx, cy + 7, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("This neighborhood is rated for walking access to", margin, y);
      doc.text("general points of interest, amenities, and leisure.", margin, y + 4);
      y += 26;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HAZARDS
  // ═══════════════════════════════════════════════════════════════════════

  if (data.hazards && data.hazards.length > 0) {
    section("ENVIRONMENTAL & HAZARD ZONES");
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
        fmtDate(comp.closeDate) || "-",
        comp.correlation != null ? `${Math.round(comp.correlation <= 1 ? comp.correlation * 100 : comp.correlation)}%` : "-",
      ],
    }));
    y = drawComparisonTable(doc, compHeaders, compRows, margin, y, contentW);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTERS
  // ═══════════════════════════════════════════════════════════════════════

  applyFootersToAllPages(doc, data.generatedAt, branding.displayName);

  return doc.output("blob");
}
