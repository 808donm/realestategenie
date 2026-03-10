import { jsPDF } from "jspdf";
import type { AgentBranding } from "./neighborhood-profile-generator";

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
    // FRED
    mortgageRate30yr?: number;
    cpi?: number;
    // FEMA
    floodZone?: string;
    floodRisk?: string;
  };
  // Sales history (recent transactions)
  salesHistory?: Array<{
    date?: string;
    amount?: number;
    buyer?: string;
    seller?: string;
    docType?: string;
  }>;
  // Generated timestamp
  generatedAt: string;
}

// ── Helpers ──

const $ = (n?: number) => (n != null ? `$${n.toLocaleString()}` : "—");
const num = (n?: number) => (n != null ? n.toLocaleString() : "—");
const pct = (n?: number) => (n != null ? `${n.toFixed(1)}%` : "—");

/**
 * Generate a branded Property Intelligence Report PDF.
 * All data is pre-gathered by the API route; this function just lays it out.
 */
export function generatePropertyIntelligencePDF(
  data: PropertyReportData,
  branding: AgentBranding,
): Blob {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Colors ──
  const brandBlue = [30, 64, 175] as const;   // #1e40af
  const brandGold = [180, 130, 40] as const;   // #b48228
  const textDark = [17, 24, 39] as const;
  const textMuted = [107, 114, 128] as const;
  const sectionBg = [243, 244, 246] as const;  // #f3f4f6

  const checkNewPage = (needed: number) => {
    if (y + needed > 275) {
      addFooter();
      doc.addPage();
      y = 16;
    }
  };

  const addFooter = () => {
    const pg = doc.getNumberOfPages();
    doc.setPage(pg);
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text(
      "DISCLAIMER: Data obtained from third-party sources. No warranty regarding accuracy. Verify independently. Complies with Fair Housing Act.",
      margin, 284, { maxWidth: contentW },
    );
    doc.text(`${branding.displayName} | ${branding.email}${branding.phone ? ` | ${branding.phone}` : ""}`, margin, 290);
    doc.text(`Page ${pg}`, pageW - margin, 290, { align: "right" });
  };

  // ── HEADER ──
  doc.setFillColor(...brandBlue);
  doc.rect(0, 0, pageW, 42, "F");
  // Gold accent bar
  doc.setFillColor(...brandGold);
  doc.rect(0, 42, pageW, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Property Intelligence Report", margin, 18);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.address, margin, 28);

  const cityLine = [data.city, data.state, data.zip].filter(Boolean).join(", ");
  if (cityLine) {
    doc.setFontSize(10);
    doc.text(cityLine, margin, 34);
  }

  // Report date top-right
  doc.setFontSize(8);
  doc.text(data.generatedAt, pageW - margin, 34, { align: "right" });

  y = 52;

  // ── Agent branding line ──
  doc.setTextColor(...textMuted);
  doc.setFontSize(9);
  doc.text(`Prepared by ${branding.displayName}${branding.licenseNumber ? ` (Lic# ${branding.licenseNumber})` : ""}`, margin, y);
  y += 10;

  // ── SECTION HELPER ──
  const sectionTitle = (title: string) => {
    checkNewPage(30);
    doc.setFillColor(...sectionBg);
    doc.roundedRect(margin - 2, y - 4, contentW + 4, 10, 1, 1, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brandBlue);
    doc.text(title, margin, y + 2);
    y += 12;
  };

  // ── ROW HELPER (label: value) ──
  const row = (label: string, value: string | undefined | null, opts?: { bold?: boolean }) => {
    if (!value || value === "—") return;
    checkNewPage(8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(label, margin, y);
    doc.setTextColor(...textDark);
    if (opts?.bold) doc.setFont("helvetica", "bold");
    doc.text(value, margin + 56, y);
    if (opts?.bold) doc.setFont("helvetica", "normal");
    y += 6;
  };

  // ── VALUE CARDS (like the summary bar in the modal) ──
  const valueCards = (cards: Array<{ label: string; value: string; sub?: string }>) => {
    const available = cards.filter(c => c.value && c.value !== "—");
    if (available.length === 0) return;
    checkNewPage(22);

    const cardW = Math.min(42, (contentW - (available.length - 1) * 4) / available.length);
    available.forEach((c, i) => {
      const x = margin + i * (cardW + 4);
      doc.setFillColor(240, 245, 255); // light blue bg
      doc.roundedRect(x, y, cardW, 18, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...brandBlue);
      doc.text(c.label, x + 2, y + 5);
      doc.setFontSize(10);
      doc.setTextColor(...textDark);
      doc.text(c.value, x + 2, y + 12);
      if (c.sub) {
        doc.setFontSize(6);
        doc.setTextColor(...textMuted);
        doc.text(c.sub, x + 2, y + 16);
      }
    });
    y += 24;
  };

  // ── 1. VALUE SNAPSHOT ──
  sectionTitle("VALUE SNAPSHOT");
  valueCards([
    { label: "AVM VALUE", value: $(data.avmValue), sub: data.avmDate ? `As of ${data.avmDate}` : undefined },
    { label: "LAST SALE", value: $(data.lastSalePrice), sub: data.lastSaleDate || undefined },
    { label: "EST. EQUITY", value: data.estimatedEquity != null ? `${data.estimatedEquity >= 0 ? "+" : ""}${$(data.estimatedEquity)}` : "—" },
    { label: "LTV", value: data.ltv != null ? pct(data.ltv) : "—" },
  ]);

  if (data.avmLow != null && data.avmHigh != null) {
    row("AVM Range", `${$(data.avmLow)} – ${$(data.avmHigh)}`);
  }
  if (data.avmConfidence != null) row("Confidence Score", String(data.avmConfidence));
  if (data.rentalEstimate != null) {
    row("Est. Monthly Rent", `${$(data.rentalEstimate)}/mo`);
    if (data.rentalLow != null && data.rentalHigh != null)
      row("Rental Range", `${$(data.rentalLow)} – ${$(data.rentalHigh)}/mo`);
    if (data.grossYield != null) row("Gross Yield", pct(data.grossYield));
  }
  y += 4;

  // ── 2. PROPERTY DETAILS ──
  sectionTitle("PROPERTY DETAILS");
  row("Property Type", data.propertyType);
  row("Year Built", data.yearBuilt != null ? String(data.yearBuilt) : null);
  row("Bedrooms", data.beds != null ? String(data.beds) : null);
  row("Bathrooms", data.baths != null ? String(data.baths) : null);
  row("Living Area", data.sqft != null ? `${num(data.sqft)} sqft` : null);
  row("Lot Size", data.lotSizeSqft != null ? `${num(data.lotSizeSqft)} sqft${data.lotSizeAcres ? ` (${data.lotSizeAcres.toFixed(2)} acres)` : ""}` : null);
  row("Stories", data.stories != null ? String(data.stories) : null);
  row("Parking", data.garageSpaces);
  row("Pool", data.pool != null ? (data.pool ? "Yes" : "No") : null);
  row("APN / TMK", data.apn);
  row("County", data.county);
  y += 4;

  // ── 3. TAX ASSESSMENT ──
  if (data.assessedTotal != null || data.taxAmount != null) {
    sectionTitle("TAX ASSESSMENT");
    row("Assessed Total", $(data.assessedTotal));
    row("Land Value", $(data.assessedLand));
    row("Improvement Value", $(data.assessedImpr));
    row("Market Value", $(data.marketTotal));
    row("Annual Tax", $(data.taxAmount));
    row("Tax Year", data.taxYear != null ? String(data.taxYear) : null);
    y += 4;
  }

  // ── 4. MORTGAGE & EQUITY ──
  if (data.loanBalance != null || data.loanAmount != null || data.lender) {
    sectionTitle("MORTGAGE & EQUITY");
    row("Loan Balance", $(data.loanBalance));
    row("Original Loan", $(data.loanAmount));
    row("Lender", data.lender);
    row("Loan Type", data.loanType);
    row("Active Loans", data.loanCount != null ? String(data.loanCount) : null);
    row("LTV Ratio", data.ltv != null ? pct(data.ltv) : null);
    row("Est. Equity", data.estimatedEquity != null ? $(data.estimatedEquity) : null, { bold: true });
    y += 4;
  }

  // ── 5. OWNERSHIP ──
  if (data.owner1 || data.owner2) {
    sectionTitle("OWNERSHIP");
    row("Owner", data.owner1);
    if (data.owner2) row("Co-Owner", data.owner2);
    row("Owner Occupied", data.ownerOccupied);
    row("Absentee Owner", data.absenteeOwner);
    row("Corporate Owner", data.corporateOwner);
    row("Mailing Address", data.mailingAddress);
    y += 4;
  }

  // ── 6. SALES HISTORY ──
  if (data.salesHistory && data.salesHistory.length > 0) {
    sectionTitle("SALES HISTORY");
    checkNewPage(10 + data.salesHistory.length * 8);

    // Table header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textMuted);
    doc.text("Date", margin, y);
    doc.text("Amount", margin + 30, y);
    doc.text("Buyer", margin + 62, y);
    doc.text("Seller", margin + 110, y);
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textDark);
    data.salesHistory.slice(0, 10).forEach((sale) => {
      checkNewPage(8);
      doc.setFontSize(8);
      doc.text(sale.date || "—", margin, y);
      doc.text(sale.amount != null ? $(sale.amount) : "—", margin + 30, y);
      doc.text((sale.buyer || "—").substring(0, 28), margin + 62, y);
      doc.text((sale.seller || "—").substring(0, 28), margin + 110, y);
      y += 6;
    });
    y += 4;
  }

  // ── 7. HAZARD & ENVIRONMENTAL ──
  if (data.hazards && data.hazards.length > 0) {
    sectionTitle("HAZARD & ENVIRONMENTAL ZONES");
    data.hazards.forEach((h) => {
      checkNewPage(10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // red
      doc.text(h.label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textDark);
      doc.text(h.value, margin + 56, y);
      y += 6;
    });

    // FEMA flood zone (from federal data)
    if (data.federalData?.floodZone) {
      row("FEMA Flood Zone", data.federalData.floodZone);
    }
    if (data.federalData?.floodRisk) {
      row("Flood Risk", data.federalData.floodRisk);
    }
    y += 4;
  } else if (data.federalData?.floodZone || data.federalData?.floodRisk) {
    sectionTitle("FLOOD RISK");
    row("FEMA Flood Zone", data.federalData.floodZone);
    row("Flood Risk", data.federalData.floodRisk);
    y += 4;
  }

  // ── 8. NEIGHBORHOOD & ECONOMIC CONTEXT ──
  if (data.federalData) {
    const fd = data.federalData;
    const hasDemo = fd.medianIncome != null || fd.populationDensity != null || fd.medianAge != null;
    const hasEcon = fd.unemploymentRate != null || fd.mortgageRate30yr != null;

    if (hasDemo || hasEcon) {
      sectionTitle("NEIGHBORHOOD & ECONOMIC CONTEXT");
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

  // ── FOOTER on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter();
  }

  return doc.output("blob");
}
