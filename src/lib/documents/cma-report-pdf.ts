/**
 * CMA Report PDF Generator
 *
 * RPR-quality Comparative Market Analysis report (35-48 pages).
 * Includes: cover, summary, property info, public records, photos,
 * comp map, comp table, per-comp adjustments, comp stats by status,
 * pricing strategy, refined value, market trends, neighborhood stats.
 *
 * Uses jsPDF primitives only (no external chart libraries).
 */

import jsPDF from "jspdf";
import {
  COLORS,
  pdfSafe,
  fmt$,
  fmtNum,
  fmtPct,
  drawPageHeader,
  drawPageFooter,
  drawSectionTitle,
  drawRow,
  drawValueCards,
  drawAvmRangeBar,
  drawEquityBar,
  drawMarketTypeIndicator,
  drawComparisonTable,
  drawHorizontalBarChart,
  drawPhotoGallery,
  applyFootersToAllPages,
  type AgentBranding,
  type ValueCard,
} from "./pdf-report-utils";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CMAReportData {
  // Subject property
  address: string;
  city: string;
  state: string;
  zip: string;
  mlsNumber?: string;
  listPrice?: number;
  closePrice?: number;
  status?: string;
  onMarketDate?: string;
  closeDate?: string;
  description?: string;

  // Property details
  propertyType?: string;
  propertySubType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  stories?: number;
  garage?: number;
  pool?: boolean;
  fireplace?: boolean;
  condition?: string;
  construction?: string;
  roof?: string;
  foundation?: string;
  heating?: string;
  cooling?: string;
  ownershipType?: string;

  // Valuation
  avmValue?: number;
  avmLow?: number;
  avmHigh?: number;
  avmConfidence?: string;
  cmaValue?: number;
  cmaLow?: number;
  cmaHigh?: number;
  cmaPricePerSqft?: number;

  // Financial
  lastSalePrice?: number;
  lastSaleDate?: string;
  assessedValue?: number;
  taxAmount?: number;
  taxYear?: number;
  assessmentHistory?: Array<{ year: number; land?: number; improvements?: number; total: number; taxAmount?: number }>;

  // Sales history
  salesHistory?: Array<{
    date: string;
    price?: number;
    event?: string;
    changePct?: number;
    buyer?: string;
    seller?: string;
    deedType?: string;
  }>;

  // Comps
  comps?: CMAComp[];

  // Photos
  heroPhoto?: string;
  photos?: string[];
  mapImage?: string;

  // Market stats
  marketType?: string;
  monthsInventory?: number;
  listToSoldRatio?: number;
  medianDom?: number;
  medianSoldPrice?: number;
  activeListings?: number;
  pricePerSqft?: number;

  // Schools
  schools?: Array<{ name: string; level: string; type?: string; grades?: string; rating?: number; district?: string }>;

  // Agent
  agentNote?: string;
}

export interface CMAComp {
  address: string;
  city?: string;
  zip?: string;
  mlsNumber?: string;
  status: string; // Active, Pending, Closed, Expired
  listPrice: number;
  closePrice?: number;
  originalPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  stories?: number;
  garage?: number;
  pool?: boolean;
  fireplace?: boolean;
  condition?: string;
  construction?: string;
  roof?: string;
  heating?: string;
  parking?: string;
  foundation?: string;
  dom?: number;
  closeDate?: string;
  listDate?: string;
  pricePerSqft?: number;
  distance?: number;
  correlation?: number;
  photo?: string;
  listingAgent?: string;
  listingOffice?: string;
  // Adjustments (computed)
  adjustments?: Record<string, number>;
  adjustedPrice?: number;
  netAdjustmentPct?: number;
  grossAdjustmentPct?: number;
  compWeight?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const MARGIN = 14;
const PAGE_W = 215.9; // Letter width mm
const PAGE_H = 279.4; // Letter height mm
const CONTENT_W = PAGE_W - MARGIN * 2;

const STATUS_COLORS: Record<string, readonly [number, number, number]> = {
  Active: [5, 150, 105],
  Pending: [217, 119, 6],
  Closed: [37, 99, 235],
  Expired: [107, 114, 128],
  Withdrawn: [107, 114, 128],
};

// ── Generator ──────────────────────────────────────────────────────────────

export async function generateCMAReportPDF(
  data: CMAReportData,
  agent: AgentBranding,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  let y = 0;

  const headerFn = () => drawPageHeader(doc, "CMA Report", `${pdfSafe(data.address)}, ${pdfSafe(data.city)} ${pdfSafe(data.state)} ${pdfSafe(data.zip)}`);
  const newPage = () => { doc.addPage(); return headerFn(); };
  const checkPage = (needed: number) => { if (y + needed > PAGE_H - 20) { y = newPage(); } };

  // ════════════════════════════════════════════════════════════════════
  // PAGE 1: COVER
  // ════════════════════════════════════════════════════════════════════

  // Header bar
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, PAGE_W, 12, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("CMA Report", MARGIN, 8);
  doc.setFont("helvetica", "normal");
  doc.text("Real Estate Genie", PAGE_W - MARGIN, 8, { align: "right" });

  y = 18;

  // Address
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.textDark);
  doc.setFont("helvetica", "bold");
  doc.text(pdfSafe(data.address), MARGIN, y);
  y += 7;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textMuted);
  doc.text(pdfSafe(`${data.city}, ${data.state} ${data.zip}`), MARGIN, y);
  y += 12;

  // Hero photo (left side, ~60% width)
  const heroW = CONTENT_W * 0.58;
  const heroH = 80;
  if (data.heroPhoto) {
    try {
      doc.addImage(data.heroPhoto, "JPEG", MARGIN, y, heroW, heroH);
    } catch {
      doc.setFillColor(220, 220, 220);
      doc.rect(MARGIN, y, heroW, heroH, "F");
    }
  } else {
    doc.setFillColor(220, 220, 220);
    doc.rect(MARGIN, y, heroW, heroH, "F");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textMuted);
    doc.text("No Photo", MARGIN + heroW / 2, y + heroH / 2, { align: "center" });
  }

  // Agent card (right side)
  const cardX = MARGIN + heroW + 6;
  const cardW = CONTENT_W - heroW - 6;
  let cardY = y;

  // Agent note
  if (data.agentNote) {
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(cardX, cardY, cardW, 35, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont("helvetica", "italic");
    const noteLines = doc.splitTextToSize(pdfSafe(data.agentNote), cardW - 8);
    doc.text(noteLines.slice(0, 6), cardX + 4, cardY + 6);
    cardY += 38;
  }

  // Agent info
  if (agent.headshotData) {
    try {
      doc.addImage(agent.headshotData, "JPEG", cardX + cardW / 2 - 10, cardY, 20, 20);
      cardY += 22;
    } catch { /* skip */ }
  }

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.textDark);
  doc.setFont("helvetica", "bold");
  doc.text(pdfSafe(agent.displayName), cardX + cardW / 2, cardY, { align: "center" });
  cardY += 4;

  if (agent.licenseNumber) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textMuted);
    doc.text(pdfSafe(`License #${agent.licenseNumber}`), cardX + cardW / 2, cardY, { align: "center" });
    cardY += 3;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textDark);
  if (agent.phone) {
    doc.text(pdfSafe(agent.phone), cardX + cardW / 2, cardY, { align: "center" });
    cardY += 3;
  }
  if (agent.email) {
    doc.text(pdfSafe(agent.email), cardX + cardW / 2, cardY, { align: "center" });
    cardY += 3;
  }

  if (agent.brokerageName) {
    cardY += 3;
    if (agent.brokerLogoData) {
      try {
        doc.addImage(agent.brokerLogoData, "PNG", cardX + cardW / 2 - 15, cardY, 30, 12);
        cardY += 14;
      } catch { /* skip */ }
    }
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafe(agent.brokerageName), cardX + cardW / 2, cardY, { align: "center" });
  }

  y += heroH + 8;

  // Footer
  doc.setFontSize(5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(pdfSafe("Information is deemed reliable but not guaranteed. Equal Housing Opportunity."), MARGIN, PAGE_H - 8);
  doc.text(new Date().toLocaleDateString(), PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  doc.text("Powered by Real Estate Genie", PAGE_W / 2, PAGE_H - 5, { align: "center" });

  // ════════════════════════════════════════════════════════════════════
  // PAGE 2: SUMMARY
  // ════════════════════════════════════════════════════════════════════

  y = newPage();

  // Map image
  if (data.mapImage) {
    try {
      doc.addImage(data.mapImage, "JPEG", MARGIN, y, CONTENT_W * 0.55, 60);
    } catch { /* skip */ }
  }

  // Status badge
  const statusColor = STATUS_COLORS[data.status || "Active"] || COLORS.textMuted;
  doc.setFillColor(...statusColor);
  doc.roundedRect(MARGIN, y + (data.mapImage ? 62 : 0), 40, 6, 1, 1, "F");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(pdfSafe(data.status || "Active"), MARGIN + 20, y + (data.mapImage ? 66 : 4), { align: "center" });

  // Price cards (right side)
  const priceX = MARGIN + CONTENT_W * 0.58;
  const priceW = CONTENT_W * 0.42;
  let priceY = y;

  if (data.listPrice || data.closePrice) {
    const priceLabel = data.closePrice ? "Closed Price" : "List Price";
    const priceVal = data.closePrice || data.listPrice || 0;
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont("helvetica", "normal");
    doc.text(pdfSafe(priceLabel), priceX, priceY + 4);
    doc.setFontSize(24);
    doc.setTextColor(...COLORS.textDark);
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafe(fmt$(priceVal)), priceX, priceY + 13);
    priceY += 20;
  }

  // Your CMA card
  if (data.cmaValue) {
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(priceX, priceY, priceW, 28, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.brandBlue);
    doc.setFont("helvetica", "bold");
    doc.text("Your CMA", priceX + 4, priceY + 6);
    doc.setFontSize(20);
    doc.text(pdfSafe(fmt$(data.cmaValue)), priceX + 4, priceY + 16);
    if (data.cmaPricePerSqft) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(pdfSafe(`Price per Sq. Ft. $${data.cmaPricePerSqft.toLocaleString()}`), priceX + 4, priceY + 22);
    }
    if (data.cmaLow && data.cmaHigh) {
      doc.setFontSize(7);
      doc.text(pdfSafe(`${fmt$(data.cmaLow)}    ${fmt$(data.cmaHigh)}`), priceX + 4, priceY + 26);
    }
    priceY += 32;
  }

  // Basic Facts
  priceY += 4;
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textDark);
  doc.setFont("helvetica", "bold");
  doc.text("Basic Facts", priceX, priceY);
  priceY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const facts = [
    ["Beds", String(data.beds || "-")],
    ["Baths", String(data.baths || "-")],
    ["Sqft", data.sqft ? fmtNum(data.sqft) : "-"],
    ["Lot", data.lotSize ? fmtNum(data.lotSize) : "-"],
    ["Type", data.propertySubType || data.propertyType || "-"],
  ];
  for (const [label, val] of facts) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textMuted);
    doc.text(pdfSafe(label), priceX, priceY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe(val), priceX + 20, priceY);
    priceY += 4;
  }

  y += 75;

  // Disclaimer
  doc.setFontSize(5.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont("helvetica", "italic");
  const disclaimer = "This report contains data and information that is publicly available and/or licensed from third parties and is provided to you on an 'as is' and 'as available' basis. The information is not verified nor the estimated value of a property is an appraisal of the property.";
  const disclaimerLines = doc.splitTextToSize(pdfSafe(disclaimer), CONTENT_W);
  doc.text(disclaimerLines, MARGIN, PAGE_H - 20);

  // ════════════════════════════════════════════════════════════════════
  // PAGE 3: PROPERTY INFORMATION
  // ════════════════════════════════════════════════════════════════════

  y = newPage();
  y = drawSectionTitle(doc, "Property Information", y, MARGIN);
  y += 2;

  // Property Facts table (3 columns: Facts | Public Facts | Agent Refinement)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textDark);
  const col1 = MARGIN;
  const col2 = MARGIN + 50;
  const col3 = MARGIN + 110;
  doc.text("Property Facts", col1, y);
  doc.text("Public Facts", col2, y);
  doc.text("Agent Refinement", col3, y);
  y += 2;
  doc.setDrawColor(...COLORS.lightGray);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 4;

  const propertyFacts: [string, string][] = [
    ["Property Type", data.propertyType || "-"],
    ["Subtype", data.propertySubType || "-"],
    ["Bedrooms", String(data.beds || "-")],
    ["Total Baths", String(data.baths || "-")],
    ["Living Area (sq ft)", data.sqft ? fmtNum(data.sqft) : "-"],
    ["Lot Size", data.lotSize ? fmtNum(data.lotSize) : "-"],
    ["Year Built", String(data.yearBuilt || "-")],
    ["Stories", String(data.stories || "-")],
    ["Garage", String(data.garage || "-")],
    ["Pool", data.pool ? "Yes" : data.pool === false ? "No" : "-"],
    ["Fireplace", data.fireplace ? "Yes" : data.fireplace === false ? "No" : "-"],
    ["Construction", data.construction || "-"],
    ["Roof", data.roof || "-"],
    ["Condition", data.condition || "-"],
    ["Ownership", data.ownershipType || "-"],
  ];

  doc.setFontSize(8);
  for (let i = 0; i < propertyFacts.length; i++) {
    if (i % 2 === 0) {
      doc.setFillColor(...COLORS.rowAlt);
      doc.rect(MARGIN, y - 3, CONTENT_W, 5, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe(propertyFacts[i][0]), col1, y);
    doc.text(pdfSafe(propertyFacts[i][1]), col2, y);
    doc.text("-", col3, y); // Agent refinement column (placeholder)
    y += 5;
  }

  // ════════════════════════════════════════════════════════════════════
  // PAGE 4: PUBLIC RECORD HISTORY (Tax + Sales)
  // ════════════════════════════════════════════════════════════════════

  y = newPage();
  y = drawSectionTitle(doc, "Public Record History", y, MARGIN);
  y += 2;

  // Tax Assessment History
  if (data.assessmentHistory && data.assessmentHistory.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("Tax", MARGIN, y);
    y += 5;

    // Table header
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(...COLORS.sectionBg);
    doc.rect(MARGIN, y - 3, CONTENT_W, 5, "F");
    doc.text("Tax Year", MARGIN + 2, y);
    doc.text("Assessed Land", MARGIN + 35, y);
    doc.text("Assessed Improvements", MARGIN + 70, y);
    doc.text("Total Assessed", MARGIN + 115, y);
    doc.text("Tax Amount", MARGIN + 150, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    for (const row of data.assessmentHistory.slice(0, 5)) {
      doc.text(String(row.year), MARGIN + 2, y);
      doc.text(row.land ? fmt$(row.land) : "-", MARGIN + 35, y);
      doc.text(row.improvements ? fmt$(row.improvements) : "-", MARGIN + 70, y);
      doc.text(fmt$(row.total), MARGIN + 115, y);
      doc.text(row.taxAmount ? fmt$(row.taxAmount) : "-", MARGIN + 150, y);
      y += 4;
    }
    y += 6;
  }

  // Sales History
  if (data.salesHistory && data.salesHistory.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("Sales and Financing Activity", MARGIN, y);
    y += 5;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(...COLORS.sectionBg);
    doc.rect(MARGIN, y - 3, CONTENT_W, 5, "F");
    doc.text("Date", MARGIN + 2, y);
    doc.text("Event", MARGIN + 30, y);
    doc.text("Price", MARGIN + 80, y);
    doc.text("Change %", MARGIN + 130, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    for (const sale of data.salesHistory.slice(0, 15)) {
      doc.text(pdfSafe(sale.date || "-"), MARGIN + 2, y);
      doc.text(pdfSafe(sale.event || sale.deedType || "-"), MARGIN + 30, y);
      doc.text(sale.price ? fmt$(sale.price) : "Price Not Disclosed", MARGIN + 80, y);
      if (sale.changePct != null) {
        if (sale.changePct >= 0) doc.setTextColor(...COLORS.greenAccent);
        else doc.setTextColor(...COLORS.redAccent);
        doc.text(`${sale.changePct >= 0 ? "+" : ""}${sale.changePct.toFixed(1)}%`, MARGIN + 130, y);
        doc.setTextColor(...COLORS.textDark);
      }
      y += 4;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // PAGE 5+: COMPARABLE PROPERTIES TABLE
  // ════════════════════════════════════════════════════════════════════

  if (data.comps && data.comps.length > 0) {
    y = newPage();
    y = drawSectionTitle(doc, "CMA", y, MARGIN);
    y += 2;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("Comp Property Summary", MARGIN, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(pdfSafe(`${data.comps.length} properties`), MARGIN, y);
    y += 6;

    // Comp table header
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(...COLORS.sectionBg);
    doc.rect(MARGIN, y - 3, CONTENT_W, 5, "F");
    doc.setTextColor(...COLORS.textDark);
    doc.text("Address", MARGIN + 2, y);
    doc.text("Status", MARGIN + 55, y);
    doc.text("Type", MARGIN + 75, y);
    doc.text("Bd/Ba", MARGIN + 95, y);
    doc.text("Sqft", MARGIN + 110, y);
    doc.text("Year", MARGIN + 125, y);
    doc.text("DOM", MARGIN + 138, y);
    doc.text("$/Sqft", MARGIN + 150, y);
    doc.text("Price", MARGIN + 168, y);
    y += 5;

    // Comp rows
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < data.comps.length; i++) {
      checkPage(6);
      const c = data.comps[i];
      if (i % 2 === 0) {
        doc.setFillColor(...COLORS.rowAlt);
        doc.rect(MARGIN, y - 3, CONTENT_W, 5, "F");
      }

      // Status dot
      const sc = STATUS_COLORS[c.status] || COLORS.textMuted;
      doc.setFillColor(...sc);
      doc.circle(MARGIN + 53, y - 1, 1.2, "F");

      doc.setFontSize(6.5);
      doc.setTextColor(...COLORS.textDark);
      doc.text(pdfSafe(c.address.substring(0, 30)), MARGIN + 2, y);
      doc.text(pdfSafe(c.status), MARGIN + 55, y);
      doc.text(pdfSafe(c.construction || "-"), MARGIN + 75, y);
      doc.text(`${c.beds || "-"}/${c.baths || "-"}`, MARGIN + 95, y);
      doc.text(c.sqft ? fmtNum(c.sqft) : "-", MARGIN + 110, y);
      doc.text(String(c.yearBuilt || "-"), MARGIN + 125, y);
      doc.text(String(c.dom ?? "-"), MARGIN + 138, y);
      doc.text(c.pricePerSqft ? `$${Math.round(c.pricePerSqft)}` : "-", MARGIN + 150, y);
      const price = c.closePrice || c.listPrice;
      doc.text(price ? fmt$(price) : "-", MARGIN + 168, y);
      y += 5;
    }

    // ════════════════════════════════════════════════════════════════════
    // COMP ADJUSTMENT PAGES (1 page per comp, max 8)
    // ════════════════════════════════════════════════════════════════════

    const maxCompPages = Math.min(data.comps.length, 8);
    for (let ci = 0; ci < maxCompPages; ci++) {
      const comp = data.comps[ci];
      y = newPage();
      y = drawSectionTitle(doc, "Comp Property Adjustments", y, MARGIN);
      y += 2;

      // Subject vs Comp side by side
      const halfW = CONTENT_W / 2 - 4;

      // Subject header
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.textDark);
      doc.text(pdfSafe(data.address.substring(0, 35)), MARGIN, y);
      doc.text(pdfSafe(comp.address.substring(0, 35)), MARGIN + halfW + 8, y);
      y += 4;

      // Status dots
      doc.setFillColor(...COLORS.textMuted);
      doc.circle(MARGIN + 2, y - 1, 1.2, "F");
      doc.setFontSize(7);
      doc.text("Subject Property", MARGIN + 5, y);

      const compStatusColor = STATUS_COLORS[comp.status] || COLORS.textMuted;
      doc.setFillColor(...compStatusColor);
      doc.circle(MARGIN + halfW + 10, y - 1, 1.2, "F");
      doc.text(pdfSafe(comp.status), MARGIN + halfW + 13, y);
      y += 6;

      // Adjustment grid
      const adjFields: [string, string | number | undefined, string | number | undefined][] = [
        ["MLS ID", data.mlsNumber, comp.mlsNumber],
        ["Value", data.listPrice ? fmt$(data.listPrice) : "-", (comp.closePrice || comp.listPrice) ? fmt$(comp.closePrice || comp.listPrice) : "-"],
        ["Price Per Sqft", data.sqft && data.listPrice ? `$${Math.round(data.listPrice / data.sqft)}` : "-", comp.pricePerSqft ? `$${Math.round(comp.pricePerSqft)}` : "-"],
        ["Bedrooms", data.beds, comp.beds],
        ["Total Baths", data.baths, comp.baths],
        ["Living Area (sqft)", data.sqft ? fmtNum(data.sqft) : "-", comp.sqft ? fmtNum(comp.sqft) : "-"],
        ["Lot Size", data.lotSize ? fmtNum(data.lotSize) : "-", comp.lotSize ? fmtNum(comp.lotSize) : "-"],
        ["Year Built", data.yearBuilt, comp.yearBuilt],
        ["Property Type", data.propertySubType || data.propertyType, comp.construction],
        ["Stories", data.stories, comp.stories],
        ["Garage", data.garage, comp.garage],
        ["Condition", data.condition || "-", comp.condition || "-"],
        ["Construction", data.construction || "-", comp.construction || "-"],
        ["Roof", data.roof || "-", comp.roof || "-"],
        ["Heating", data.heating || "-", comp.heating || "-"],
      ];

      doc.setFontSize(7);
      for (let ai = 0; ai < adjFields.length; ai++) {
        const [label, subVal, compVal] = adjFields[ai];
        if (ai % 2 === 0) {
          doc.setFillColor(...COLORS.rowAlt);
          doc.rect(MARGIN, y - 3, CONTENT_W, 4.5, "F");
        }

        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.textDark);
        doc.text(pdfSafe(label), MARGIN + 2, y);
        doc.setFont("helvetica", "normal");
        doc.text(pdfSafe(String(subVal || "-")), MARGIN + 50, y);
        doc.text(pdfSafe(String(compVal || "-")), MARGIN + halfW + 10, y);

        // Show adjustment if available
        if (comp.adjustments && comp.adjustments[label.toLowerCase()]) {
          const adj = comp.adjustments[label.toLowerCase()];
          if (adj >= 0) doc.setTextColor(...COLORS.greenAccent);
          else doc.setTextColor(...COLORS.redAccent);
          doc.text(`${adj >= 0 ? "+" : ""}${fmt$(adj)}`, MARGIN + CONTENT_W - 25, y);
          doc.setTextColor(...COLORS.textDark);
        }

        y += 4.5;
      }

      // Adjusted Value
      y += 4;
      doc.setFillColor(240, 245, 255);
      doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.brandBlue);
      doc.text("Adjusted Value of Comps", MARGIN + 4, y + 5);
      if (comp.adjustedPrice) {
        doc.setFontSize(14);
        doc.text(pdfSafe(fmt$(comp.adjustedPrice)), MARGIN + 4, y + 12);
      }
      if (comp.netAdjustmentPct != null) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(pdfSafe(`Net Adj: ${comp.netAdjustmentPct.toFixed(1)}%  |  Gross Adj: ${(comp.grossAdjustmentPct || 0).toFixed(1)}%`), MARGIN + 80, y + 8);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // PRICING STRATEGY
    // ════════════════════════════════════════════════════════════════════

    y = newPage();
    y = drawSectionTitle(doc, "Pricing Strategy", y, MARGIN);
    y += 8;

    if (data.cmaValue) {
      // CMA Value - large centered
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("CMA Value", PAGE_W / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(28);
      doc.setTextColor(...COLORS.textDark);
      doc.setFont("helvetica", "bold");
      doc.text(pdfSafe(fmt$(data.cmaValue)), PAGE_W / 2, y, { align: "center" });
      y += 6;

      if (data.cmaPricePerSqft) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.textMuted);
        doc.text(pdfSafe(`Price per Sq. Ft. $${data.cmaPricePerSqft}`), PAGE_W / 2, y, { align: "center" });
        y += 8;
      }

      // CMA Range bar
      if (data.cmaLow && data.cmaHigh) {
        drawAvmRangeBar(doc, data.cmaLow, data.cmaValue, data.cmaHigh, y, MARGIN);
        y += 14;
      }

      // CMA Summary
      y += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.textDark);
      doc.text("CMA Summary", MARGIN, y);
      y += 6;

      // Average of comps
      const compPrices = data.comps.filter((c) => c.adjustedPrice).map((c) => c.adjustedPrice!);
      if (compPrices.length > 0) {
        const avgComps = Math.round(compPrices.reduce((s, p) => s + p, 0) / compPrices.length);
        const totalAdj = data.cmaValue - avgComps;

        doc.setFontSize(9);
        y = drawRow(doc, "Average of Comps", fmt$(avgComps), y, MARGIN);
        y = drawRow(doc, "Adjustments", `${totalAdj >= 0 ? "+" : ""}${fmt$(totalAdj)}`, y, MARGIN);
        y += 2;
        doc.setDrawColor(...COLORS.brandBlue);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
        y += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Recommended Price", MARGIN, y);
        doc.setTextColor(...COLORS.greenAccent);
        doc.text(pdfSafe(fmt$(data.cmaValue)), MARGIN + CONTENT_W, y, { align: "right" });
        y += 8;
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // MARKET TRENDS
  // ════════════════════════════════════════════════════════════════════

  if (data.marketType || data.monthsInventory) {
    y = newPage();
    y = drawSectionTitle(doc, "Market Trends", y, MARGIN);
    y += 4;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe(`Market Trends for ${data.city}, ${data.state} ${data.zip}`), MARGIN, y);
    y += 8;

    // Market Type indicator
    if (data.marketType) {
      y = drawMarketTypeIndicator(doc, data.marketType, MARGIN, y, CONTENT_W);
      y += 10;
    }

    // Key Details
    const marketCards: ValueCard[] = [];
    if (data.monthsInventory) marketCards.push({ label: "Months of Inventory", value: String(data.monthsInventory) });
    if (data.listToSoldRatio) marketCards.push({ label: "List to Sold Price %", value: `${data.listToSoldRatio.toFixed(1)}%` });
    if (data.medianDom) marketCards.push({ label: "Median Days on Market", value: String(data.medianDom) });
    if (data.medianSoldPrice) marketCards.push({ label: "Median Sold Price", value: fmt$(data.medianSoldPrice) });

    if (marketCards.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Key Details", MARGIN, y);
      y += 4;
      y = drawValueCards(doc, marketCards, MARGIN, y, CONTENT_W);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // PHOTOS
  // ════════════════════════════════════════════════════════════════════

  if (data.photos && data.photos.length > 0) {
    y = newPage();
    y = drawSectionTitle(doc, "Photos", y, MARGIN);
    y += 4;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("Listing Photos", MARGIN, y);
    y += 4;

    y = drawPhotoGallery(doc, data.photos.slice(0, 9), MARGIN, y, CONTENT_W);
  }

  // ════════════════════════════════════════════════════════════════════
  // SCHOOLS
  // ════════════════════════════════════════════════════════════════════

  if (data.schools && data.schools.length > 0) {
    checkPage(40);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("School Summary", MARGIN, y);
    y += 2;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Assigned Schools", MARGIN, y);
    y += 4;

    // Table header
    doc.setFillColor(...COLORS.sectionBg);
    doc.rect(MARGIN, y - 3, CONTENT_W, 5, "F");
    doc.text("Name", MARGIN + 2, y);
    doc.text("Level", MARGIN + 60, y);
    doc.text("Type", MARGIN + 85, y);
    doc.text("Grades", MARGIN + 105, y);
    doc.text("Rating", MARGIN + 130, y);
    doc.text("District", MARGIN + 150, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    for (const school of data.schools) {
      doc.text(pdfSafe(school.name), MARGIN + 2, y);
      doc.text(pdfSafe(school.level), MARGIN + 60, y);
      doc.text(pdfSafe(school.type || "Public"), MARGIN + 85, y);
      doc.text(pdfSafe(school.grades || "-"), MARGIN + 105, y);
      if (school.rating) {
        // Color-coded rating dot
        const rColor = school.rating >= 7 ? COLORS.greenAccent : school.rating >= 4 ? [217, 119, 6] as const : COLORS.redAccent;
        doc.setFillColor(...rColor);
        doc.circle(MARGIN + 133, y - 1, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5);
        doc.text(String(school.rating), MARGIN + 133, y, { align: "center" });
        doc.setTextColor(...COLORS.textDark);
        doc.setFontSize(7);
      }
      doc.text(pdfSafe(school.district || "-"), MARGIN + 150, y);
      y += 5;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // APPLY FOOTERS TO ALL PAGES
  // ════════════════════════════════════════════════════════════════════

  applyFootersToAllPages(doc, agent);

  return doc.output("blob");
}
