import jsPDF from "jspdf";
import { FlyerTemplate } from "@/lib/flyer-templates";

export type FlyerRenderContext = {
  pdf: jsPDF;
  event: any;
  agent: any;
  template: FlyerTemplate;
  primaryRGB: { r: number; g: number; b: number };
  secondaryRGB: { r: number; g: number; b: number };
  propertyPhotoData: string | null;
  photoWidth: number;
  photoHeight: number;
  secondaryPhotoData: string | null;
  secondaryPhotoWidth: number;
  secondaryPhotoHeight: number;
  tertiaryPhotoData: string | null;
  tertiaryPhotoWidth: number;
  tertiaryPhotoHeight: number;
  mapImageData: string | null;
  mapWidth: number;
  mapHeight: number;
  qrCodeData: string | null;
  headshotData: string | null;
  headshotWidth: number;
  headshotHeight: number;
  logoData: string | null;
  logoWidth: number;
  logoHeight: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
};

// ─── Helper: Sanitize text for jsPDF (WinAnsiEncoding only) ──────────────────

function pdfSafe(str: string): string {
  return str.replace(/[^\x20-\x7E\xA0-\xFF]/g, (ch) => {
    if (ch === "\u2018" || ch === "\u2019") return "'";
    if (ch === "\u201C" || ch === "\u201D") return '"';
    if (ch === "\u2013" || ch === "\u2014") return "-";
    if (ch === "\u2022") return "-";
    if (ch === "\u00A0") return " ";
    if (ch === "\u2026") return "...";
    return "";
  });
}

// ─── Default Template (existing 8 templates) ────────────────────────────────

export function renderDefaultTemplate(ctx: FlyerRenderContext): void {
  const {
    pdf,
    event,
    agent,
    primaryRGB,
    propertyPhotoData,
    photoWidth,
    photoHeight,
    mapImageData,
    mapWidth,
    mapHeight,
    qrCodeData,
    headshotData,
    logoData,
    logoWidth,
    logoHeight,
    pageWidth,
    pageHeight,
    margin,
  } = ctx;

  const footerHeight = 50;
  const maxContentY = pageHeight - footerHeight - 10;

  const needsNewPage = (currentY: number, requiredSpace: number): boolean => {
    return currentY + requiredSpace > maxContentY;
  };

  const addNewPage = (): number => {
    pdf.addPage();
    return margin + 10;
  };

  // Header - Property Address
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.text(event.address, margin, 25);
  pdf.setTextColor(0, 0, 0);

  let yPos = 35;

  // Property Photo and Map
  const hasPhoto = !!propertyPhotoData;
  const hasMap = !!mapImageData;

  if (hasPhoto || hasMap) {
    try {
      const maxContentWidth = pageWidth - margin * 2;
      const maxHeight = 70;
      const gap = 5;

      if (hasPhoto && hasMap) {
        const itemWidth = (maxContentWidth - gap) / 2;
        const photoAspect = photoWidth / photoHeight;
        let scaledPhotoWidth = itemWidth;
        let scaledPhotoHeight = scaledPhotoWidth / photoAspect;
        if (scaledPhotoHeight > maxHeight) {
          scaledPhotoHeight = maxHeight;
          scaledPhotoWidth = scaledPhotoHeight * photoAspect;
        }
        const photoX = margin + (itemWidth - scaledPhotoWidth) / 2;
        pdf.addImage(propertyPhotoData!, "JPEG", photoX, yPos, scaledPhotoWidth, scaledPhotoHeight, undefined, "FAST");

        const mapAspect = mapWidth / mapHeight;
        let scaledMapWidth = itemWidth;
        let scaledMapHeight = scaledMapWidth / mapAspect;
        if (scaledMapHeight > maxHeight) {
          scaledMapHeight = maxHeight;
          scaledMapWidth = scaledMapHeight * mapAspect;
        }
        const mapX = margin + itemWidth + gap + (itemWidth - scaledMapWidth) / 2;
        pdf.addImage(mapImageData!, "PNG", mapX, yPos, scaledMapWidth, scaledMapHeight, undefined, "FAST");

        yPos += Math.max(scaledPhotoHeight, scaledMapHeight) + 10;
      } else if (hasPhoto) {
        const photoAspect = photoWidth / photoHeight;
        let scaledPhotoWidth = maxContentWidth;
        let scaledPhotoHeight = scaledPhotoWidth / photoAspect;
        if (scaledPhotoHeight > maxHeight) {
          scaledPhotoHeight = maxHeight;
          scaledPhotoWidth = scaledPhotoHeight * photoAspect;
        }
        const photoX = margin + (maxContentWidth - scaledPhotoWidth) / 2;
        pdf.addImage(propertyPhotoData!, "JPEG", photoX, yPos, scaledPhotoWidth, scaledPhotoHeight, undefined, "FAST");
        yPos += scaledPhotoHeight + 10;
      } else if (hasMap) {
        const mapAspect = mapWidth / mapHeight;
        let scaledMapWidth = maxContentWidth;
        let scaledMapHeight = scaledMapWidth / mapAspect;
        if (scaledMapHeight > maxHeight) {
          scaledMapHeight = maxHeight;
          scaledMapWidth = scaledMapHeight * mapAspect;
        }
        const mapX = margin + (maxContentWidth - scaledMapWidth) / 2;
        pdf.addImage(mapImageData!, "PNG", mapX, yPos, scaledMapWidth, scaledMapHeight, undefined, "FAST");
        yPos += scaledMapHeight + 10;
      }
    } catch (error) {
      console.error("Failed to add images to PDF:", error);
    }
  }

  // Price
  if (event.price) {
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.text(pdfSafe(`$${event.price.toLocaleString()}`), margin, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 10;
  }

  // Property stats
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  const stats = [];
  if (event.beds) stats.push(`${event.beds} Beds`);
  if (event.baths) stats.push(`${event.baths} Baths`);
  if (event.sqft) stats.push(`${pdfSafe(event.sqft.toLocaleString())} sqft`);
  if (stats.length > 0) {
    pdf.text(stats.join("  |  "), margin, yPos);
    yPos += 10;
  }

  // Description — prefer flyer_description, fall back to listing_description
  const displayDescription = event.flyer_description || event.listing_description;
  if (displayDescription) {
    yPos += 5;
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(pdfSafe(displayDescription), pageWidth - margin * 2);
    const descriptionHeight = lines.length * 5;
    if (needsNewPage(yPos, descriptionHeight + 10)) {
      yPos = addNewPage();
    }
    pdf.text(lines, margin, yPos);
    yPos += descriptionHeight + 5;
  }

  // Features — prefer flyer_features (structured), fall back to key_features
  const hasFlyerFeatures = event.flyer_features && event.flyer_features.length > 0;
  const hasKeyFeatures = event.key_features && event.key_features.length > 0;

  if (hasFlyerFeatures) {
    yPos += 5;
    const qrSize = 35;
    const qrGap = 10;
    const textWidth = qrCodeData ? pageWidth - margin * 2 - qrSize - qrGap : pageWidth - margin * 2;

    const featuresStartY = yPos;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Property Features:", margin, yPos);
    yPos += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    event.flyer_features.forEach((feat: { icon: string; label: string; value: string }) => {
      pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
      pdf.circle(margin + 7, yPos - 1.2, 1, "F");
      pdf.setTextColor(0, 0, 0);
      pdf.text(pdfSafe(`${feat.label}: ${feat.value}`), margin + 11, yPos);
      yPos += 5;
    });

    if (qrCodeData) {
      const qrX = margin + textWidth + qrGap;
      pdf.addImage(qrCodeData, "PNG", qrX, featuresStartY, qrSize, qrSize, undefined, "FAST");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("Scan to Check In", qrX + qrSize / 2, featuresStartY + qrSize + 3, { align: "center" });
    }
  } else if (hasKeyFeatures) {
    yPos += 5;
    const qrSize = 35;
    const qrGap = 10;
    const textWidth = qrCodeData ? pageWidth - margin * 2 - qrSize - qrGap : pageWidth - margin * 2;
    let estimatedFeaturesHeight = 12;
    event.key_features.forEach((feature: string) => {
      const lines = pdf.splitTextToSize(pdfSafe(feature), textWidth - 8);
      estimatedFeaturesHeight += lines.length * 5;
    });

    if (needsNewPage(yPos, estimatedFeaturesHeight + 15)) {
      yPos = addNewPage();
    }

    const featuresStartY = yPos;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Key Features:", margin, yPos);
    yPos += 7;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    event.key_features.forEach((feature: string) => {
      pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
      pdf.circle(margin + 7, yPos - 1.2, 1, "F");
      const lines = pdf.splitTextToSize(pdfSafe(feature), textWidth - 8);
      pdf.setTextColor(0, 0, 0);
      pdf.text(lines, margin + 11, yPos);
      yPos += lines.length * 5;
    });

    if (qrCodeData) {
      const qrX = margin + textWidth + qrGap;
      pdf.addImage(qrCodeData, "PNG", qrX, featuresStartY, qrSize, qrSize, undefined, "FAST");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("Scan to Check In", qrX + qrSize / 2, featuresStartY + qrSize + 3, { align: "center" });
    }
  } else if (qrCodeData) {
    const qrSize = 35;
    if (needsNewPage(yPos, qrSize + 13)) {
      yPos = addNewPage();
    }
    yPos += 5;
    const qrX = margin + (pageWidth - margin * 2 - qrSize) / 2;
    pdf.addImage(qrCodeData, "PNG", qrX, yPos, qrSize, qrSize, undefined, "FAST");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("Scan to Check In", qrX + qrSize / 2, yPos + qrSize + 3, { align: "center" });
    yPos += qrSize + 8;
  }

  // Open House Banner
  yPos += 8;
  const bannerHeight = 18;
  if (needsNewPage(yPos, bannerHeight + 10)) {
    yPos = addNewPage();
  }

  pdf.setDrawColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setFillColor(
    Math.min(255, primaryRGB.r + 180),
    Math.min(255, primaryRGB.g + 180),
    Math.min(255, primaryRGB.b + 180),
  );
  pdf.roundedRect(margin, yPos, pageWidth - margin * 2, bannerHeight, 3, 3, "FD");

  pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);
  const openHouseText = pdfSafe(
    `OPEN HOUSE: ${startDate.toLocaleDateString()} | ${startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${endDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  );
  pdf.text(openHouseText, margin + 5, yPos + 11);
  pdf.setTextColor(0, 0, 0);

  // Agent Footer
  const footerStartY = pageHeight - footerHeight;
  yPos = footerStartY;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const headshotSize = 25;
  const logoMaxWidth = 40;
  const logoMaxHeight = 20;
  let textStartX = margin;

  if (headshotData) {
    try {
      pdf.addImage(headshotData, "JPEG", margin, yPos, headshotSize, headshotSize, undefined, "FAST");
      textStartX = margin + headshotSize + 5;
    } catch (error) {
      console.error("Failed to add headshot to PDF:", error);
    }
  }

  if (logoData) {
    try {
      const logoAspect = logoWidth / logoHeight;
      let scaledLogoWidth = logoMaxWidth;
      let scaledLogoHeight = scaledLogoWidth / logoAspect;
      if (scaledLogoHeight > logoMaxHeight) {
        scaledLogoHeight = logoMaxHeight;
        scaledLogoWidth = scaledLogoHeight * logoAspect;
      }
      const logoX = pageWidth - margin - scaledLogoWidth;
      pdf.addImage(logoData, "PNG", logoX, yPos, scaledLogoWidth, scaledLogoHeight, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add logo to PDF:", error);
    }
  }

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(agent?.display_name || "Your Agent", textStartX, yPos + 5);

  let textY = yPos + 11;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  if (agent?.agency_name) {
    pdf.text(agent.agency_name, textStartX, textY);
    textY += 5;
  }
  if (agent?.phone_e164) {
    pdf.text(`Phone: ${agent.phone_e164}`, textStartX, textY);
    textY += 5;
  }
  if (agent?.email) {
    pdf.text(`Email: ${agent.email}`, textStartX, textY);
    textY += 5;
  }
  if (agent?.license_number) {
    pdf.text(`License: ${agent.license_number}`, textStartX, textY);
  }

  // Disclaimer
  yPos = pageHeight - 15;
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(100, 100, 100);
  const disclaimer =
    "Information deemed reliable but not guaranteed. All measurements and information should be independently verified.";
  const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - margin * 2);
  pdf.text(disclaimerLines, margin, yPos);
}

// ─── Modern Blue Template ────────────────────────────────────────────────────

export function renderModernBlueTemplate(ctx: FlyerRenderContext): void {
  const {
    pdf,
    event,
    agent,
    primaryRGB,
    secondaryRGB,
    propertyPhotoData,
    photoWidth,
    photoHeight,
    secondaryPhotoData,
    secondaryPhotoWidth,
    secondaryPhotoHeight,
    qrCodeData,
    headshotData,
    headshotWidth,
    headshotHeight,
    logoData,
    logoWidth,
    logoHeight,
    pageWidth,
    pageHeight,
    margin,
  } = ctx;

  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // --- A. Blue header bar ---
  const headerH = 22;
  pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.rect(0, 0, pageWidth, headerH, "F");

  // Layout: Logo | Company Name | Phone — evenly spaced across 2/3 of header
  const twoThirdsW = (pageWidth * 2) / 3;

  // Logo (left-aligned)
  let logoEndX = margin;
  if (logoData) {
    const logoH = 16;
    const logoW = Math.min((logoWidth / logoHeight) * logoH, 36);
    try {
      pdf.addImage(logoData, "PNG", margin, (headerH - logoH) / 2, logoW, logoH, undefined, "FAST");
      logoEndX = margin + logoW;
    } catch (error) {
      console.error("Failed to add logo:", error);
    }
  }

  // Evenly space company name and phone across remaining 2/3-header area
  pdf.setTextColor(255, 255, 255);
  const remainingW = twoThirdsW - logoEndX;

  if (agent?.agency_name && agent?.phone_e164) {
    // Both present: split remaining space into 2 equal zones
    const zone = remainingW / 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(pdfSafe(agent.agency_name), logoEndX + zone / 2, headerH / 2 + 2, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.text(agent.phone_e164, logoEndX + zone + zone / 2, headerH / 2 + 2, { align: "center" });
  } else if (agent?.agency_name) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(pdfSafe(agent.agency_name), logoEndX + remainingW / 2, headerH / 2 + 2, { align: "center" });
  } else if (agent?.phone_e164) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.text(agent.phone_e164, logoEndX + remainingW / 2, headerH / 2 + 2, { align: "center" });
  }

  // --- B. "OPEN HOUSE" title + "Premium Real Estate" ---
  y = 33;
  pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setFont("times", "bold");
  pdf.setFontSize(28);
  pdf.text("OPEN HOUSE", pageWidth / 2, y, { align: "center" });

  // "Premium Real Estate" subtitle in luxury font
  pdf.setFont("times", "italic");
  pdf.setFontSize(12);
  pdf.text("Premium Real Estate", pageWidth / 2, y + 9, { align: "center" });

  // Accent underline
  pdf.setDrawColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setLineWidth(0.8);
  pdf.line(pageWidth / 2 - 25, y + 13, pageWidth / 2 + 25, y + 13);

  // --- C. Hero property image (2:1 aspect to match Open House page) ---
  y = 46;
  const heroAspect = 2; // 2:1 width:height to match the Open House page display
  const heroImgW = contentWidth;
  const heroImgH = heroImgW / heroAspect; // ~95mm on A4
  if (propertyPhotoData) {
    const imgX = margin;
    try {
      pdf.addImage(propertyPhotoData, "JPEG", imgX, y, heroImgW, heroImgH, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add hero image:", error);
    }

    // Price badge overlay with "OFFERED AT" on same line as price
    if (event.price) {
      const priceText = pdfSafe(`OFFERED AT $${Number(event.price).toLocaleString()}`);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      const textW = pdf.getTextWidth(priceText);
      const badgeW = textW + 12;
      const badgeH = 11;
      const bx = imgX + heroImgW - badgeW - 3;
      const by = y + heroImgH - badgeH - 3;
      pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
      pdf.roundedRect(bx, by, badgeW, badgeH, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(priceText, bx + badgeW / 2, by + 7.5, { align: "center" });
    }
    y += heroImgH + 2;
  } else {
    // Placeholder
    pdf.setFillColor(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b);
    pdf.rect(margin, y, heroImgW, heroImgH, "F");
    pdf.setTextColor(150, 150, 150);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.text("Property Photo", pageWidth / 2, y + heroImgH / 2, { align: "center" });
    pdf.setFontSize(9);
    pdf.text("Recommended: 1200 x 600 px", pageWidth / 2, y + heroImgH / 2 + 7, { align: "center" });
    y += heroImgH + 2;
  }

  // --- D. Description + QR code (two-column) ---
  const descQrY = y;
  const descColWidth = qrCodeData ? 120 : contentWidth;
  const qrColWidth = 55;

  // Left column: About the Property — prefer flyer_description
  const blueDescription = event.flyer_description || event.listing_description;
  if (blueDescription) {
    // Blue background header for "ABOUT THE PROPERTY"
    const headerLabelW = 72;
    const headerLabelH = 8;
    pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.roundedRect(margin, descQrY, headerLabelW, headerLabelH, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("ABOUT THE PROPERTY", margin + headerLabelW / 2, descQrY + 5.5, { align: "center" });

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    // Truncate to ~35 words
    const words = pdfSafe(blueDescription).split(/\s+/);
    const truncated = words.slice(0, 35).join(" ") + (words.length > 35 ? "..." : "");
    const lines = pdf.splitTextToSize(truncated, descColWidth);
    pdf.text(lines, margin, descQrY + 16);
    y = descQrY + 16 + lines.length * 4.5 + 6;
  } else {
    y = descQrY + 6;
  }

  // Right column: QR code
  if (qrCodeData) {
    const qrSize = 35;
    const qrX = pageWidth - margin - qrSize - 5;
    const qrY = descQrY;
    try {
      pdf.addImage(qrCodeData, "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add QR code:", error);
    }
    pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("Scan to Register", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });

    // Ensure y is past the QR code
    y = Math.max(y, qrY + qrSize + 8);
  }

  y += 2;

  // --- E. Secondary image (left) + Feature icons (right) ---
  // Cap height so secondary section ends at least 10mm above footer
  const footerTop = pageHeight - 22;
  const maxSecH = footerTop - y - 10;
  const secImgH = Math.min(60, maxSecH);
  const secImgW = contentWidth * 0.55; // ~55% width for image
  const featColX = margin + secImgW + 8;
  const featColW = contentWidth - secImgW - 8;

  if (secondaryPhotoData) {
    const aspect = secondaryPhotoWidth / secondaryPhotoHeight;
    let imgW = secImgW;
    let imgH = imgW / aspect;
    if (imgH > secImgH) {
      imgH = secImgH;
      imgW = imgH * aspect;
    }
    try {
      pdf.addImage(secondaryPhotoData, "JPEG", margin, y, imgW, imgH, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add secondary image:", error);
    }
  } else {
    // Placeholder for secondary image
    pdf.setFillColor(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b);
    pdf.rect(margin, y, secImgW, secImgH, "F");
    pdf.setTextColor(150, 150, 150);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Secondary Image", margin + secImgW / 2, y + secImgH / 2 - 4, { align: "center" });
    pdf.setFontSize(8);
    pdf.text("Recommended: 1200 x 800 px", margin + secImgW / 2, y + secImgH / 2 + 2, { align: "center" });
  }

  // Feature icons column (right side, next to secondary image)
  // "Property Features" header — blue background with white text (matches "About the Property")
  const featHeaderW = 62;
  const featHeaderH = 8;
  pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.roundedRect(featColX, y, featHeaderW, featHeaderH, 1.5, 1.5, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("PROPERTY FEATURES", featColX + featHeaderW / 2, y + 5.5, { align: "center" });

  // Feature icon rows — prefer flyer_features, fall back to hardcoded defaults
  const featureIcons =
    event.flyer_features && event.flyer_features.length > 0
      ? event.flyer_features.map((f: { icon: string; label: string; value: string }) => ({
          icon: f.icon,
          label: f.label,
          value: f.value || "--",
        }))
      : [
          { icon: "bed", label: "Bedroom", value: event.beds?.toString() || "--" },
          { icon: "bath", label: "Bathroom", value: event.baths?.toString() || "--" },
          { icon: "solar", label: "PV Solar", value: "Yes" },
          { icon: "garage", label: "Garage", value: event.parking_notes || "--" },
        ];

  let fy = y + 13;
  for (const feat of featureIcons) {
    // Draw icon
    drawHighlightIcon(pdf, feat.icon, featColX + 5, fy + 2, primaryRGB);

    // Label + value
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`${feat.label}: ${feat.value}`, featColX + 14, fy + 3.5);
    fy += 11;
  }

  y += secImgH + 4;

  // --- G. Blue footer bar with agent info ---
  const footerH = 22;
  const footerY = pageHeight - footerH;
  pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.rect(0, footerY, pageWidth, footerH, "F");

  // Agent headshot in left corner
  let agentTextX = margin;
  if (headshotData) {
    const hsSize = 18;
    const hsY = footerY + (footerH - hsSize) / 2;
    try {
      pdf.addImage(headshotData, "JPEG", margin, hsY, hsSize, hsSize, undefined, "FAST");
      agentTextX = margin + hsSize + 5;
    } catch (error) {
      console.error("Failed to add headshot:", error);
    }
  }

  // Agent name, license, phone
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(agent?.display_name || "Your Agent", agentTextX, footerY + 9);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const footerDetails: string[] = [];
  if (agent?.license_number) footerDetails.push(`Lic# ${agent.license_number}`);
  if (agent?.phone_e164) footerDetails.push(agent.phone_e164);
  if (footerDetails.length > 0) {
    pdf.text(footerDetails.join("  |  "), agentTextX, footerY + 16);
  }
}

// ─── Elegant Warm Template ───────────────────────────────────────────────────

export function renderElegantWarmTemplate(ctx: FlyerRenderContext): void {
  const {
    pdf,
    event,
    agent,
    primaryRGB,
    secondaryRGB,
    propertyPhotoData,
    photoWidth,
    photoHeight,
    secondaryPhotoData,
    secondaryPhotoWidth,
    secondaryPhotoHeight,
    tertiaryPhotoData,
    tertiaryPhotoWidth,
    tertiaryPhotoHeight,
    qrCodeData,
    logoData,
    logoWidth,
    logoHeight,
    pageWidth,
    pageHeight,
    margin,
  } = ctx;

  const contentWidth = pageWidth - margin * 2;

  // --- A. Upper photo section (0–100mm) ---
  const colH = 100;
  const largeW = 140;
  const smallW = pageWidth - largeW - 2;
  const smallH = (colH - 2) / 2;

  // Large left image
  if (propertyPhotoData) {
    try {
      pdf.addImage(propertyPhotoData, "JPEG", 0, 0, largeW, colH, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add large image:", error);
    }
  } else {
    pdf.setFillColor(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b);
    pdf.rect(0, 0, largeW, colH, "F");
    pdf.setTextColor(180, 170, 155);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text("Main Photo", largeW / 2, colH / 2 - 3, { align: "center" });
    pdf.setFontSize(8);
    pdf.text("Recommended: 800 x 600 px", largeW / 2, colH / 2 + 4, { align: "center" });
  }

  // Top-right image
  if (secondaryPhotoData) {
    try {
      pdf.addImage(secondaryPhotoData, "JPEG", largeW + 2, 0, smallW, smallH, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add top-right image:", error);
    }
  } else {
    pdf.setFillColor(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b);
    pdf.rect(largeW + 2, 0, smallW, smallH, "F");
    pdf.setTextColor(180, 170, 155);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Photo 2", largeW + 2 + smallW / 2, smallH / 2 - 2, { align: "center" });
    pdf.setFontSize(7);
    pdf.text("Rec: 400 x 290 px", largeW + 2 + smallW / 2, smallH / 2 + 4, { align: "center" });
  }

  // Bottom-right image
  if (tertiaryPhotoData) {
    try {
      pdf.addImage(tertiaryPhotoData, "JPEG", largeW + 2, smallH + 2, smallW, smallH, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add bottom-right image:", error);
    }
  } else {
    pdf.setFillColor(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b);
    pdf.rect(largeW + 2, smallH + 2, smallW, smallH, "F");
    pdf.setTextColor(180, 170, 155);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Photo 3", largeW + 2 + smallW / 2, smallH + 2 + smallH / 2 - 2, { align: "center" });
    pdf.setFontSize(7);
    pdf.text("Rec: 400 x 290 px", largeW + 2 + smallW / 2, smallH + 2 + smallH / 2 + 4, { align: "center" });
  }

  // Company logo overlay (upper-left, on white pill)
  if (logoData) {
    const lH = 12;
    const lW = Math.min((logoWidth / logoHeight) * lH, 35);
    // White background pill
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(6, 6, lW + 8, lH + 6, 3, 3, "F");
    try {
      pdf.addImage(logoData, "PNG", 10, 9, lW, lH, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add logo overlay:", error);
    }
  }

  // Price badge (lower-right of photo section)
  if (event.price) {
    const badgeW = 55;
    const badgeH = 12;
    const bx = pageWidth - badgeW - 5;
    const by = colH - badgeH - 5;
    pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.roundedRect(bx, by, badgeW, badgeH, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(pdfSafe(`$${Number(event.price).toLocaleString()}`), bx + badgeW - 4, by + 9, { align: "right" });
  }

  // --- B. Brown header bar (102–118mm) ---
  let y = 102;
  const barH = 16;
  pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.rect(0, y, pageWidth, barH, "F");

  // Address on left
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  const addressLines = pdf.splitTextToSize(event.address, pageWidth / 2 - margin);
  pdf.text(addressLines, margin, y + 7 + (addressLines.length > 1 ? -2 : 0));

  // Date and time on right
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);
  const dateLine = pdfSafe(startDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  const timeLine = pdfSafe(
    `${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
  );
  pdf.text(dateLine, pageWidth - margin, y + 6, { align: "right" });
  pdf.setFontSize(10);
  pdf.text(timeLine, pageWidth - margin, y + 12, { align: "right" });

  y += barH;

  // --- C. Description (122–142mm) — prefer flyer_description ---
  y += 6;
  const warmDescription = event.flyer_description || event.listing_description;
  if (warmDescription) {
    pdf.setTextColor(60, 60, 60);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    // Truncate to ~20 words
    const descWords = pdfSafe(warmDescription).split(/\s+/);
    const truncated = descWords.slice(0, 20).join(" ") + (descWords.length > 20 ? "..." : "");
    const lines = pdf.splitTextToSize(truncated, contentWidth);
    pdf.text(lines, pageWidth / 2, y + 5, { align: "center" });
    y += lines.length * 5 + 8;
  } else {
    y += 4;
  }

  // --- D. Property Highlights + Agent Info ---
  y += 4;

  // "Property Highlights" header
  pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Property Highlights", margin, y + 5);
  y += 12;

  // Four highlight boxes in a row
  const boxW = 38;
  const boxH = 30;
  const boxGap = 6;
  const totalBoxW = 4 * boxW + 3 * boxGap;
  const boxStartX = margin;

  const highlights =
    event.flyer_features && event.flyer_features.length > 0
      ? event.flyer_features.map((f: { icon: string; label: string; value: string }) => ({
          value: f.value || "--",
          label: f.label,
          icon: f.icon,
        }))
      : [
          { value: event.beds?.toString() || "--", label: "Beds", icon: "bed" },
          { value: event.baths?.toString() || "--", label: "Baths", icon: "bath" },
          { value: event.parking_notes || "--", label: "Parking", icon: "garage" },
          { value: event.sqft ? pdfSafe(Number(event.sqft).toLocaleString()) : "--", label: "Sqft", icon: "sqft" },
        ];

  for (let i = 0; i < highlights.length; i++) {
    const bx = boxStartX + i * (boxW + boxGap);
    const by = y;

    // Box background
    pdf.setFillColor(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b);
    pdf.roundedRect(bx, by, boxW, boxH, 2, 2, "F");

    // Draw icon
    drawHighlightIcon(pdf, highlights[i].icon, bx + boxW / 2, by + 7, primaryRGB);

    // Value
    pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(highlights[i].value, bx + boxW / 2, by + 19, { align: "center" });

    // Label
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(highlights[i].label, bx + boxW / 2, by + 26, { align: "center" });
  }

  // Agent info (right side, aligned with highlight boxes)
  const agentX = boxStartX + totalBoxW + 15;
  const agentY = y;

  pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(agent?.display_name || "Your Agent", agentX, agentY + 8);

  pdf.setTextColor(60, 60, 60);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  let aTextY = agentY + 16;
  if (agent?.phone_e164) {
    pdf.text(`Phone: ${agent.phone_e164}`, agentX, aTextY);
    aTextY += 6;
  }
  if (agent?.email) {
    pdf.text(agent.email, agentX, aTextY);
  }

  y += boxH + 8;

  // --- E. QR Code section ---
  y += 8;
  if (qrCodeData) {
    const qrSize = 35;
    const qrX = pageWidth / 2 - qrSize / 2;
    try {
      pdf.addImage(qrCodeData, "PNG", qrX, y, qrSize, qrSize, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add QR code:", error);
    }
    pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Scan to Register", pageWidth / 2, y + qrSize + 5, { align: "center" });
    y += qrSize + 10;
  }

  // --- F. Disclaimer ---
  const disclaimerY = pageHeight - 12;
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(100, 100, 100);
  const disclaimer =
    "Information deemed reliable but not guaranteed. All measurements and information should be independently verified.";
  const discLines = pdf.splitTextToSize(disclaimer, contentWidth);
  pdf.text(discLines, margin, disclaimerY);
}

// ─── Property Showcase Template ─────────────────────────────────────────────
// Layout inspired by RPR listing flyers: large hero photo top-left, small photos
// top-right, "House For Sale" title, description + details left, agent sidebar right,
// photo gallery bottom, Real Estate Genie branding footer.

export function renderPropertyShowcaseTemplate(ctx: FlyerRenderContext): void {
  const {
    pdf,
    event,
    agent,
    propertyPhotoData,
    photoWidth,
    photoHeight,
    secondaryPhotoData,
    tertiaryPhotoData,
    qrCodeData,
    headshotData,
    logoData,
    logoWidth,
    logoHeight,
    pageWidth,
    pageHeight,
    margin,
  } = ctx;

  const contentWidth = pageWidth - margin * 2;
  const leftColWidth = contentWidth * 0.58;
  const rightColX = margin + leftColWidth + 6;
  const rightColWidth = contentWidth - leftColWidth - 6;
  let y = margin;

  // ── Top Photo Row: large hero left, two small photos stacked right ──
  const photoRowHeight = 72;
  const smallPhotoHeight = (photoRowHeight - 2) / 2;

  if (propertyPhotoData) {
    const imgW = leftColWidth;
    const imgH = photoRowHeight;
    const srcAspect = photoWidth / photoHeight;
    const destAspect = imgW / imgH;
    let sx = 0, sy = 0, sw = photoWidth, sh = photoHeight;
    if (srcAspect > destAspect) {
      sw = photoHeight * destAspect;
      sx = (photoWidth - sw) / 2;
    } else {
      sh = photoWidth / destAspect;
      sy = (photoHeight - sh) / 2;
    }
    pdf.addImage(propertyPhotoData, "JPEG", margin, y, imgW, imgH);
  } else {
    pdf.setFillColor(229, 231, 235);
    pdf.rect(margin, y, leftColWidth, photoRowHeight, "F");
    pdf.setFontSize(12);
    pdf.setTextColor(156, 163, 175);
    pdf.text("No Photo Available", margin + leftColWidth / 2, y + photoRowHeight / 2, { align: "center" });
  }

  // Small photos stacked on right
  if (secondaryPhotoData) {
    pdf.addImage(secondaryPhotoData, "JPEG", rightColX, y, rightColWidth, smallPhotoHeight);
  } else {
    pdf.setFillColor(243, 244, 246);
    pdf.rect(rightColX, y, rightColWidth, smallPhotoHeight, "F");
  }

  if (tertiaryPhotoData) {
    pdf.addImage(tertiaryPhotoData, "JPEG", rightColX, y + smallPhotoHeight + 2, rightColWidth, smallPhotoHeight);
  } else {
    pdf.setFillColor(243, 244, 246);
    pdf.rect(rightColX, y + smallPhotoHeight + 2, rightColWidth, smallPhotoHeight, "F");
  }

  y += photoRowHeight + 6;

  // ── "House For Sale" Title ──
  pdf.setFontSize(28);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont("helvetica", "bold");
  pdf.text("House For Sale", margin, y + 8);
  y += 14;

  // Thin divider line
  pdf.setDrawColor(209, 213, 219);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + leftColWidth, y);
  y += 4;

  // ── Two-Column Layout: Description + Details (left) | Agent Info (right) ──
  const agentBlockStartY = y;

  // -- LEFT COLUMN --

  // Address
  pdf.setFontSize(12);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont("helvetica", "bold");
  const address = pdfSafe(event.address || "Address not set");
  pdf.text(address, margin, y + 4);
  y += 6;

  // MLS #
  if (event.mls_listing_id) {
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont("helvetica", "normal");
    pdf.text(pdfSafe(`MLS #${event.mls_listing_id}`), margin, y + 3);
    y += 5;
  }

  y += 2;

  // Description
  const description = pdfSafe(event.flyer_description || event.listing_description || "");
  if (description) {
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    pdf.setFont("helvetica", "normal");
    const descLines = pdf.splitTextToSize(description, leftColWidth);
    const maxLines = 8;
    const trimmedLines = descLines.slice(0, maxLines);
    pdf.text(trimmedLines, margin, y + 3);
    y += trimmedLines.length * 3.5 + 4;
  }

  // Property Details Grid (2 columns)
  y += 2;
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, margin + leftColWidth, y);
  y += 4;

  const detailLeftX = margin;
  const detailRightX = margin + leftColWidth / 2 + 2;
  const detailColW = leftColWidth / 2 - 2;

  const drawDetail = (label: string, value: string, x: number, yPos: number) => {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(107, 114, 128);
    pdf.text(pdfSafe(label), x, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(31, 41, 55);
    pdf.text(pdfSafe(value), x + detailColW * 0.45, yPos);
  };

  const propType = event.property_type || "Residential";
  const beds = event.beds ? String(event.beds) : "-";
  const baths = event.baths ? String(event.baths) : "-";
  const sqft = event.sqft ? `${Number(event.sqft).toLocaleString()} sqft` : "-";
  const price = event.price ? `$${Number(event.price).toLocaleString()}` : "-";
  const lotSize = event.lot_size ? `${Number(event.lot_size).toLocaleString()} sqft` : "";
  const hoaFee = event.hoa_fee ? `$${event.hoa_fee}` : "";

  drawDetail("Property Type", propType, detailLeftX, y);
  if (hoaFee) drawDetail("HOA Fee", hoaFee, detailRightX, y);
  y += 5;
  drawDetail("Bedrooms", beds, detailLeftX, y);
  if (lotSize) drawDetail("Lot Size", lotSize, detailRightX, y);
  y += 5;
  drawDetail("Total Baths", baths, detailLeftX, y);
  y += 5;
  drawDetail("Living Area", sqft, detailLeftX, y);
  y += 5;

  const leftColEndY = y;

  // -- RIGHT COLUMN (Agent Info Sidebar) --
  let ry = agentBlockStartY;

  // Price box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(209, 213, 219);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(rightColX, ry, rightColWidth, 16, 1, 1, "FD");

  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "bold");
  pdf.text("OFFERED AT", rightColX + rightColWidth / 2, ry + 5, { align: "center" });
  pdf.setFontSize(16);
  pdf.setTextColor(31, 41, 55);
  pdf.text(pdfSafe(price), rightColX + rightColWidth / 2, ry + 13, { align: "center" });
  ry += 20;

  // Agent headshot
  if (headshotData) {
    const headSize = 22;
    const headX = rightColX + (rightColWidth - headSize) / 2;
    pdf.addImage(headshotData, "JPEG", headX, ry, headSize, headSize);
    ry += headSize + 3;
  }

  // Agent name
  const agentName = pdfSafe(agent?.display_name || "");
  if (agentName) {
    pdf.setFontSize(11);
    pdf.setTextColor(31, 41, 55);
    pdf.setFont("helvetica", "bold");
    pdf.text(agentName, rightColX + rightColWidth / 2, ry + 3, { align: "center" });
    ry += 6;
  }

  // License
  if (agent?.license_number) {
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont("helvetica", "normal");
    pdf.text(pdfSafe(`License #${agent.license_number}`), rightColX + rightColWidth / 2, ry + 2, { align: "center" });
    ry += 5;
  }

  ry += 2;

  // Contact details with icons
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  pdf.setFont("helvetica", "normal");
  const contactX = rightColX + 4;

  if (agent?.phone_e164) {
    pdf.text(pdfSafe(`Phone: ${agent.phone_e164}`), contactX, ry);
    ry += 4;
  }
  if (agent?.email) {
    pdf.text(pdfSafe(agent.email), contactX, ry);
    ry += 4;
  }

  ry += 2;

  // Agency name + address
  if (agent?.agency_name) {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(31, 41, 55);
    const agencyLines = pdf.splitTextToSize(pdfSafe(agent.agency_name), rightColWidth - 8);
    pdf.text(agencyLines, contactX, ry);
    ry += agencyLines.length * 3.5 + 2;
  }

  // Company logo
  if (logoData) {
    const maxLogoW = rightColWidth - 16;
    const maxLogoH = 18;
    let lw = maxLogoW;
    let lh = (logoHeight / logoWidth) * lw;
    if (lh > maxLogoH) {
      lh = maxLogoH;
      lw = (logoWidth / logoHeight) * lh;
    }
    const logoX = rightColX + (rightColWidth - lw) / 2;
    pdf.addImage(logoData, "PNG", logoX, ry, lw, lh);
    ry += lh + 3;
  }

  // QR Code under brokerage
  if (qrCodeData) {
    const qrSize = 20;
    const qrX = rightColX + (rightColWidth - qrSize) / 2;
    pdf.addImage(qrCodeData, "PNG", qrX, ry, qrSize, qrSize);
    ry += qrSize + 2;

    pdf.setFontSize(6);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont("helvetica", "normal");
    pdf.text("Scan for details", rightColX + rightColWidth / 2, ry, { align: "center" });
    ry += 5;
  }

  // ── Bottom Photo Gallery Row ──
  y = Math.max(leftColEndY, ry) + 4;

  // Draw up to 3 photos in a row (reuse hero + secondary + tertiary at smaller size)
  const galleryH = 30;
  const galleryCols = 3;
  const galleryGap = 3;
  const galleryW = (contentWidth - galleryGap * (galleryCols - 1)) / galleryCols;
  const galleryPhotos = [propertyPhotoData, secondaryPhotoData, tertiaryPhotoData].filter(Boolean);

  if (galleryPhotos.length > 0 && y + galleryH + 20 < pageHeight) {
    for (let i = 0; i < Math.min(galleryPhotos.length, galleryCols); i++) {
      const gx = margin + i * (galleryW + galleryGap);
      if (galleryPhotos[i]) {
        pdf.addImage(galleryPhotos[i]!, "JPEG", gx, y, galleryW, galleryH);
      }
    }
    y += galleryH + 4;
  }

  // ── Footer: Real Estate Genie branding + disclaimer ──
  const footerY = Math.max(y, pageHeight - 22);

  // Thin divider
  pdf.setDrawColor(209, 213, 219);
  pdf.setLineWidth(0.2);
  pdf.line(margin, footerY, margin + contentWidth, footerY);

  // Disclaimer text
  pdf.setFontSize(5.5);
  pdf.setTextColor(156, 163, 175);
  pdf.setFont("helvetica", "normal");
  const disclaimer = pdfSafe(
    "Information deemed reliable but not guaranteed. All measurements and information should be independently verified. " +
    "Equal Housing Opportunity.",
  );
  const discLines = pdf.splitTextToSize(disclaimer, contentWidth * 0.65);
  pdf.text(discLines, margin, footerY + 3);

  // Real Estate Genie branding (right side of footer)
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont("helvetica", "bold");
  pdf.text("Real Estate Genie", margin + contentWidth, footerY + 4, { align: "right" });
  pdf.setFontSize(5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(156, 163, 175);
  pdf.text("TM", margin + contentWidth + 0.5, footerY + 2.5);

  // Date
  const dateStr = new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  pdf.setFontSize(7);
  pdf.setTextColor(156, 163, 175);
  pdf.text(dateStr, margin + contentWidth, footerY + 8, { align: "right" });
}

// ─── Helper: Draw simple icons for property highlights ───────────────────────

function drawHighlightIcon(
  pdf: jsPDF,
  icon: string,
  cx: number,
  cy: number,
  color: { r: number; g: number; b: number },
): void {
  pdf.setDrawColor(color.r, color.g, color.b);
  pdf.setFillColor(color.r, color.g, color.b);
  pdf.setLineWidth(0.4);

  switch (icon) {
    case "bed":
      // Bed: mattress rectangle with headboard and pillow
      pdf.rect(cx - 5, cy - 1, 10, 4, "D");
      pdf.rect(cx - 5, cy - 3, 3, 2, "F"); // headboard
      pdf.rect(cx - 4, cy - 0.5, 2.5, 1.5, "D"); // pillow
      break;

    case "bath":
      // Bathtub with shower head
      pdf.rect(cx - 5, cy - 1, 10, 4, "D"); // tub body
      pdf.line(cx - 5, cy - 1, cx - 5, cy - 4); // shower pipe vertical
      pdf.line(cx - 5, cy - 4, cx - 2, cy - 4); // shower pipe horizontal
      // Shower drops
      pdf.circle(cx - 4, cy - 2.5, 0.4, "F");
      pdf.circle(cx - 3, cy - 2, 0.4, "F");
      pdf.circle(cx - 2, cy - 2.5, 0.4, "F");
      break;

    case "solar":
      // Sun with rays
      pdf.circle(cx, cy, 2.2, "F"); // sun center
      const rayLen = 1.8;
      const r = 3;
      for (let a = 0; a < 8; a++) {
        const angle = (a * Math.PI) / 4;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        const x2 = cx + (r + rayLen) * Math.cos(angle);
        const y2 = cy + (r + rayLen) * Math.sin(angle);
        pdf.line(x1, y1, x2, y2);
      }
      break;

    case "car":
    case "garage":
      // Sedan: body + roof + wheels
      pdf.rect(cx - 5, cy - 1, 10, 3, "D"); // body
      // Roof (trapezoid via lines)
      pdf.line(cx - 3, cy - 1, cx - 2, cy - 3);
      pdf.line(cx - 2, cy - 3, cx + 3, cy - 3);
      pdf.line(cx + 3, cy - 3, cx + 4, cy - 1);
      // Wheels
      pdf.circle(cx - 3, cy + 2.5, 1.2, "F");
      pdf.circle(cx + 3, cy + 2.5, 1.2, "F");
      break;

    case "sqft":
      // Square with measurement arrow
      pdf.rect(cx - 4, cy - 3, 8, 6, "D");
      pdf.line(cx - 2, cy + 1, cx + 2, cy - 2);
      pdf.line(cx + 2, cy - 2, cx + 0.5, cy - 1.5);
      pdf.line(cx + 2, cy - 2, cx + 1.5, cy - 0.5);
      break;
  }
}
