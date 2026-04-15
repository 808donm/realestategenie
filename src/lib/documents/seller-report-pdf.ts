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
  drawEquityBar,
  drawMarketTypeIndicator,
  drawPhotoGallery,
  drawComparisonTable,
  checkNewPage,
  type AgentBranding,
  type ValueCard,
} from "./pdf-report-utils";
import type { PropertyReportData } from "./property-intelligence-report";

export interface SellerReportData extends PropertyReportData {
  personalNote?: string;
  // CMA data (from cma-adjustments)
  cma?: {
    recommendedPrice: number;
    recommendedPricePerSqft: number;
    averageOfComps: number;
    totalAdjustment: number;
    cmaRange: { low: number; high: number };
    adjustedComps: Array<{
      comp: { address?: string; status: string; beds?: number; baths?: number; sqft?: number };
      price: number;
      adjustedPrice: number;
    }>;
  };
  // Pricing strategy data
  pricingStrategy?: {
    forSale?: { lowest: number; median: number; highest: number; medianPsf: number; medianDOM: number };
    closed?: { lowest: number; median: number; highest: number; medianPsf: number; medianDOM: number };
    distressed?: { lowest: number; median: number; highest: number };
    expired?: { lowest: number; median: number; highest: number; medianDOM: number };
  };
}

// ── Helpers ──

const $ = (n?: number | null) => fmt$(n);
const num = (n?: number | null) => fmtNum(n);
const pct = (n?: number | null) => fmtPct(n);

const fmtDate = (d?: string | null): string | undefined => {
  if (!d) return undefined;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
};

/**
 * Generate a branded Seller Report PDF.
 * Focused on valuation, CMA, equity, market activity, pricing strategy,
 * sales history, comps with adjustments, and hazards.
 */
export function generateSellerReportPDF(data: SellerReportData, branding: AgentBranding): Blob {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  const reportType = "Seller Report";
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
  // PAGE 2: VALUATION SUMMARY
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

  // Valuation cards
  const valCards: ValueCard[] = [];
  if (data.avmValue != null) valCards.push({ label: "ESTIMATED VALUE", value: $(data.avmValue), sub: data.avmDate ? `As of ${data.avmDate}` : undefined, color: COLORS.brandBlue });
  if (data.cma) valCards.push({ label: "CMA VALUE", value: $(data.cma.recommendedPrice), sub: `Based on ${data.cma.adjustedComps.length} comps`, color: COLORS.brandGold });
  if (data.lastSalePrice != null) valCards.push({ label: "LAST SALE", value: $(data.lastSalePrice), sub: fmtDate(data.lastSaleDate) || undefined });
  if (data.estimatedEquity != null) valCards.push({ label: "EST. EQUITY", value: `${data.estimatedEquity >= 0 ? "+" : ""}${$(data.estimatedEquity)}`, color: data.estimatedEquity >= 0 ? COLORS.greenAccent : COLORS.redAccent });

  if (valCards.length > 0) {
    y = drawValueCards(doc, valCards, y, margin);
  }

  // AVM Range
  if (data.avmLow != null && data.avmHigh != null && data.avmValue != null) {
    y = drawAvmRangeBar(doc, data.avmLow, data.avmValue, data.avmHigh, y, margin);
  }

  // CMA Range
  if (data.cma) {
    ensureSpace(16);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin - 2, y - 2, contentW + 4, 12, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    doc.text("CMA RANGE", margin, y + 3);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe($(data.cma.cmaRange.low)), margin + 30, y + 4);
    doc.setTextColor(146, 64, 14);
    doc.text(pdfSafe($(data.cma.recommendedPrice)), pageW / 2, y + 4, { align: "center" });
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe($(data.cma.cmaRange.high)), margin + contentW - 30, y + 4);
    y += 16;
  }

  y += 4;

  // ═══════════════════════════════════════════════════════════════════════
  // PROPERTY FACTS
  // ═══════════════════════════════════════════════════════════════════════

  section("PROPERTY FACTS");
  row("Property Type", data.propertyType);
  row("Year Built", data.yearBuilt != null ? String(data.yearBuilt) : null);
  row("Bedrooms", data.beds != null ? String(data.beds) : null);
  row("Bathrooms", data.baths != null ? String(data.baths) : null);
  row("Living Area", data.sqft != null ? `${num(data.sqft)} sqft` : null);
  row("Lot Size", data.lotSizeSqft != null ? `${num(data.lotSizeSqft)} sqft` : null);
  row("Stories", data.stories != null ? String(data.stories) : null);
  row("Parking", data.garageSpaces);
  row("APN / TMK", data.apn);
  row("County", data.county);
  row("Land Tenure", data.ownershipType);
  y += 4;

  // Building details
  if (data.constructionType || data.roofType || data.heatingType || data.coolingType) {
    section("BUILDING DETAILS");
    row("Architecture", data.architectureStyle);
    row("Construction", data.constructionType);
    row("Condition", data.condition);
    row("Roof", data.roofType);
    row("Foundation", data.foundationType);
    row("Heating", data.heatingType);
    row("Cooling", data.coolingType);
    if (data.fireplaceCount) row("Fireplaces", String(data.fireplaceCount));
    y += 4;
  }

  // Interior / Exterior features
  if (data.interiorFeatures && data.interiorFeatures.length > 0) {
    section("INTERIOR FEATURES");
    data.interiorFeatures.forEach((f) => row(f.label, f.value));
    y += 4;
  }
  if (data.exteriorFeatures && data.exteriorFeatures.length > 0) {
    section("EXTERIOR FEATURES");
    data.exteriorFeatures.forEach((f) => row(f.label, f.value));
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEGAL DESCRIPTION
  // ═══════════════════════════════════════════════════════════════════════

  if (data.legal || data.apn || data.county) {
    section("LEGAL DESCRIPTION");
    row("Parcel Number", data.apn);
    row("County", data.county);
    if (data.legal?.zoning) row("Zoning", data.legal.zoning);
    if (data.legal?.censusTract) row("Census Tract", data.legal.censusTract);
    if (data.legal?.subdivision) row("Subdivision", data.legal.subdivision);
    if (data.legal?.legalDescription) {
      ensureSpace(14);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Legal Description:", margin, y);
      y += 5;
      doc.setTextColor(...COLORS.textDark);
      doc.setFont("helvetica", "normal");
      const legalLines = doc.splitTextToSize(pdfSafe(data.legal.legalDescription.substring(0, 300)), contentW);
      legalLines.slice(0, 4).forEach((line: string) => {
        ensureSpace(5);
        doc.setFontSize(8);
        doc.text(line, margin, y);
        y += 4;
      });
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OWNERSHIP
  // ═══════════════════════════════════════════════════════════════════════

  if (data.owner1 || data.owner2 || data.mailingAddress) {
    section("OWNER FACTS");
    row("Owner", data.owner1, { bold: true });
    if (data.owner2) row("Co-Owner", data.owner2);
    row("Owner Occupied", data.ownerOccupied === "Y" ? "Yes" : data.ownerOccupied === "N" ? "No" : data.ownerOccupied);
    row("Mailing Address", data.mailingAddress);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TAX ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════

  if (data.taxHistory && data.taxHistory.length > 0) {
    section("TAX HISTORY");
    const taxHeaders = ["Year", "Land", "Improvements", "Total", "Tax Amount"];
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
  // ESTIMATED EQUITY
  // ═══════════════════════════════════════════════════════════════════════

  if (data.loanBalance != null || data.estimatedEquity != null) {
    section("ESTIMATED EQUITY");

    const eqCards: ValueCard[] = [];
    if (data.avmValue != null) eqCards.push({ label: "PROPERTY VALUE", value: $(data.avmValue) });
    if (data.loanBalance != null) eqCards.push({ label: "LOAN BALANCE", value: $(data.loanBalance) });
    if (data.estimatedEquity != null) eqCards.push({ label: "ESTIMATED EQUITY", value: `${data.estimatedEquity >= 0 ? "+" : ""}${$(data.estimatedEquity)}`, color: data.estimatedEquity >= 0 ? COLORS.greenAccent : COLORS.redAccent });

    if (eqCards.length > 0) {
      ensureSpace(24);
      y = drawValueCards(doc, eqCards, y, margin);
    }

    if (data.avmValue && data.loanBalance && data.avmValue > 0) {
      ensureSpace(20);
      y += 2;
      y = drawEquityBar(doc, data.avmValue, data.loanBalance, y, margin);
    }

    row("Lender", data.lender);
    row("Loan Type", data.loanType);
    row("LTV Ratio", data.ltv != null ? pct(data.ltv) : null);
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
    }

    if (data.marketStats) {
      row("Active Listings", data.marketStats.totalListings != null ? String(data.marketStats.totalListings) : null);
      row("Price per Sqft", data.marketStats.pricePerSqft != null ? `$${data.marketStats.pricePerSqft.toLocaleString()}` : null);
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SALES HISTORY
  // ═══════════════════════════════════════════════════════════════════════

  if (data.salesHistory && data.salesHistory.length > 0) {
    section("SALES HISTORY");
    const headers = ["", "Date", "Amount", "Buyer", "Seller"];
    const rows = data.salesHistory.slice(0, 10).map((sale, i) => {
      const amt = typeof sale.amount === "object" ? (sale.amount as unknown as Record<string, number>)?.saleAmt : sale.amount;
      return {
        label: String(i + 1),
        values: [fmtDate(sale.date) || "-", amt != null ? $(amt) : "-", (sale.buyer || "-").substring(0, 22), (sale.seller || "-").substring(0, 22)],
      };
    });
    y = drawComparisonTable(doc, headers, rows, margin, y, contentW);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COMPARABLE SALES (with CMA adjustments if available)
  // ═══════════════════════════════════════════════════════════════════════

  if (data.cma && data.cma.adjustedComps.length > 0) {
    section("COMPARABLE SALES");
    const compHeaders = ["Address", "Status", "Price", "Adjusted", "Bd/Ba", "Sqft"];
    const compRows = data.cma.adjustedComps.map((ac) => ({
      label: (ac.comp.address || "-").substring(0, 28),
      values: [
        ac.comp.status,
        $(ac.price),
        $(ac.adjustedPrice),
        `${ac.comp.beds || "?"}/${ac.comp.baths || "?"}`,
        ac.comp.sqft ? num(ac.comp.sqft) : "-",
      ],
    }));
    y = drawComparisonTable(doc, compHeaders, compRows, margin, y, contentW);
    y += 4;
  } else if (data.comps && data.comps.length > 0) {
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
  // PRICING STRATEGY (RPR-style)
  // ═══════════════════════════════════════════════════════════════════════

  if (data.pricingStrategy) {
    section("PRICING STRATEGY");
    const ps = data.pricingStrategy;
    const psHeaders = ["", "For Sale", "Closed", "Distressed", "Expired"];
    const psRows = [
      { label: "Lowest Price", values: [$(ps.forSale?.lowest), $(ps.closed?.lowest), $(ps.distressed?.lowest), $(ps.expired?.lowest)] },
      { label: "Median Price", values: [$(ps.forSale?.median), $(ps.closed?.median), $(ps.distressed?.median), $(ps.expired?.median)] },
      { label: "Highest Price", values: [$(ps.forSale?.highest), $(ps.closed?.highest), $(ps.distressed?.highest), $(ps.expired?.highest)] },
    ];
    if (ps.forSale?.medianPsf || ps.closed?.medianPsf) {
      psRows.push({ label: "Median $/Sqft", values: [`$${ps.forSale?.medianPsf || "-"}`, `$${ps.closed?.medianPsf || "-"}`, "-", "-"] });
    }
    if (ps.forSale?.medianDOM || ps.closed?.medianDOM) {
      psRows.push({ label: "Median DOM", values: [ps.forSale?.medianDOM != null ? String(ps.forSale.medianDOM) : "-", ps.closed?.medianDOM != null ? String(ps.closed.medianDOM) : "-", "-", ps.expired?.medianDOM != null ? String(ps.expired.medianDOM) : "-"] });
    }
    y = drawComparisonTable(doc, psHeaders, psRows, margin, y, contentW);
    y += 6;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CMA / PRICING SUMMARY
  // ═══════════════════════════════════════════════════════════════════════

  if (data.cma) {
    section("PRICING SUMMARY");

    ensureSpace(40);
    // Gold bordered box
    doc.setDrawColor(...COLORS.brandGold);
    doc.setLineWidth(1);
    doc.roundedRect(margin - 2, y - 4, contentW + 4, 36, 2, 2, "S");

    // Recommended Price
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    doc.text("RECOMMENDED PRICE", pageW / 2, y + 2, { align: "center" });
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe($(data.cma.recommendedPrice)), pageW / 2, y + 12, { align: "center" });
    if (data.cma.recommendedPricePerSqft > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(pdfSafe(`at $${data.cma.recommendedPricePerSqft}/sq. ft.`), pageW / 2, y + 18, { align: "center" });
    }

    // CMA details
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe(`Average of Comps: ${$(data.cma.averageOfComps)}`), margin + 4, y + 26);
    doc.text(pdfSafe(`Adjustments: ${data.cma.totalAdjustment !== 0 ? `${data.cma.totalAdjustment > 0 ? "+" : ""}${$(data.cma.totalAdjustment)}` : "$0"}`), margin + 4, y + 30);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(pdfSafe(`CMA Range: ${$(data.cma.cmaRange.low)} - ${$(data.cma.cmaRange.high)}`), margin + contentW - 60, y + 28);

    y += 42;
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
  // FOOTERS
  // ═══════════════════════════════════════════════════════════════════════

  applyFootersToAllPages(doc, data.generatedAt, branding.displayName);

  return doc.output("blob");
}
