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

// ─── Default Template (existing 8 templates) ────────────────────────────────

export function renderDefaultTemplate(ctx: FlyerRenderContext): void {
  const {
    pdf, event, agent, primaryRGB,
    propertyPhotoData, photoWidth, photoHeight,
    mapImageData, mapWidth, mapHeight,
    qrCodeData, headshotData, logoData, logoWidth, logoHeight,
    pageWidth, pageHeight, margin,
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
    pdf.text(`$${event.price.toLocaleString()}`, margin, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 10;
  }

  // Property stats
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  const stats = [];
  if (event.beds) stats.push(`${event.beds} Beds`);
  if (event.baths) stats.push(`${event.baths} Baths`);
  if (event.sqft) stats.push(`${event.sqft.toLocaleString()} sqft`);
  if (stats.length > 0) {
    pdf.text(stats.join(" \u2022 "), margin, yPos);
    yPos += 10;
  }

  // Listing Description
  if (event.listing_description) {
    yPos += 5;
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(event.listing_description, pageWidth - margin * 2);
    const descriptionHeight = lines.length * 5;
    if (needsNewPage(yPos, descriptionHeight + 10)) {
      yPos = addNewPage();
    }
    pdf.text(lines, margin, yPos);
    yPos += descriptionHeight + 5;
  }

  // Key Features with QR Code
  if (event.key_features && event.key_features.length > 0) {
    yPos += 5;
    const qrSize = 35;
    const qrGap = 10;
    const textWidth = qrCodeData
      ? pageWidth - margin * 2 - qrSize - qrGap
      : pageWidth - margin * 2;
    let estimatedFeaturesHeight = 12;
    event.key_features.forEach((feature: string) => {
      const lines = pdf.splitTextToSize(`\u2022 ${feature}`, textWidth);
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
      const lines = pdf.splitTextToSize(`\u2022 ${feature}`, textWidth);
      pdf.text(lines, margin + 5, yPos);
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
    Math.min(255, primaryRGB.b + 180)
  );
  pdf.roundedRect(margin, yPos, pageWidth - margin * 2, bannerHeight, 3, 3, "FD");

  pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);
  const openHouseText = `OPEN HOUSE: ${startDate.toLocaleDateString()} \u2022 ${startDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${endDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
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
  if (agent?.brokerage_name) {
    pdf.text(agent.brokerage_name, textStartX, textY);
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
  const disclaimer = "Information deemed reliable but not guaranteed. All measurements and information should be independently verified.";
  const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - margin * 2);
  pdf.text(disclaimerLines, margin, yPos);
}

// ─── Modern Blue Template ────────────────────────────────────────────────────

export function renderModernBlueTemplate(ctx: FlyerRenderContext): void {
  const {
    pdf, event, agent, primaryRGB, secondaryRGB,
    propertyPhotoData, photoWidth, photoHeight,
    secondaryPhotoData, secondaryPhotoWidth, secondaryPhotoHeight,
    qrCodeData, headshotData, headshotWidth, headshotHeight,
    logoData, logoWidth, logoHeight,
    pageWidth, pageHeight, margin,
  } = ctx;

  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // --- A. Blue header bar (0–22mm) ---
  pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.rect(0, 0, pageWidth, 22, "F");

  let logoRightEdge = margin;
  if (logoData) {
    const logoH = 16;
    const logoW = Math.min((logoWidth / logoHeight) * logoH, 40);
    try {
      pdf.addImage(logoData, "PNG", margin, 3, logoW, logoH, undefined, "FAST");
      logoRightEdge = margin + logoW + 5;
    } catch (error) {
      console.error("Failed to add logo:", error);
    }
  }

  if (agent?.brokerage_name) {
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(agent.brokerage_name, logoRightEdge, 12);
  }

  // --- B. "OPEN HOUSE" title (25–38mm) ---
  y = 35;
  pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text("OPEN HOUSE", pageWidth / 2, y, { align: "center" });

  // Accent underline
  pdf.setDrawColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
  pdf.setLineWidth(0.8);
  pdf.line(pageWidth / 2 - 20, y + 3, pageWidth / 2 + 20, y + 3);

  // --- C. Hero property image (42–122mm) ---
  y = 42;
  const heroMaxH = 80;
  if (propertyPhotoData) {
    const aspect = photoWidth / photoHeight;
    let imgW = contentWidth;
    let imgH = imgW / aspect;
    if (imgH > heroMaxH) {
      imgH = heroMaxH;
      imgW = imgH * aspect;
    }
    const imgX = margin + (contentWidth - imgW) / 2;
    try {
      pdf.addImage(propertyPhotoData, "JPEG", imgX, y, imgW, imgH, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add hero image:", error);
    }

    // Price badge overlay
    if (event.price) {
      const badgeW = 52;
      const badgeH = 11;
      const bx = imgX + imgW - badgeW - 3;
      const by = y + imgH - badgeH - 3;
      pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
      pdf.roundedRect(bx, by, badgeW, badgeH, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(`$${Number(event.price).toLocaleString()}`, bx + badgeW - 3, by + 8, { align: "right" });
    }
    y += imgH + 4;
  } else {
    // Placeholder
    pdf.setFillColor(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b);
    pdf.rect(margin, y, contentWidth, heroMaxH, "F");
    pdf.setTextColor(150, 150, 150);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.text("Property Photo", pageWidth / 2, y + heroMaxH / 2, { align: "center" });
    pdf.setFontSize(9);
    pdf.text("Recommended: 1200 x 600 px", pageWidth / 2, y + heroMaxH / 2 + 7, { align: "center" });
    y += heroMaxH + 4;
  }

  // --- D. Description + QR code (two-column) ---
  const descQrY = y;
  const descColWidth = qrCodeData ? 120 : contentWidth;
  const qrColWidth = 55;

  // Left column: About the Property
  if (event.listing_description) {
    pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("About the Property", margin, descQrY + 6);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    // Truncate to ~35 words
    const words = event.listing_description.split(/\s+/);
    const truncated = words.slice(0, 35).join(" ") + (words.length > 35 ? "..." : "");
    const lines = pdf.splitTextToSize(truncated, descColWidth);
    pdf.text(lines, margin, descQrY + 14);
    y = descQrY + 14 + lines.length * 4.5 + 6;
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

  y += 4;

  // --- E. Secondary image ---
  const secImgH = 30;
  if (secondaryPhotoData) {
    const aspect = secondaryPhotoWidth / secondaryPhotoHeight;
    let imgW = contentWidth;
    let imgH = imgW / aspect;
    if (imgH > secImgH) {
      imgH = secImgH;
      imgW = imgH * aspect;
    }
    const imgX = margin + (contentWidth - imgW) / 2;
    try {
      pdf.addImage(secondaryPhotoData, "JPEG", imgX, y, imgW, imgH, undefined, "FAST");
    } catch (error) {
      console.error("Failed to add secondary image:", error);
    }
    y += imgH + 4;
  } else {
    // Placeholder for secondary image
    pdf.setFillColor(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b);
    pdf.rect(margin, y, contentWidth, secImgH, "F");
    pdf.setTextColor(150, 150, 150);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Secondary Image", pageWidth / 2, y + secImgH / 2 - 2, { align: "center" });
    pdf.setFontSize(8);
    pdf.text("Recommended: 1200 x 400 px", pageWidth / 2, y + secImgH / 2 + 4, { align: "center" });
    y += secImgH + 4;
  }

  // --- F. Features (2x2 grid, max 4) ---
  if (event.key_features && event.key_features.length > 0) {
    pdf.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Our Property Features", margin, y + 5);
    y += 10;

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    const features = event.key_features.slice(0, 4);
    const colW = contentWidth / 2 - 5;

    for (let i = 0; i < features.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const fx = margin + col * (colW + 10);
      const fy = y + row * 7;

      // Diamond bullet
      pdf.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
      pdf.setFontSize(6);
      pdf.text("\u25C6", fx, fy + 3.5);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.text(features[i], fx + 5, fy + 3.5);
    }

    const rows = Math.ceil(features.length / 2);
    y += rows * 7 + 4;
  }

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
    pdf, event, agent, primaryRGB, secondaryRGB,
    propertyPhotoData, photoWidth, photoHeight,
    secondaryPhotoData, secondaryPhotoWidth, secondaryPhotoHeight,
    tertiaryPhotoData, tertiaryPhotoWidth, tertiaryPhotoHeight,
    qrCodeData, logoData, logoWidth, logoHeight,
    pageWidth, pageHeight, margin,
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
    pdf.text(`$${Number(event.price).toLocaleString()}`, bx + badgeW - 4, by + 9, { align: "right" });
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
  const dateLine = startDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const timeLine = `${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  pdf.text(dateLine, pageWidth - margin, y + 6, { align: "right" });
  pdf.setFontSize(10);
  pdf.text(timeLine, pageWidth - margin, y + 12, { align: "right" });

  y += barH;

  // --- C. Description (122–142mm) ---
  y += 6;
  if (event.listing_description) {
    pdf.setTextColor(60, 60, 60);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    // Truncate to ~20 words
    const words = event.listing_description.split(/\s+/);
    const truncated = words.slice(0, 20).join(" ") + (words.length > 20 ? "..." : "");
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

  const highlights = [
    { value: event.beds?.toString() || "--", label: "Beds", icon: "bed" },
    { value: event.baths?.toString() || "--", label: "Baths", icon: "bath" },
    { value: event.parking_notes || "--", label: "Parking", icon: "car" },
    { value: event.sqft ? Number(event.sqft).toLocaleString() : "--", label: "Sqft", icon: "sqft" },
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
  const disclaimer = "Information deemed reliable but not guaranteed. All measurements and information should be independently verified.";
  const discLines = pdf.splitTextToSize(disclaimer, contentWidth);
  pdf.text(discLines, margin, disclaimerY);
}

// ─── Helper: Draw simple icons for property highlights ───────────────────────

function drawHighlightIcon(
  pdf: jsPDF,
  icon: string,
  cx: number,
  cy: number,
  color: { r: number; g: number; b: number }
): void {
  pdf.setDrawColor(color.r, color.g, color.b);
  pdf.setFillColor(color.r, color.g, color.b);
  pdf.setLineWidth(0.4);

  switch (icon) {
    case "bed":
      // Simple bed: rectangle with headboard
      pdf.rect(cx - 5, cy - 1, 10, 4, "D");
      pdf.rect(cx - 5, cy - 3, 3, 2, "F");
      break;

    case "bath":
      // Simple bathtub: rectangle with rim
      pdf.rect(cx - 5, cy - 1, 10, 3, "D");
      pdf.line(cx - 5, cy - 1, cx - 5, cy - 3);
      pdf.line(cx - 4, cy - 3, cx - 4, cy - 4);
      // Shower drops
      pdf.circle(cx - 2, cy - 4, 0.5, "F");
      pdf.circle(cx, cy - 4, 0.5, "F");
      break;

    case "car":
      // Simple car: body rectangle + two wheels
      pdf.rect(cx - 5, cy - 2, 10, 3, "D");
      pdf.rect(cx - 3, cy - 4, 6, 2, "D");
      pdf.circle(cx - 3, cy + 1.5, 1, "F");
      pdf.circle(cx + 3, cy + 1.5, 1, "F");
      break;

    case "sqft":
      // Square with measurement arrow
      pdf.rect(cx - 4, cy - 3, 8, 6, "D");
      // Diagonal arrow
      pdf.line(cx - 2, cy + 1, cx + 2, cy - 2);
      // Arrow head
      pdf.line(cx + 2, cy - 2, cx + 0.5, cy - 1.5);
      pdf.line(cx + 2, cy - 2, cx + 1.5, cy - 0.5);
      break;
  }
}
