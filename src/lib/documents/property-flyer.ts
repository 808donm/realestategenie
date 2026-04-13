/**
 * Property Flyer PDF Generator
 *
 * Creates a single-page property marketing flyer inspired by RPR format.
 * Features: hero photo, property details, agent branding, photo gallery.
 * Colors are configurable via the FlyerConfig.
 */

import jsPDF from "jspdf";
import { pdfSafe, fmt$ } from "./pdf-report-utils";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FlyerConfig {
  // Colors (RGB arrays)
  primaryColor?: [number, number, number];    // Header bar, accents (default: dark navy)
  accentColor?: [number, number, number];     // Price label, highlights (default: brand blue)
  textColor?: [number, number, number];       // Body text (default: dark gray)
  mutedColor?: [number, number, number];      // Secondary text (default: gray)
  bgColor?: [number, number, number];         // Background (default: white)

  // Layout
  headline?: string; // "House For Sale", "Just Listed", "Open House", etc.
}

export interface FlyerPropertyData {
  address: string;
  city: string;
  state: string;
  zip: string;
  mlsNumber?: string;
  listPrice: number;
  description?: string;

  // Property details
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  hoaFee?: number;
  hoaSchedule?: string;
  schoolDistrict?: string;
  ownershipType?: string;

  // Photos (base64 data URLs)
  heroPhoto?: string;
  galleryPhotos?: string[];
}

export interface FlyerAgentData {
  displayName: string;
  email?: string;
  phone?: string;
  cellPhone?: string;
  licenseNumber?: string;
  appraisalLicense?: string;
  brokerageName?: string;
  brokerageAddress?: string;
  website?: string;
  headshotData?: string;     // Base64 headshot
  brokerLogoData?: string;   // Base64 brokerage logo
  officePhoto?: string;      // Base64 office/building photo
  qrCodeUrl?: string;        // URL to encode as QR code (e.g., listing or open house URL)
}

// ── Default Colors ─────────────────────────────────────────────────────────

const DEFAULT_COLORS = {
  primary: [30, 58, 95] as [number, number, number],        // Dark navy
  accent: [37, 99, 235] as [number, number, number],        // Blue
  text: [17, 24, 39] as [number, number, number],           // Near black
  muted: [107, 114, 128] as [number, number, number],       // Gray
  bg: [255, 255, 255] as [number, number, number],          // White
  lightGray: [229, 231, 235] as [number, number, number],   // Borders
  cardBg: [245, 247, 250] as [number, number, number],      // Agent card bg
};

// ── Generator ──────────────────────────────────────────────────────────────

export async function generatePropertyFlyer(
  property: FlyerPropertyData,
  agent: FlyerAgentData,
  config?: FlyerConfig,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();   // 215.9mm
  const pageH = doc.internal.pageSize.getHeight();  // 279.4mm
  const margin = 12;
  const contentW = pageW - margin * 2;

  // Colors
  const C = {
    primary: config?.primaryColor || DEFAULT_COLORS.primary,
    accent: config?.accentColor || DEFAULT_COLORS.accent,
    text: config?.textColor || DEFAULT_COLORS.text,
    muted: config?.mutedColor || DEFAULT_COLORS.muted,
    bg: config?.bgColor || DEFAULT_COLORS.bg,
  };

  const headline = config?.headline || "House For Sale";

  // ── Left Column (property) and Right Column (agent) layout ──
  const leftW = contentW * 0.62;
  const rightW = contentW * 0.35;
  const rightX = margin + leftW + contentW * 0.03;
  let y = margin;

  // ── Top: Hero Photo (left) ──
  const heroH = 72;
  if (property.heroPhoto) {
    try {
      doc.addImage(property.heroPhoto, "JPEG", margin, y, leftW, heroH);
    } catch {
      doc.setFillColor(200, 200, 200);
      doc.rect(margin, y, leftW, heroH, "F");
      doc.setFontSize(12);
      doc.setTextColor(...C.muted);
      doc.text("Photo Not Available", margin + leftW / 2, y + heroH / 2, { align: "center" });
    }
  } else {
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, y, leftW, heroH, "F");
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text("No Photo Available", margin + leftW / 2, y + heroH / 2, { align: "center" });
  }

  // ── Top Right: Agent card + Office photo ──
  // Office/building photo
  const officePhotoH = 32;
  if (agent.officePhoto || agent.brokerLogoData) {
    try {
      doc.addImage(agent.officePhoto || agent.brokerLogoData!, "JPEG", rightX, y, rightW, officePhotoH);
    } catch {
      // Skip if image fails
    }
  }

  // Agent info card
  const agentCardY = y + (agent.officePhoto || agent.brokerLogoData ? officePhotoH + 3 : 0);
  doc.setFillColor(...DEFAULT_COLORS.cardBg);
  doc.roundedRect(rightX, agentCardY, rightW, 68, 2, 2, "F");

  // "OFFERED AT" label
  doc.setFontSize(9);
  doc.setTextColor(...C.accent);
  doc.setFont("helvetica", "bold");
  doc.text("OFFERED AT", rightX + rightW / 2, agentCardY + 8, { align: "center" });

  // Price
  doc.setFontSize(22);
  doc.setTextColor(...C.text);
  doc.text(pdfSafe(fmt$(property.listPrice)), rightX + rightW / 2, agentCardY + 18, { align: "center" });

  // Divider
  doc.setDrawColor(...DEFAULT_COLORS.lightGray);
  doc.line(rightX + 5, agentCardY + 22, rightX + rightW - 5, agentCardY + 22);

  // Agent headshot
  let agentInfoY = agentCardY + 26;
  if (agent.headshotData) {
    try {
      doc.addImage(agent.headshotData, "JPEG", rightX + rightW / 2 - 10, agentInfoY, 20, 20);
      agentInfoY += 22;
    } catch {
      // Skip
    }
  }

  // Agent name
  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.setFont("helvetica", "bold");
  doc.text(pdfSafe(agent.displayName), rightX + rightW / 2, agentInfoY, { align: "center" });
  agentInfoY += 4;

  // License
  if (agent.licenseNumber) {
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.text(pdfSafe(`License #${agent.licenseNumber}`), rightX + rightW / 2, agentInfoY, { align: "center" });
    agentInfoY += 3;
  }
  if (agent.appraisalLicense) {
    doc.text(pdfSafe(`Appraisal License #${agent.appraisalLicense}`), rightX + rightW / 2, agentInfoY, { align: "center" });
    agentInfoY += 4;
  }

  // Contact details
  doc.setFontSize(7.5);
  doc.setTextColor(...C.text);
  if (agent.phone) {
    doc.text(pdfSafe(`Office ${agent.phone}${agent.cellPhone ? ` | Cell ${agent.cellPhone}` : ""}`), rightX + rightW / 2, agentInfoY, { align: "center" });
    agentInfoY += 3.5;
  }
  if (agent.email) {
    doc.text(pdfSafe(agent.email), rightX + rightW / 2, agentInfoY, { align: "center" });
    agentInfoY += 3.5;
  }
  if (agent.website) {
    doc.text(pdfSafe(agent.website), rightX + rightW / 2, agentInfoY, { align: "center" });
    agentInfoY += 3.5;
  }

  // Brokerage
  if (agent.brokerageName) {
    agentInfoY += 2;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafe(agent.brokerageName), rightX + rightW / 2, agentInfoY, { align: "center" });
    agentInfoY += 3;
    if (agent.brokerageAddress) {
      doc.setFont("helvetica", "normal");
      doc.text(pdfSafe(agent.brokerageAddress), rightX + rightW / 2, agentInfoY, { align: "center" });
    }
  }

  // Broker logo below agent card
  if (agent.brokerLogoData) {
    const logoY = agentInfoY + 6;
    try {
      doc.addImage(agent.brokerLogoData, "PNG", rightX + rightW / 2 - 15, logoY, 30, 12);
      agentInfoY = logoY + 14;
    } catch { /* skip */ }
  }

  // QR Code below broker logo
  if (agent.qrCodeUrl) {
    try {
      const QRCode = (await import("qrcode")).default;
      const qrDataUrl = await QRCode.toDataURL(agent.qrCodeUrl, { width: 200, margin: 1 });
      const qrY = agentInfoY + 4;
      const qrSize = 22;
      doc.addImage(qrDataUrl, "PNG", rightX + rightW / 2 - qrSize / 2, qrY, qrSize, qrSize);
      doc.setFontSize(6);
      doc.setTextColor(...C.muted);
      doc.setFont("helvetica", "normal");
      doc.text("Scan for details", rightX + rightW / 2, qrY + qrSize + 3, { align: "center" });
    } catch { /* QR generation failed, skip */ }
  }

  // ── Headline ──
  y += heroH + 6;
  doc.setFontSize(28);
  doc.setTextColor(...C.text);
  doc.setFont("helvetica", "bold");
  doc.text(pdfSafe(headline), margin, y);
  y += 10;

  // Thin accent line under headline
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + 40, y);
  y += 6;

  // ── Address + MLS ──
  doc.setFontSize(12);
  doc.setTextColor(...C.text);
  doc.setFont("helvetica", "bold");
  doc.text(pdfSafe(`${property.address}`), margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "normal");
  doc.text(pdfSafe(`${property.city}, ${property.state} ${property.zip}`), margin, y);
  if (property.mlsNumber) {
    doc.text(pdfSafe(`MLS #${property.mlsNumber}`), margin + 60, y);
  }
  y += 5;

  // ── Description ──
  if (property.description) {
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(pdfSafe(property.description), leftW);
    const maxDescLines = 8;
    const truncated = descLines.slice(0, maxDescLines);
    doc.text(truncated, margin, y);
    y += truncated.length * 3.2 + 4;
  }

  // ── Property Details Grid ──
  doc.setDrawColor(...DEFAULT_COLORS.lightGray);
  doc.line(margin, y, margin + leftW, y);
  y += 4;

  const detailPairs: [string, string][] = [];
  if (property.propertyType) detailPairs.push(["Property Type", property.propertyType]);
  if (property.beds != null) detailPairs.push(["Bedrooms", String(property.beds)]);
  if (property.baths != null) detailPairs.push(["Total Baths", String(property.baths)]);
  if (property.sqft) detailPairs.push(["Living Area", `${property.sqft.toLocaleString()} sqft`]);
  if (property.hoaFee) detailPairs.push(["HOA Fee", `$${property.hoaFee}`]);
  if (property.hoaSchedule) detailPairs.push(["HOA Schedule", property.hoaSchedule]);
  if (property.lotSize) detailPairs.push(["Lot Size", `${property.lotSize.toLocaleString()} sqft`]);
  if (property.schoolDistrict) detailPairs.push(["School District", property.schoolDistrict]);
  if (property.yearBuilt) detailPairs.push(["Year Built", String(property.yearBuilt)]);
  if (property.ownershipType) detailPairs.push(["Ownership", property.ownershipType]);

  // Render in 2-column grid
  const colW = leftW / 2;
  doc.setFontSize(8);
  for (let i = 0; i < detailPairs.length; i += 2) {
    const [label1, val1] = detailPairs[i];
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.text);
    doc.text(pdfSafe(label1), margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(pdfSafe(val1), margin + 28, y);

    if (i + 1 < detailPairs.length) {
      const [label2, val2] = detailPairs[i + 1];
      doc.setFont("helvetica", "bold");
      doc.text(pdfSafe(label2), margin + colW, y);
      doc.setFont("helvetica", "normal");
      doc.text(pdfSafe(val2), margin + colW + 28, y);
    }
    y += 5;
  }

  // ── Photo Gallery ──
  y += 4;
  const galleryPhotos = property.galleryPhotos || [];
  if (galleryPhotos.length > 0) {
    const photoCount = Math.min(galleryPhotos.length, 3);
    const photoW = (leftW - (photoCount - 1) * 3) / photoCount;
    const photoH = 36;

    for (let i = 0; i < photoCount; i++) {
      const px = margin + i * (photoW + 3);
      try {
        doc.addImage(galleryPhotos[i], "JPEG", px, y, photoW, photoH);
      } catch {
        doc.setFillColor(220, 220, 220);
        doc.rect(px, y, photoW, photoH, "F");
      }
    }
    y += photoH + 4;
  }

  // ── Footer ──
  const footerY = pageH - 12;

  // Disclaimer
  doc.setFontSize(5.5);
  doc.setTextColor(...C.muted);
  doc.setFont("helvetica", "italic");
  doc.text(
    pdfSafe("Information is deemed reliable but not guaranteed. Equal Housing Opportunity."),
    margin,
    footerY,
  );

  // Date
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString(), pageW - margin, footerY, { align: "right" });

  // Powered by line
  doc.setFontSize(5);
  doc.text("Powered by Real Estate Genie", pageW / 2, footerY + 3, { align: "center" });

  return doc.output("blob");
}
