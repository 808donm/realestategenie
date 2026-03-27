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
  ownershipType?: string; // Leasehold / Fee Simple
  // Comps (pre-fetched)
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
  // Sales history (recent transactions)
  salesHistory?: Array<{
    date?: string;
    recordingDate?: string;
    amount?: number;
    buyer?: string;
    seller?: string;
    docType?: string;
  }>;
  // Photos (up to 6 MLS photos for shared reports)
  photos?: string[];
  // Mortgage calculator fields
  listPrice?: number;
  taxAnnualAmount?: number;
  associationFee?: number;
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
export function generatePropertyIntelligencePDF(data: PropertyReportData, branding: AgentBranding): Blob {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Colors ──
  const brandBlue = [30, 64, 175] as const; // #1e40af
  const brandGold = [180, 130, 40] as const; // #b48228
  const textDark = [17, 24, 39] as const;
  const textMuted = [107, 114, 128] as const;
  const sectionBg = [243, 244, 246] as const; // #f3f4f6

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
      margin,
      284,
      { maxWidth: contentW },
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

  // Broker logo (top-left corner of header, square ~26x26mm / ~100px)
  const logoSize = 26;
  const logoY = (42 - logoSize) / 2; // vertically center in 42mm header
  let titleX = margin;
  if (branding.brokerLogoData) {
    try {
      doc.addImage(branding.brokerLogoData, "PNG", margin, logoY, logoSize, logoSize);
      titleX = margin + logoSize + 4;
    } catch {
      // Skip if image fails to decode
    }
  }

  // Vertically center text block alongside the logo
  const textTopY = logoY + 6;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Property Intelligence Report", titleX, textTopY);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.address, titleX, textTopY + 10);

  const cityLine = [data.city, data.state, data.zip].filter(Boolean).join(", ");
  if (cityLine) {
    doc.setFontSize(10);
    doc.text(cityLine, titleX, textTopY + 17);
  }

  // Report date top-right
  doc.setFontSize(8);
  doc.text(data.generatedAt, pageW - margin, textTopY + 17, { align: "right" });

  y = 50;

  // ── Agent branding bar ──
  doc.setFillColor(248, 250, 252); // very light gray bg
  doc.rect(0, y - 6, pageW, 22, "F");
  doc.setDrawColor(226, 232, 240);
  doc.line(0, y + 16, pageW, y + 16);

  let agentTextX = margin;

  // Agent headshot
  if (branding.headshotData) {
    try {
      const photoSize = 14; // mm
      const photoX = margin;
      const photoY = y - 3;
      // Draw a light border around the photo
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.roundedRect(photoX - 0.5, photoY - 0.5, photoSize + 1, photoSize + 1, 1, 1, "S");
      doc.addImage(branding.headshotData, "JPEG", photoX, photoY, photoSize, photoSize);
      agentTextX = margin + photoSize + 4;
    } catch {
      // Skip if image fails
    }
  }

  // Agent name
  doc.setTextColor(...textDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(branding.displayName, agentTextX, y + 1);

  // License number & phone on second line
  const agentDetails: string[] = [];
  if (branding.licenseNumber) agentDetails.push(`Lic# ${branding.licenseNumber}`);
  if (branding.phone) agentDetails.push(branding.phone);
  if (branding.brokerageName) agentDetails.push(branding.brokerageName);
  if (agentDetails.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(agentDetails.join("  |  "), agentTextX, y + 7);
  }

  y += 22;

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
    const available = cards.filter((c) => c.value && c.value !== "—");
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
    {
      label: "EST. EQUITY",
      value: data.estimatedEquity != null ? `${data.estimatedEquity >= 0 ? "+" : ""}${$(data.estimatedEquity)}` : "—",
    },
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

  // ── 2b. BUILDING DETAILS ──
  if (
    data.constructionType ||
    data.roofType ||
    data.heatingType ||
    data.coolingType ||
    data.fireplaceCount ||
    data.basementType ||
    data.architectureStyle
  ) {
    sectionTitle("BUILDING DETAILS");
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

  // ── 2c. MLS LISTING INFO ──
  if (data.mlsNumber || data.listingAgentName || data.listingStatus) {
    sectionTitle("MLS LISTING");
    row("MLS #", data.mlsNumber);
    row("Status", data.listingStatus);
    if (data.daysOnMarket != null) row("Days on Market", String(data.daysOnMarket));
    row("Listing Agent", data.listingAgentName);
    row("Office", data.listingOfficeName);
    if (data.listingDescription) {
      checkNewPage(20);
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      doc.text("Description:", margin, y);
      y += 5;
      doc.setTextColor(...textDark);
      const descLines = doc.splitTextToSize(data.listingDescription.substring(0, 500), contentW);
      descLines.forEach((line: string) => {
        checkNewPage(6);
        doc.text(line, margin, y);
        y += 4;
      });
    }
    y += 4;
  }

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

  // ── 5. MORTGAGE PAYMENT ESTIMATE ──
  {
    const price = data.listPrice || data.avmValue;
    if (price && price > 0) {
      sectionTitle("MORTGAGE PAYMENT ESTIMATE");
      const downPct = 20;
      const rate = 6.75;
      const termYears = 30;
      const downPayment = price * (downPct / 100);
      const loanAmount = price - downPayment;
      const monthlyRate = rate / 100 / 12;
      const numPayments = termYears * 12;
      const monthlyPI =
        monthlyRate > 0
          ? (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
            (Math.pow(1 + monthlyRate, numPayments) - 1)
          : loanAmount / numPayments;
      const monthlyTax = (data.taxAmount || data.taxAnnualAmount || 0) / 12;
      const monthlyHOA = (data.associationFee || 0) / 12;
      const monthlyTotal = monthlyPI + monthlyTax + monthlyHOA;

      // Summary card
      checkNewPage(20);
      doc.setFillColor(240, 253, 244); // green bg
      doc.roundedRect(margin - 2, y - 4, contentW + 4, 16, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textMuted);
      doc.text("Estimated Monthly Payment", margin, y + 2);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61); // green
      doc.text(`$${Math.round(monthlyTotal).toLocaleString()}/mo`, margin + 60, y + 4);
      y += 18;

      doc.setTextColor(...textDark);
      row("Home Price", $(price));
      row("Down Payment (20%)", $(Math.round(downPayment)));
      row("Loan Amount", $(Math.round(loanAmount)));
      row("Interest Rate", `${rate}% (30-year fixed)`);
      row("Principal & Interest", `$${Math.round(monthlyPI).toLocaleString()}/mo`);
      if (monthlyTax > 0) row("Property Tax", `$${Math.round(monthlyTax).toLocaleString()}/mo`);
      if (monthlyHOA > 0) row("HOA", `$${Math.round(monthlyHOA).toLocaleString()}/mo`);
      row("Total Interest (30yr)", $(Math.round(monthlyPI * numPayments - loanAmount)));
      y += 4;
    }
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

  // ── 7b. OWNERSHIP ──
  if (data.owner1 || data.owner2 || data.mailingAddress) {
    sectionTitle("OWNERSHIP");
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

  // ── 7c. COMPARABLE SALES ──
  if (data.comps && data.comps.length > 0) {
    sectionTitle("COMPARABLE SALES");
    checkNewPage(10 + data.comps.length * 8);

    // Table header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textMuted);
    doc.text("Address", margin, y);
    doc.text("Price", margin + 65, y);
    doc.text("Bd/Ba", margin + 95, y);
    doc.text("Sqft", margin + 115, y);
    doc.text("Closed", margin + 135, y);
    doc.text("Match", margin + 160, y);
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textDark);
    data.comps.slice(0, 10).forEach((comp) => {
      checkNewPage(8);
      doc.setFontSize(7);
      doc.text((comp.address || "—").substring(0, 38), margin, y);
      doc.text(comp.price != null ? $(comp.price) : "—", margin + 65, y);
      doc.text(`${comp.beds || "?"}/${comp.baths || "?"}`, margin + 95, y);
      doc.text(comp.sqft != null ? num(comp.sqft) : "—", margin + 115, y);
      doc.text(comp.closeDate || "—", margin + 135, y);
      doc.text(
        comp.correlation != null
          ? `${Math.round(comp.correlation <= 1 ? comp.correlation * 100 : comp.correlation)}%`
          : "—",
        margin + 160,
        y,
      );
      y += 6;
    });
    y += 4;
  }

  // ── 7d. MARKET STATS ──
  if (data.marketStats) {
    const ms = data.marketStats;
    if (ms.medianPrice || ms.avgDOM || ms.totalListings) {
      sectionTitle("AREA MARKET STATISTICS");
      row("Median Sale Price", $(ms.medianPrice));
      row("Avg Days on Market", ms.avgDOM != null ? String(ms.avgDOM) : null);
      row("Active Listings", ms.totalListings != null ? String(ms.totalListings) : null);
      row("Price per Sqft", ms.pricePerSqft != null ? `$${ms.pricePerSqft.toLocaleString()}` : null);
      y += 4;
    }
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
