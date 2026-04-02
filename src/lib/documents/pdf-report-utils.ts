/**
 * Shared PDF Report Layout Utilities
 *
 * Common functions used by both Property Intelligence and Neighborhood Profile
 * report generators. Ensures visual consistency across all branded reports.
 *
 * All rendering uses jsPDF primitives only -- no external chart libraries.
 */

import type { jsPDF } from "jspdf";

// ── Color Constants ─────────────────────────────────────────────────────────

export const COLORS = {
  brandBlue: [30, 64, 175] as const,
  brandGold: [180, 130, 40] as const,
  textDark: [17, 24, 39] as const,
  textMuted: [107, 114, 128] as const,
  sectionBg: [243, 244, 246] as const,
  greenAccent: [21, 128, 61] as const,
  redAccent: [220, 38, 38] as const,
  lightBlueBg: [240, 245, 255] as const,
  white: [255, 255, 255] as const,
  lightGray: [229, 231, 235] as const,
  rowAlt: [249, 250, 251] as const,
  cardBg: [248, 250, 252] as const,
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface AgentBranding {
  displayName: string;
  email: string;
  phone: string | null;
  licenseNumber: string | null;
  photoUrl: string | null;
  brokerageName?: string;
  brokerLogoUrl?: string | null;
  headshotData?: string | null;
  brokerLogoData?: string | null;
}

export interface BarChartItem {
  label: string;
  value: number;
  displayValue?: string;
}

export interface BarChartOptions {
  x: number;
  y: number;
  width: number;
  labelWidth?: number;
  barHeight?: number;
  barGap?: number;
  maxValue?: number;
  barColor?: readonly [number, number, number];
  barAltColor?: readonly [number, number, number];
  labelColor?: readonly [number, number, number];
  valueColor?: readonly [number, number, number];
  fontSize?: number;
  showValues?: boolean;
}

export interface ComparisonTableRow {
  label: string;
  values: string[];
  highlight?: boolean;
  changeValues?: number[]; // positive = green, negative = red
}

export interface ValueCard {
  label: string;
  value: string;
  sub?: string;
  color?: readonly [number, number, number];
}

export interface CoverPageConfig {
  reportType: string; // "Property Report" or "Neighborhood Report"
  title: string; // address or neighborhood name
  subtitle?: string; // city, state zip
  date: string;
  branding: AgentBranding;
  mapImageData?: string | null;
  heroImageData?: string | null;
}

// ── Text Sanitization ───────────────────────────────────────────────────────

/** Sanitize text for jsPDF WinAnsiEncoding (strips unsupported Unicode) */
export function pdfSafe(str: string): string {
  if (!str) return "";
  return str.replace(/[^\x20-\x7E\xA0-\xFF]/g, (ch) => {
    if (ch === "\u2018" || ch === "\u2019") return "'";
    if (ch === "\u201C" || ch === "\u201D") return '"';
    if (ch === "\u2013" || ch === "\u2014") return "-";
    if (ch === "\u2022") return "-";
    if (ch === "\u00A0") return " ";
    if (ch === "\u2026") return "...";
    if (ch === "\u2265") return ">=";
    if (ch === "\u2264") return "<=";
    return "";
  });
}

// ── Formatting Helpers ──────────────────────────────────────────────────────

export const fmt$ = (n?: number | null) => (n != null ? `$${n.toLocaleString()}` : "-");
export const fmtNum = (n?: number | null) => (n != null ? n.toLocaleString() : "-");
export const fmtPct = (n?: number | null) => (n != null ? `${n.toFixed(1)}%` : "-");

// ── Page Header ─────────────────────────────────────────────────────────────

/**
 * Draw a consistent page header bar on the current page.
 * Returns the y position after the header.
 */
export function drawPageHeader(
  doc: jsPDF,
  reportType: string,
  subtitle?: string,
  logoData?: string | null,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;

  // Blue header bar
  doc.setFillColor(...COLORS.brandBlue);
  doc.rect(0, 0, pageW, 18, "F");
  // Gold accent
  doc.setFillColor(...COLORS.brandGold);
  doc.rect(0, 18, pageW, 1.5, "F");

  // Report type (left)
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(reportType, margin, 7);

  // Subtitle / address (left, below report type)
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafe(subtitle), margin, 13);
  }

  // "Real Estate Genie" branding (right)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Real Estate Genie", pageW - margin, 11, { align: "right" });
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text("TM", pageW - margin + 1, 8);

  return 24; // y position after header
}

// ── Page Footer ─────────────────────────────────────────────────────────────

/**
 * Draw a consistent footer on the current page.
 * Call this before addPage() or at the end of the document.
 */
export function drawPageFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  date: string,
  agentName?: string,
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  const footerY = 282;

  // Thin divider
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY, margin + contentW, footerY);

  doc.setFontSize(6);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont("helvetica", "normal");

  // Left: Real Estate Genie branding + date
  doc.setFont("helvetica", "bold");
  doc.text("Real Estate Genie", margin, footerY + 4);
  doc.setFont("helvetica", "normal");
  doc.text(date, margin + 30, footerY + 4);

  // Center: Disclaimer
  const disclaimer = "Information is not guaranteed. Equal Housing Opportunity.";
  doc.text(disclaimer, pageW / 2, footerY + 4, { align: "center" });

  // Right: Page number
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, footerY + 4, { align: "right" });
}

/**
 * Apply footers to all pages after document is complete.
 * Call this as the last step before outputting the PDF.
 */
export function applyFootersToAllPages(doc: jsPDF, date: string, agentName?: string): void {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(doc, i, totalPages, date, agentName);
  }
}

// ── Agent Branding Bar ──────────────────────────────────────────────────────

/**
 * Draw the agent branding bar (headshot, name, license, phone, brokerage).
 * Returns new y position.
 */
export function drawAgentBrandingBar(doc: jsPDF, branding: AgentBranding, y: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;

  // Light gray background
  doc.setFillColor(...COLORS.cardBg);
  doc.rect(0, y - 6, pageW, 22, "F");
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.2);
  doc.line(0, y + 16, pageW, y + 16);

  let textX = margin;

  // Headshot
  if (branding.headshotData) {
    try {
      const photoSize = 14;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin - 0.5, y - 3.5, photoSize + 1, photoSize + 1, 1, 1, "S");
      doc.addImage(branding.headshotData, "JPEG", margin, y - 3, photoSize, photoSize);
      textX = margin + photoSize + 4;
    } catch {
      // Skip if image fails
    }
  }

  // Name
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(pdfSafe(branding.displayName), textX, y + 1);

  // Details line
  const details: string[] = [];
  if (branding.licenseNumber) details.push(`Lic# ${branding.licenseNumber}`);
  if (branding.phone) details.push(branding.phone);
  if (branding.brokerageName) details.push(branding.brokerageName);
  if (details.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textMuted);
    doc.text(pdfSafe(details.join("  |  ")), textX, y + 7);
  }

  return y + 22;
}

// ── Cover Page ──────────────────────────────────────────────────────────────

/**
 * Draw a full cover page with optional hero image, map, and agent branding.
 * Returns the y position (will be on a new page if content follows).
 */
export function drawCoverPage(doc: jsPDF, config: CoverPageConfig): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;

  // Blue header bar (full width, taller for cover)
  doc.setFillColor(...COLORS.brandBlue);
  doc.rect(0, 0, pageW, 36, "F");
  doc.setFillColor(...COLORS.brandGold);
  doc.rect(0, 36, pageW, 2, "F");

  // Report type
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(config.reportType, margin, 12);

  // Title (address or neighborhood)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(pdfSafe(config.title), contentW - 40);
  doc.text(titleLines, margin, 22);

  // "Real Estate Genie" branding (right)
  doc.setFontSize(10);
  doc.text("Real Estate Genie", pageW - margin, 14, { align: "right" });
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text("TM", pageW - margin + 1, 10);

  let y = 44;

  // Hero image (if available)
  if (config.heroImageData) {
    const imgH = 80;
    try {
      doc.addImage(config.heroImageData, "JPEG", margin, y, contentW, imgH);
    } catch {
      doc.setFillColor(...COLORS.lightGray);
      doc.rect(margin, y, contentW, imgH, "F");
    }
    y += imgH + 4;
  }

  // Map image (if available)
  if (config.mapImageData) {
    const mapH = config.heroImageData ? 60 : 90;
    const mapW = config.heroImageData ? contentW * 0.55 : contentW;
    try {
      doc.addImage(config.mapImageData, "JPEG", margin, y, mapW, mapH);
    } catch {
      doc.setFillColor(...COLORS.lightGray);
      doc.rect(margin, y, mapW, mapH, "F");
    }

    // Agent info card (right of map if hero exists, below map if not)
    if (config.heroImageData) {
      const cardX = margin + mapW + 4;
      const cardW = contentW - mapW - 4;
      drawAgentInfoCard(doc, config.branding, cardX, y, cardW, mapH);
    }
    y += mapH + 6;
  }

  // If no map, draw agent info card full width
  if (!config.mapImageData) {
    y = drawAgentBrandingBar(doc, config.branding, y + 6);
    y += 4;
  }

  // Subtitle (city/state)
  if (config.subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe(config.subtitle), margin, y + 4);
    y += 10;
  }

  // Date
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`Generated: ${config.date}`, margin, y + 4);
}

/** Draw a compact agent info card within a bounding box */
function drawAgentInfoCard(
  doc: jsPDF,
  branding: AgentBranding,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // Card background
  doc.setFillColor(...COLORS.cardBg);
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  let cy = y + 6;
  const cx = x + 6;
  const maxW = w - 12;

  // Headshot
  if (branding.headshotData) {
    try {
      const headSize = 18;
      const headX = x + (w - headSize) / 2;
      doc.addImage(branding.headshotData, "JPEG", headX, cy, headSize, headSize);
      cy += headSize + 3;
    } catch {
      // skip
    }
  }

  // Name
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textDark);
  doc.text(pdfSafe(branding.displayName), x + w / 2, cy, { align: "center" });
  cy += 5;

  // License
  if (branding.licenseNumber) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textMuted);
    doc.text(pdfSafe(`License #${branding.licenseNumber}`), x + w / 2, cy, { align: "center" });
    cy += 4;
  }

  // Phone
  if (branding.phone) {
    doc.setFontSize(7);
    doc.text(pdfSafe(branding.phone), x + w / 2, cy, { align: "center" });
    cy += 4;
  }

  // Email
  doc.setFontSize(7);
  doc.text(pdfSafe(branding.email), x + w / 2, cy, { align: "center" });
  cy += 4;

  // Brokerage
  if (branding.brokerageName) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    const brokLines = doc.splitTextToSize(pdfSafe(branding.brokerageName), maxW);
    doc.text(brokLines, x + w / 2, cy, { align: "center" });
    cy += brokLines.length * 3.5;
  }

  // Broker logo
  if (branding.brokerLogoData && cy + 12 < y + h) {
    try {
      const logoMaxW = Math.min(maxW - 8, 30);
      const logoH = 10;
      doc.addImage(branding.brokerLogoData, "PNG", x + (w - logoMaxW) / 2, cy, logoMaxW, logoH);
    } catch {
      // skip
    }
  }
}

// ── Section Title ───────────────────────────────────────────────────────────

/**
 * Draw a section title with colored background.
 * Returns new y position.
 */
export function drawSectionTitle(doc: jsPDF, title: string, y: number, margin: number = 16): number {
  const contentW = doc.internal.pageSize.getWidth() - margin * 2;

  doc.setFillColor(...COLORS.sectionBg);
  doc.roundedRect(margin - 2, y - 4, contentW + 4, 10, 1, 1, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.brandBlue);
  doc.text(pdfSafe(title), margin, y + 2);
  return y + 12;
}

// ── Row Helper ──────────────────────────────────────────────────────────────

/**
 * Draw a label: value row. Returns new y position.
 */
export function drawRow(
  doc: jsPDF,
  label: string,
  value: string | undefined | null,
  y: number,
  margin: number = 16,
  opts?: { bold?: boolean; labelWidth?: number },
): number {
  if (!value || value === "-") return y;
  const labelW = opts?.labelWidth ?? 56;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textMuted);
  doc.text(pdfSafe(label), margin, y);
  doc.setTextColor(...COLORS.textDark);
  if (opts?.bold) doc.setFont("helvetica", "bold");
  doc.text(pdfSafe(value), margin + labelW, y);
  if (opts?.bold) doc.setFont("helvetica", "normal");
  return y + 6;
}

// ── Value Cards ─────────────────────────────────────────────────────────────

/**
 * Draw a row of summary value cards (e.g., AVM, Last Sale, Equity, LTV).
 * Returns new y position.
 */
export function drawValueCards(doc: jsPDF, cards: ValueCard[], y: number, margin: number = 16): number {
  const contentW = doc.internal.pageSize.getWidth() - margin * 2;
  const available = cards.filter((c) => c.value && c.value !== "-");
  if (available.length === 0) return y;

  const cardW = (contentW - (available.length - 1) * 4) / available.length;
  const cardH = 18;

  available.forEach((card, i) => {
    const cx = margin + i * (cardW + 4);
    const color = card.color || COLORS.brandBlue;

    doc.setFillColor(color[0], color[1], color[2], 0.08);
    doc.setDrawColor(color[0], color[1], color[2], 0.2);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, "FD");

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(pdfSafe(card.label.toUpperCase()), cx + 4, y + 5);

    // Value
    doc.setFontSize(13);
    doc.text(pdfSafe(card.value), cx + 4, y + 12);

    // Sub
    if (card.sub) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textMuted);
      doc.text(pdfSafe(card.sub), cx + 4, y + 16);
    }
  });

  return y + cardH + 4;
}

// ── Horizontal Bar Chart ────────────────────────────────────────────────────

/**
 * Draw a horizontal bar chart using jsPDF rectangles.
 * Returns new y position after the chart.
 */
export function drawHorizontalBarChart(doc: jsPDF, data: BarChartItem[], options: BarChartOptions): number {
  const {
    x,
    y,
    width,
    labelWidth = 50,
    barHeight = 6,
    barGap = 3,
    barColor = COLORS.brandBlue,
    barAltColor,
    labelColor = COLORS.textDark,
    valueColor = COLORS.textMuted,
    fontSize = 8,
    showValues = true,
  } = options;

  const maxVal = options.maxValue || Math.max(...data.map((d) => d.value), 1);
  const barAreaWidth = width - labelWidth - (showValues ? 30 : 0);
  let cy = y;

  data.forEach((item, i) => {
    // Label (left)
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text(pdfSafe(item.label), x, cy + barHeight * 0.7);

    // Bar
    const bw = Math.max((item.value / maxVal) * barAreaWidth, 0.5);
    const color = barAltColor && i % 2 === 1 ? barAltColor : barColor;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x + labelWidth, cy, bw, barHeight, "F");

    // Value (right of bar)
    if (showValues) {
      doc.setFontSize(fontSize - 1);
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
      const displayVal = item.displayValue ?? item.value.toLocaleString();
      doc.text(pdfSafe(displayVal), x + labelWidth + bw + 2, cy + barHeight * 0.7);
    }

    cy += barHeight + barGap;
  });

  return cy;
}

// ── Comparison Table ────────────────────────────────────────────────────────

/**
 * Draw a multi-column comparison table (e.g., ZIP | County | State | USA).
 * Returns new y position after the table.
 */
export function drawComparisonTable(
  doc: jsPDF,
  headers: string[],
  rows: ComparisonTableRow[],
  x: number,
  y: number,
  width: number,
): number {
  const colCount = headers.length;
  const labelColW = width * 0.32;
  const dataColW = (width - labelColW) / (colCount - 1);
  const rowH = 7;

  // Header row
  doc.setFillColor(...COLORS.brandBlue);
  doc.rect(x, y, width, rowH + 1, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);

  // First header (label column)
  doc.text(pdfSafe(headers[0]), x + 2, y + 5);
  // Data headers
  for (let i = 1; i < colCount; i++) {
    const cx = x + labelColW + (i - 1) * dataColW;
    doc.text(pdfSafe(headers[i]), cx + dataColW / 2, y + 5, { align: "center" });
  }

  y += rowH + 1;

  // Data rows
  rows.forEach((row, ri) => {
    // Alternating background
    if (ri % 2 === 0) {
      doc.setFillColor(...COLORS.rowAlt);
      doc.rect(x, y, width, rowH, "F");
    }

    // Highlight row
    if (row.highlight) {
      doc.setFillColor(240, 245, 255);
      doc.rect(x, y, width, rowH, "F");
    }

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    doc.text(pdfSafe(row.label), x + 2, y + 5);

    // Values
    for (let i = 0; i < row.values.length; i++) {
      const cx = x + labelColW + i * dataColW;
      const val = row.values[i];

      // Color for change values
      if (row.changeValues && row.changeValues[i] != null) {
        const cv = row.changeValues[i];
        if (cv > 0) {
          doc.setTextColor(...COLORS.greenAccent);
        } else if (cv < 0) {
          doc.setTextColor(...COLORS.redAccent);
        } else {
          doc.setTextColor(...COLORS.textDark);
        }
      } else {
        doc.setTextColor(...COLORS.textDark);
      }

      doc.setFont("helvetica", "normal");
      doc.text(pdfSafe(val || "-"), cx + dataColW / 2, y + 5, { align: "center" });
    }

    y += rowH;
  });

  // Bottom border
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + width, y);

  return y + 4;
}

// ── Market Type Indicator ───────────────────────────────────────────────────

/**
 * Draw a market type indicator (Seller's / Balanced / Buyer's Market).
 * Returns new y position.
 */
export function drawMarketTypeIndicator(
  doc: jsPDF,
  marketType: "sellers" | "balanced" | "buyers",
  y: number,
  margin: number = 16,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - margin * 2;
  const barW = contentW;
  const barH = 8;
  const barY = y + 4;

  // Background gradient (3 segments)
  const segW = barW / 3;

  // Red segment (Seller's)
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(margin, barY, segW, barH, 2, 2, "F");
  doc.rect(margin + segW - 2, barY, 2, barH, "F"); // fill corner

  // Yellow segment (Balanced)
  doc.setFillColor(234, 179, 8);
  doc.rect(margin + segW, barY, segW, barH, "F");

  // Blue segment (Buyer's)
  doc.setFillColor(59, 130, 246);
  doc.rect(margin + segW * 2, barY, segW, barH, "F");
  doc.roundedRect(margin + segW * 2, barY, segW, barH, 2, 2, "F");
  doc.rect(margin + segW * 2, barY, 2, barH, "F"); // fill corner

  // Labels
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("Seller's Market", margin + segW / 2, barY + 5.5, { align: "center" });
  doc.text("Balanced", margin + segW * 1.5, barY + 5.5, { align: "center" });
  doc.text("Buyer's Market", margin + segW * 2.5, barY + 5.5, { align: "center" });

  // Position marker (triangle)
  let markerX: number;
  switch (marketType) {
    case "sellers":
      markerX = margin + segW * 0.5;
      break;
    case "balanced":
      markerX = margin + segW * 1.5;
      break;
    case "buyers":
      markerX = margin + segW * 2.5;
      break;
  }

  // Triangle above bar
  const triY = barY - 2;
  doc.setFillColor(...COLORS.textDark);
  doc.triangle(markerX - 3, triY - 4, markerX + 3, triY - 4, markerX, triY, "F");

  return barY + barH + 6;
}

// ── Photo Gallery Grid ──────────────────────────────────────────────────────

/**
 * Draw a 2x3 photo gallery grid. Returns new y position.
 */
export function drawPhotoGallery(
  doc: jsPDF,
  photos: string[],
  y: number,
  margin: number = 16,
): number {
  const contentW = doc.internal.pageSize.getWidth() - margin * 2;
  const cols = 3;
  const gap = 3;
  const photoW = (contentW - gap * (cols - 1)) / cols;
  const photoH = photoW * 0.66;

  let cx = margin;
  let cy = y;
  let count = 0;

  for (const photo of photos) {
    if (count > 0 && count % cols === 0) {
      cx = margin;
      cy += photoH + gap;
    }

    try {
      doc.addImage(photo, "JPEG", cx, cy, photoW, photoH);
    } catch {
      doc.setFillColor(...COLORS.lightGray);
      doc.rect(cx, cy, photoW, photoH, "F");
    }

    cx += photoW + gap;
    count++;
  }

  return cy + photoH + 4;
}

// ── Page Break Check ────────────────────────────────────────────────────────

/**
 * Check if content fits on current page. If not, add new page with header.
 * Returns current y (unchanged if fits, or reset y after new page).
 */
export function checkNewPage(
  doc: jsPDF,
  y: number,
  needed: number,
  headerFn?: () => number,
): number {
  if (y + needed > 275) {
    doc.addPage();
    if (headerFn) {
      return headerFn();
    }
    return 16;
  }
  return y;
}

// ── Static Map Fetch ────────────────────────────────────────────────────────

/**
 * Fetch a static map image as a base64 data URI.
 * Tries OpenStreetMap static map service (no API key needed).
 */
export async function fetchStaticMapImage(
  latitude: number,
  longitude: number,
  width: number = 600,
  height: number = 400,
  zoom: number = 14,
): Promise<string | null> {
  try {
    // OpenStreetMap static map via staticmap.openstreetmap.de
    const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&markers=${latitude},${longitude},red-pushpin`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Fetch an image URL as a base64 data URI.
 */
export async function fetchImageAsDataUri(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// ── Equity Bar Visual ───────────────────────────────────────────────────────

/**
 * Draw a visual equity bar showing equity vs. debt proportions.
 * Returns new y position.
 */
export function drawEquityBar(
  doc: jsPDF,
  propertyValue: number,
  loanBalance: number,
  y: number,
  margin: number = 16,
): number {
  const contentW = doc.internal.pageSize.getWidth() - margin * 2;
  const barH = 12;
  const equity = propertyValue - loanBalance;
  const equityPct = Math.max(0, Math.min(100, (equity / propertyValue) * 100));
  const debtPct = 100 - equityPct;

  // Equity portion (green)
  const equityW = (equityPct / 100) * contentW;
  doc.setFillColor(...COLORS.greenAccent);
  doc.roundedRect(margin, y, equityW, barH, 2, 2, "F");
  if (equityW < contentW) doc.rect(margin + equityW - 2, y, 2, barH, "F");

  // Debt portion (red)
  const debtW = contentW - equityW;
  if (debtW > 0) {
    doc.setFillColor(...COLORS.redAccent);
    doc.rect(margin + equityW, y, debtW, barH, "F");
    doc.roundedRect(margin + equityW, y, debtW, barH, 2, 2, "F");
    if (equityW > 0) doc.rect(margin + equityW, y, 2, barH, "F");
  }

  // Labels inside bar
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);

  if (equityW > 40) {
    doc.text(`Equity ${equityPct.toFixed(0)}%`, margin + equityW / 2, y + 8, { align: "center" });
  }
  if (debtW > 40) {
    doc.text(`Debt ${debtPct.toFixed(0)}%`, margin + equityW + debtW / 2, y + 8, { align: "center" });
  }

  return y + barH + 4;
}

// ── AVM Range Bar ───────────────────────────────────────────────────────────

/**
 * Draw an AVM range bar showing low / estimate / high.
 * Returns new y position.
 */
export function drawAvmRangeBar(
  doc: jsPDF,
  low: number,
  estimate: number,
  high: number,
  y: number,
  margin: number = 16,
): number {
  const contentW = doc.internal.pageSize.getWidth() - margin * 2;
  const barW = contentW * 0.7;
  const barX = margin + (contentW - barW) / 2;
  const barH = 6;

  // Range bar background
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(barX, y, barW, barH, 2, 2, "F");

  // Filled portion (low to high)
  doc.setFillColor(...COLORS.brandBlue);
  doc.roundedRect(barX, y, barW, barH, 2, 2, "F");

  // Estimate marker
  const estimatePos = barX + ((estimate - low) / (high - low)) * barW;
  doc.setFillColor(...COLORS.brandGold);
  doc.circle(estimatePos, y + barH / 2, 3, "F");
  doc.setDrawColor(...COLORS.white);
  doc.setLineWidth(0.5);
  doc.circle(estimatePos, y + barH / 2, 3, "S");

  // Labels
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textMuted);
  doc.text(fmt$(low), barX, y + barH + 5);
  doc.text(fmt$(high), barX + barW, y + barH + 5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.brandBlue);
  doc.text(fmt$(estimate), estimatePos, y - 2, { align: "center" });

  return y + barH + 10;
}
