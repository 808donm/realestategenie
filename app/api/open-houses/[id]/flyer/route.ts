import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import sizeOf from "image-size";
import QRCode from "qrcode";
import { DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings } from "@/lib/flyer-templates";

// Use admin client to bypass RLS - flyer is public for anyone with the link
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Helper: parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// Helper: lighten a color for backgrounds
function lightenColor(hex: string, amount: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [
    Math.min(255, r + Math.round((255 - r) * amount)),
    Math.min(255, g + Math.round((255 - g) * amount)),
    Math.min(255, b + Math.round((255 - b) * amount)),
  ];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get open house event details using admin client (bypasses RLS)
    const { data: event, error } = await admin
      .from("open_house_events")
      .select(`
        id,
        address,
        start_at,
        end_at,
        beds,
        baths,
        sqft,
        price,
        key_features,
        listing_description,
        property_photo_url,
        latitude,
        longitude,
        agent_id,
        status
      `)
      .eq("id", id)
      .single();

    if (error || !event) {
      console.error("Event query error:", error);
      return NextResponse.json({
        error: "Open house not found",
        details: error?.message,
        eventId: id
      }, { status: 404 });
    }

    // Only allow downloading flyers for published events
    if (event.status !== 'published') {
      return NextResponse.json({
        error: "This open house is not published yet",
      }, { status: 403 });
    }

    // Get agent details using admin client
    const { data: agent } = await admin
      .from("agents")
      .select("display_name, phone_e164, email, license_number, brokerage_name, photo_url, headshot_url, company_logo_url")
      .eq("id", event.agent_id)
      .single();

    // Get agent's template settings
    const { data: templateSettingsRow } = await admin
      .from("flyer_template_settings")
      .select("*")
      .eq("agent_id", event.agent_id)
      .single();

    const tpl: TemplateSettings = templateSettingsRow || DEFAULT_TEMPLATE_SETTINGS;
    const [primaryR, primaryG, primaryB] = hexToRgb(tpl.primary_color);
    const [secondaryR, secondaryG, secondaryB] = hexToRgb(tpl.secondary_color);
    const [lightR, lightG, lightB] = lightenColor(tpl.primary_color, 0.85);

    // Fetch property photo if available
    let propertyPhotoData: string | null = null;
    let photoWidth = 800;
    let photoHeight = 600;
    if (event.property_photo_url) {
      try {
        const photoResponse = await fetch(event.property_photo_url);
        if (photoResponse.ok) {
          const photoBuffer = await photoResponse.arrayBuffer();
          const photoBufferNode = Buffer.from(photoBuffer);
          try {
            const dimensions = sizeOf(photoBufferNode);
            if (dimensions.width && dimensions.height) {
              photoWidth = dimensions.width;
              photoHeight = dimensions.height;
            }
          } catch (err) {
            console.error("Failed to get photo dimensions:", err);
          }
          const photoBase64 = photoBufferNode.toString("base64");
          const contentType = photoResponse.headers.get("content-type") || "image/jpeg";
          propertyPhotoData = `data:${contentType};base64,${photoBase64}`;
        }
      } catch (error) {
        console.error("Failed to fetch property photo:", error);
      }
    }

    // Fetch static map if coordinates available
    let mapImageData: string | null = null;
    let mapWidth = 400;
    let mapHeight = 300;
    if (event.latitude && event.longitude) {
      try {
        const zoom = 15;
        mapWidth = 600;
        mapHeight = 400;
        const mapServices = [
          `https://www.mapquestapi.com/staticmap/v5/map?center=${event.latitude},${event.longitude}&zoom=${zoom}&size=${mapWidth},${mapHeight}&locations=${event.latitude},${event.longitude}|marker-sm-red`,
          `https://staticmap.openstreetmap.de/staticmap.php?center=${event.latitude},${event.longitude}&zoom=${zoom}&size=${mapWidth}x${mapHeight}&maptype=mapnik&markers=${event.latitude},${event.longitude},red-pushpin`,
        ];

        for (const mapUrl of mapServices) {
          try {
            const mapResponse = await fetch(mapUrl, {
              headers: { 'User-Agent': 'RealEstateGenie/1.0' },
              signal: AbortSignal.timeout(15000)
            });
            if (mapResponse.ok) {
              const mapBuffer = await mapResponse.arrayBuffer();
              const mapBufferNode = Buffer.from(mapBuffer);
              if (mapBufferNode.length < 1000) continue;
              try {
                const dimensions = sizeOf(mapBufferNode);
                if (dimensions.width && dimensions.height) {
                  mapWidth = dimensions.width;
                  mapHeight = dimensions.height;
                  const mapBase64 = mapBufferNode.toString("base64");
                  mapImageData = `data:image/png;base64,${mapBase64}`;
                  break;
                }
              } catch (err) {
                continue;
              }
            }
          } catch (serviceError) {
            continue;
          }
        }
      } catch (error) {
        console.error("Failed to fetch map image:", error);
      }
    }

    // Generate QR code for check-in
    let qrCodeData: string | null = null;
    try {
      const origin = request.headers.get("origin") || request.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";
      const checkInUrl = `${origin}/oh/${id}`;
      qrCodeData = await QRCode.toDataURL(checkInUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        scale: 8,
        width: 200,
      });
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }

    // Fetch agent headshot if available
    let headshotData: string | null = null;
    let headshotWidth = 150;
    let headshotHeight = 150;
    if (agent?.headshot_url) {
      try {
        const headshotResponse = await fetch(agent.headshot_url);
        if (headshotResponse.ok) {
          const headshotBuffer = await headshotResponse.arrayBuffer();
          const headshotBufferNode = Buffer.from(headshotBuffer);
          try {
            const dimensions = sizeOf(headshotBufferNode);
            if (dimensions.width && dimensions.height) {
              headshotWidth = dimensions.width;
              headshotHeight = dimensions.height;
            }
          } catch (err) {
            console.error("Failed to get headshot dimensions:", err);
          }
          const headshotBase64 = headshotBufferNode.toString("base64");
          const contentType = headshotResponse.headers.get("content-type") || "image/jpeg";
          headshotData = `data:${contentType};base64,${headshotBase64}`;
        }
      } catch (error) {
        console.error("Failed to fetch headshot:", error);
      }
    }

    // Fetch company logo if available
    let logoData: string | null = null;
    let logoWidth = 200;
    let logoHeight = 100;
    if (agent?.company_logo_url) {
      try {
        const logoResponse = await fetch(agent.company_logo_url);
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          const logoBufferNode = Buffer.from(logoBuffer);
          try {
            const dimensions = sizeOf(logoBufferNode);
            if (dimensions.width && dimensions.height) {
              logoWidth = dimensions.width;
              logoHeight = dimensions.height;
            }
          } catch (err) {
            console.error("Failed to get logo dimensions:", err);
          }
          const logoBase64 = logoBufferNode.toString("base64");
          const contentType = logoResponse.headers.get("content-type") || "image/png";
          logoData = `data:${contentType};base64,${logoBase64}`;
        }
      } catch (error) {
        console.error("Failed to fetch logo:", error);
      }
    }

    // Generate PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // Helper: add an image scaled to a max region
    const addScaledImage = (
      data: string,
      format: string,
      x: number,
      y: number,
      maxW: number,
      maxH: number,
      imgW: number,
      imgH: number
    ): { w: number; h: number } => {
      const aspect = imgW / imgH;
      let w = maxW;
      let h = w / aspect;
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }
      const offsetX = x + (maxW - w) / 2;
      pdf.addImage(data, format, offsetX, y, w, h, undefined, "FAST");
      return { w, h };
    };

    // Helper: draw the property stats line
    const drawStats = (x: number, y: number, textColor: [number, number, number]) => {
      pdf.setTextColor(...textColor);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      const stats = [];
      if (event.beds) stats.push(`${event.beds} Beds`);
      if (event.baths) stats.push(`${event.baths} Baths`);
      if (event.sqft) stats.push(`${event.sqft.toLocaleString()} sqft`);
      if (stats.length > 0) {
        pdf.text(stats.join("  |  "), x, y);
      }
    };

    // Open house date/time formatting
    const startDate = new Date(event.start_at);
    const endDate = new Date(event.end_at);
    const dateStr = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = `${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    // ─── RENDER TEMPLATE ───────────────────────────────────────────────
    const templateId = tpl.template_id;

    if (templateId === "modern-living") {
      // ─── Modern Living: Dark navy header, gold accents, cream bg ───
      let yPos = 0;

      // Dark header with "OPEN HOUSE"
      const headerH = 32;
      pdf.setFillColor(primaryR, primaryG, primaryB);
      pdf.rect(0, 0, pageWidth, headerH, "F");

      // Gold decorative lines
      pdf.setDrawColor(secondaryR, secondaryG, secondaryB);
      pdf.setLineWidth(0.5);
      pdf.line(pageWidth / 2 - 20, 10, pageWidth / 2 + 20, 10);
      pdf.line(pageWidth / 2 - 20, 24, pageWidth / 2 + 20, 24);

      // Logo
      if (logoData) {
        addScaledImage(logoData, "PNG", pageWidth / 2 - 15, 3, 30, 6, logoWidth, logoHeight);
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("OPEN HOUSE", pageWidth / 2, 18.5, { align: "center" });

      if (tpl.custom_tagline) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(255, 255, 255);
        pdf.text(tpl.custom_tagline, pageWidth / 2, 28, { align: "center" });
      }

      yPos = headerH + 5;

      // Property photo
      if (propertyPhotoData) {
        const { h } = addScaledImage(propertyPhotoData, "JPEG", margin, yPos, pageWidth - margin * 2, 70, photoWidth, photoHeight);
        yPos += h + 5;
      }

      // Address
      pdf.setTextColor(primaryR, primaryG, primaryB);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(event.address, margin, yPos + 5);
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      const cityLine = event.address.includes(",") ? "" : `Beverly Hills, CA`;
      if (cityLine) {
        pdf.text(cityLine, margin, yPos);
        yPos += 5;
      }

      // Price
      if (event.price) {
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(secondaryR, secondaryG, secondaryB);
        pdf.text(`$${event.price.toLocaleString()}`, margin, yPos + 5);
        yPos += 10;
      }

      // Stats
      drawStats(margin, yPos + 3, [primaryR, primaryG, primaryB]);
      yPos += 8;

      // Description
      if (event.listing_description) {
        yPos += 3;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 60);
        const lines = pdf.splitTextToSize(event.listing_description, pageWidth - margin * 2);
        const maxLines = lines.slice(0, 8);
        pdf.text(maxLines, margin, yPos);
        yPos += maxLines.length * 4.5 + 3;
      }

      // Key Features + QR
      if (event.key_features && event.key_features.length > 0) {
        const qrSize = qrCodeData ? 30 : 0;
        const textWidth = pageWidth - margin * 2 - (qrCodeData ? qrSize + 8 : 0);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(primaryR, primaryG, primaryB);
        pdf.text("Key Features:", margin, yPos);
        yPos += 5;
        const featuresStartY = yPos;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        event.key_features.forEach((feature: string) => {
          const fLines = pdf.splitTextToSize(`• ${feature}`, textWidth);
          pdf.text(fLines, margin + 3, yPos);
          yPos += fLines.length * 4;
        });
        if (qrCodeData) {
          const qrX = pageWidth - margin - qrSize;
          pdf.addImage(qrCodeData, "PNG", qrX, featuresStartY - 5, qrSize, qrSize, undefined, "FAST");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(primaryR, primaryG, primaryB);
          pdf.text("Scan to Check In", qrX + qrSize / 2, featuresStartY + qrSize - 2, { align: "center" });
        }
      }

      // Open house date banner
      yPos += 5;
      const bannerH = 14;
      pdf.setFillColor(lightR, lightG, lightB);
      pdf.roundedRect(margin, yPos, pageWidth - margin * 2, bannerH, 2, 2, "F");
      pdf.setTextColor(primaryR, primaryG, primaryB);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(`OPEN HOUSE: ${dateStr}  •  ${timeStr}`, pageWidth / 2, yPos + 9, { align: "center" });

      // Dark footer with agent info
      const footerH = 30;
      const footerY = pageHeight - footerH;
      pdf.setFillColor(primaryR, primaryG, primaryB);
      pdf.rect(0, footerY, pageWidth, footerH, "F");

      let agentX = margin;
      if (headshotData && tpl.show_agent_photo) {
        const hsSize = 18;
        pdf.addImage(headshotData, "JPEG", margin, footerY + 6, hsSize, hsSize, undefined, "FAST");
        agentX = margin + hsSize + 5;
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(agent?.display_name || "Your Agent", agentX, footerY + 11);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      let contactY = footerY + 16;
      if (agent?.brokerage_name) {
        pdf.text(agent.brokerage_name, agentX, contactY);
        contactY += 4;
      }
      const contactParts = [];
      if (agent?.phone_e164) contactParts.push(agent.phone_e164);
      if (agent?.email) contactParts.push(agent.email);
      if (contactParts.length > 0) {
        pdf.text(contactParts.join("  |  "), agentX, contactY);
      }

      // Company logo in footer
      if (logoData) {
        addScaledImage(logoData, "PNG", pageWidth - margin - 35, footerY + 5, 30, 15, logoWidth, logoHeight);
      }

    } else if (templateId === "blue-horizon") {
      // ─── Blue Horizon: Blue header, hero, light bg details ────
      let yPos = 0;

      // Blue header
      const headerH = 35;
      pdf.setFillColor(primaryR, primaryG, primaryB);
      pdf.rect(0, 0, pageWidth, headerH, "F");

      if (logoData) {
        addScaledImage(logoData, "PNG", pageWidth / 2 - 15, 3, 30, 7, logoWidth, logoHeight);
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text("WELCOME TO OUR", pageWidth / 2, 15, { align: "center" });
      pdf.setFontSize(26);
      pdf.setFont("helvetica", "bold");
      pdf.text("OPEN HOUSE", pageWidth / 2, 26, { align: "center" });

      if (tpl.custom_tagline) {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(tpl.custom_tagline, pageWidth / 2, 31, { align: "center" });
      }

      yPos = headerH;

      // Property photo - full width
      if (propertyPhotoData) {
        const { h } = addScaledImage(propertyPhotoData, "JPEG", 0, yPos, pageWidth, 75, photoWidth, photoHeight);
        yPos += h;
      } else {
        yPos += 5;
      }

      // Light bg details section
      const detailsBgH = 85;
      pdf.setFillColor(secondaryR, secondaryG, secondaryB);
      pdf.rect(0, yPos, pageWidth, detailsBgH, "F");

      yPos += 8;
      pdf.setTextColor(primaryR, primaryG, primaryB);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(event.address, margin, yPos);
      yPos += 7;

      // Price
      if (event.price) {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(`$${event.price.toLocaleString()}`, margin, yPos);
        yPos += 8;
      }

      // Stats
      drawStats(margin, yPos, [primaryR, primaryG, primaryB]);
      yPos += 8;

      // Description
      if (event.listing_description) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 60);
        const lines = pdf.splitTextToSize(event.listing_description, pageWidth - margin * 2);
        pdf.text(lines.slice(0, 6), margin, yPos);
        yPos += Math.min(lines.length, 6) * 4 + 3;
      }

      // Date/time banner
      yPos += 2;
      const bannerH = 14;
      pdf.setFillColor(lightR, lightG, lightB);
      pdf.roundedRect(margin, yPos, pageWidth - margin * 2, bannerH, 2, 2, "F");
      pdf.setTextColor(primaryR, primaryG, primaryB);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${dateStr}  •  ${timeStr}`, pageWidth / 2, yPos + 9, { align: "center" });
      yPos += bannerH + 5;

      // Key features
      if (event.key_features && event.key_features.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(primaryR, primaryG, primaryB);
        pdf.text("Key Features:", margin, yPos);
        yPos += 5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        event.key_features.slice(0, 5).forEach((feature: string) => {
          pdf.text(`• ${feature}`, margin + 3, yPos);
          yPos += 4.5;
        });
      }

      // Footer with agent + QR
      const footerY = pageHeight - 30;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, footerY, pageWidth - margin, footerY);

      let agentX = margin;
      if (headshotData && tpl.show_agent_photo) {
        const hsSize = 18;
        pdf.addImage(headshotData, "JPEG", margin, footerY + 3, hsSize, hsSize, undefined, "FAST");
        agentX = margin + hsSize + 5;
      }

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(agent?.display_name || "Your Agent", agentX, footerY + 9);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      if (agent?.brokerage_name) pdf.text(agent.brokerage_name, agentX, footerY + 14);
      const cParts = [];
      if (agent?.phone_e164) cParts.push(agent.phone_e164);
      if (agent?.email) cParts.push(agent.email);
      if (cParts.length) pdf.text(cParts.join("  |  "), agentX, footerY + 19);

      if (qrCodeData && tpl.show_qr_code) {
        const qrSize = 20;
        pdf.addImage(qrCodeData, "PNG", pageWidth - margin - qrSize, footerY + 2, qrSize, qrSize, undefined, "FAST");
        pdf.setFontSize(6);
        pdf.text("Scan to Check In", pageWidth - margin - qrSize / 2, footerY + 24, { align: "center" });
      }

      if (logoData) {
        addScaledImage(logoData, "PNG", pageWidth - margin - 35 - (qrCodeData && tpl.show_qr_code ? 25 : 0), footerY + 3, 28, 12, logoWidth, logoHeight);
      }

    } else if (templateId === "golden-elegance") {
      // ─── Golden Elegance: Cream bg, gold accents, serif feel ──────
      let yPos = 0;

      // Top gold accent bar
      pdf.setFillColor(secondaryR, secondaryG, secondaryB);
      pdf.rect(0, 0, pageWidth, 3, "F");

      // Cream background
      pdf.setFillColor(253, 248, 240);
      pdf.rect(0, 3, pageWidth, pageHeight - 3, "F");

      yPos = 10;

      if (logoData) {
        addScaledImage(logoData, "PNG", pageWidth / 2 - 15, yPos, 30, 8, logoWidth, logoHeight);
        yPos += 10;
      }

      // Decorative gold lines with diamond
      pdf.setDrawColor(primaryR, primaryG, primaryB);
      pdf.setLineWidth(0.3);
      pdf.line(pageWidth / 2 - 30, yPos, pageWidth / 2 - 5, yPos);
      pdf.line(pageWidth / 2 + 5, yPos, pageWidth / 2 + 30, yPos);
      // Small diamond
      const dX = pageWidth / 2;
      const dY = yPos;
      const dS = 2;
      pdf.setFillColor(primaryR, primaryG, primaryB);
      pdf.triangle(dX, dY - dS, dX + dS, dY, dX, dY + dS, "F");
      pdf.triangle(dX, dY - dS, dX - dS, dY, dX, dY + dS, "F");

      yPos += 6;

      // Title
      pdf.setTextColor(secondaryR, secondaryG, secondaryB);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("YOUR DREAM HOME", pageWidth / 2, yPos, { align: "center" });
      yPos += 7;
      pdf.setTextColor(primaryR, primaryG, primaryB);
      pdf.setFontSize(12);
      pdf.text("AWAITS", pageWidth / 2, yPos, { align: "center" });

      if (tpl.custom_tagline) {
        yPos += 5;
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(tpl.custom_tagline, pageWidth / 2, yPos, { align: "center" });
      }

      // Bottom decorative line
      yPos += 4;
      pdf.setDrawColor(primaryR, primaryG, primaryB);
      pdf.line(pageWidth / 2 - 30, yPos, pageWidth / 2 - 5, yPos);
      pdf.line(pageWidth / 2 + 5, yPos, pageWidth / 2 + 30, yPos);
      const dX2 = pageWidth / 2;
      const dY2 = yPos;
      pdf.setFillColor(primaryR, primaryG, primaryB);
      pdf.triangle(dX2, dY2 - dS, dX2 + dS, dY2, dX2, dY2 + dS, "F");
      pdf.triangle(dX2, dY2 - dS, dX2 - dS, dY2, dX2, dY2 + dS, "F");

      yPos += 8;

      // Property photo(s)
      if (propertyPhotoData) {
        if (mapImageData) {
          // Side by side
          const halfW = (pageWidth - margin * 2 - 5) / 2;
          addScaledImage(propertyPhotoData, "JPEG", margin, yPos, halfW, 60, photoWidth, photoHeight);
          addScaledImage(mapImageData, "PNG", margin + halfW + 5, yPos, halfW, 60, mapWidth, mapHeight);
          yPos += 65;
        } else {
          const { h } = addScaledImage(propertyPhotoData, "JPEG", margin, yPos, pageWidth - margin * 2, 65, photoWidth, photoHeight);
          yPos += h + 5;
        }
      }

      // Address & price centered
      pdf.setTextColor(secondaryR, secondaryG, secondaryB);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(event.address, pageWidth / 2, yPos, { align: "center" });
      yPos += 6;

      if (event.price) {
        pdf.setTextColor(primaryR, primaryG, primaryB);
        pdf.setFontSize(16);
        pdf.text(`$${event.price.toLocaleString()}`, pageWidth / 2, yPos, { align: "center" });
        yPos += 7;
      }

      // Stats centered
      const stats = [];
      if (event.beds) stats.push(`${event.beds} Bed`);
      if (event.baths) stats.push(`${event.baths} Bath`);
      if (event.sqft) stats.push(`${event.sqft.toLocaleString()} Sq Ft`);
      if (stats.length > 0) {
        pdf.setTextColor(secondaryR, secondaryG, secondaryB);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(stats.join("  |  "), pageWidth / 2, yPos, { align: "center" });
        yPos += 6;
      }

      // Description
      if (event.listing_description) {
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        const lines = pdf.splitTextToSize(event.listing_description, pageWidth - margin * 2 - 20);
        pdf.text(lines.slice(0, 5), pageWidth / 2, yPos, { align: "center", maxWidth: pageWidth - margin * 2 - 20 });
        yPos += Math.min(lines.length, 5) * 4 + 3;
      }

      // Open house info
      yPos += 3;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(primaryR, primaryG, primaryB);
      pdf.text(`Open House: ${dateStr}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 5;
      pdf.text(timeStr, pageWidth / 2, yPos, { align: "center" });

      // Footer with agent + QR
      const footerY = pageHeight - 28;
      pdf.setDrawColor(primaryR, primaryG, primaryB);
      pdf.setLineWidth(0.3);
      pdf.line(margin, footerY, pageWidth - margin, footerY);

      let agentX = margin;
      if (headshotData && tpl.show_agent_photo) {
        const hsSize = 16;
        pdf.addImage(headshotData, "JPEG", margin, footerY + 3, hsSize, hsSize, undefined, "FAST");
        agentX = margin + hsSize + 4;
      }

      pdf.setTextColor(secondaryR, secondaryG, secondaryB);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(agent?.display_name || "Your Agent", agentX, footerY + 8);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(primaryR, primaryG, primaryB);
      const parts = [];
      if (agent?.phone_e164) parts.push(agent.phone_e164);
      if (agent?.email) parts.push(agent.email);
      if (parts.length) pdf.text(parts.join("  |  "), agentX, footerY + 13);

      if (qrCodeData && tpl.show_qr_code) {
        const qrSize = 18;
        pdf.addImage(qrCodeData, "PNG", pageWidth - margin - qrSize, footerY + 2, qrSize, qrSize, undefined, "FAST");
        pdf.setFontSize(6);
        pdf.setTextColor(primaryR, primaryG, primaryB);
        pdf.text("Scan for details", pageWidth - margin - qrSize / 2, footerY + 22, { align: "center" });
      }

    } else if (templateId === "warm-welcome") {
      // ─── Warm Welcome: Dark brown split header, warm cream bg ─────
      let yPos = 0;

      // Dark brown header - split layout
      const headerH = 28;
      pdf.setFillColor(primaryR, primaryG, primaryB);
      pdf.rect(0, 0, pageWidth, headerH, "F");

      // Left: Logo + "OPEN HOUSE"
      let leftX = margin;
      if (logoData) {
        addScaledImage(logoData, "PNG", margin, 3, 25, 8, logoWidth, logoHeight);
        leftX = margin;
      }
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("OPEN HOUSE", margin, 18);

      if (tpl.custom_tagline) {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(secondaryR, secondaryG, secondaryB);
        pdf.text(tpl.custom_tagline, margin, 23);
      }

      // Right: Contact info
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(255, 255, 255);
      let rightY = 10;
      if (agent?.phone_e164) {
        pdf.text(agent.phone_e164, pageWidth - margin, rightY, { align: "right" });
        rightY += 4;
      }
      if (agent?.email) {
        pdf.text(agent.email, pageWidth - margin, rightY, { align: "right" });
        rightY += 4;
      }

      // Cream background
      pdf.setFillColor(250, 245, 240);
      pdf.rect(0, headerH, pageWidth, pageHeight - headerH, "F");

      yPos = headerH + 5;

      // Property photo
      if (propertyPhotoData) {
        const { h } = addScaledImage(propertyPhotoData, "JPEG", margin, yPos, pageWidth - margin * 2, 70, photoWidth, photoHeight);
        yPos += h + 5;
      }

      // Address
      pdf.setTextColor(primaryR, primaryG, primaryB);
      pdf.setFontSize(17);
      pdf.setFont("helvetica", "bold");
      pdf.text(event.address, margin, yPos + 3);
      yPos += 8;

      // Price
      if (event.price) {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(`$${event.price.toLocaleString()}`, margin, yPos);
        yPos += 8;
      }

      // Stats
      drawStats(margin, yPos, [secondaryR, secondaryG, secondaryB]);
      yPos += 8;

      // Description
      if (event.listing_description) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(60, 60, 60);
        const lines = pdf.splitTextToSize(event.listing_description, pageWidth - margin * 2);
        pdf.text(lines.slice(0, 6), margin, yPos);
        yPos += Math.min(lines.length, 6) * 4 + 3;
      }

      // Key features
      if (event.key_features && event.key_features.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(primaryR, primaryG, primaryB);
        pdf.text("Key Features:", margin, yPos);
        yPos += 5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        event.key_features.slice(0, 5).forEach((feature: string) => {
          pdf.text(`• ${feature}`, margin + 3, yPos);
          yPos += 4.5;
        });
      }

      // Date/time banner in secondary color
      yPos += 3;
      const bannerH = 12;
      pdf.setFillColor(secondaryR, secondaryG, secondaryB);
      pdf.roundedRect(margin, yPos, pageWidth - margin * 2, bannerH, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${dateStr}  |  ${timeStr}`, pageWidth / 2, yPos + 8, { align: "center" });

      // Dark brown footer - agent prominent
      const footerH = 28;
      const footerY = pageHeight - footerH;
      pdf.setFillColor(primaryR, primaryG, primaryB);
      pdf.rect(0, footerY, pageWidth, footerH, "F");

      let agentX = margin;
      if (headshotData && tpl.show_agent_photo) {
        const hsSize = 20;
        // Draw border circle effect
        pdf.setDrawColor(secondaryR, secondaryG, secondaryB);
        pdf.setLineWidth(0.8);
        pdf.circle(margin + hsSize / 2, footerY + 4 + hsSize / 2, hsSize / 2 + 1);
        pdf.addImage(headshotData, "JPEG", margin, footerY + 4, hsSize, hsSize, undefined, "FAST");
        agentX = margin + hsSize + 5;
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(agent?.display_name || "Your Agent", agentX, footerY + 10);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      if (agent?.brokerage_name) pdf.text(agent.brokerage_name, agentX, footerY + 15);
      const contactLine = [];
      if (agent?.phone_e164) contactLine.push(agent.phone_e164);
      if (agent?.email) contactLine.push(agent.email);
      if (contactLine.length) {
        pdf.setTextColor(200, 200, 200);
        pdf.text(contactLine.join("  |  "), agentX, footerY + 20);
      }

      if (logoData) {
        addScaledImage(logoData, "PNG", pageWidth - margin - 30, footerY + 5, 25, 12, logoWidth, logoHeight);
      }

      if (qrCodeData) {
        const qrSize = 18;
        pdf.addImage(qrCodeData, "PNG", pageWidth - margin - qrSize - (logoData ? 32 : 0), footerY + 4, qrSize, qrSize, undefined, "FAST");
      }

    } else if (templateId === "bold-statement") {
      // ─── Bold Statement: Dark bg, coral accents, dot patterns, grid ──
      let yPos = 0;

      // Full dark background
      pdf.setFillColor(primaryR, primaryG, primaryB);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      // Decorative dot patterns in corners
      const dotSize = 1.2;
      const dotGap = 3.5;
      const dotRows = 5;
      const dotCols = 5;
      pdf.setFillColor(secondaryR, secondaryG, secondaryB);

      // Top-left dots
      for (let r = 0; r < dotRows; r++) {
        for (let c = 0; c < dotCols; c++) {
          pdf.circle(margin / 2 + c * dotGap, 8 + r * dotGap, dotSize / 2, "F");
        }
      }
      // Top-right dots
      for (let r = 0; r < dotRows; r++) {
        for (let c = 0; c < dotCols; c++) {
          pdf.circle(pageWidth - margin / 2 - c * dotGap, 8 + r * dotGap, dotSize / 2, "F");
        }
      }

      // Header text
      yPos = 15;
      if (logoData) {
        addScaledImage(logoData, "PNG", margin + 20, yPos - 5, 25, 8, logoWidth, logoHeight);
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text("HOUSE", margin + 20, yPos + 5);
      pdf.setTextColor(secondaryR, secondaryG, secondaryB);
      pdf.setFontSize(18);
      pdf.text("FOR SALE", margin + 20, yPos + 13);

      if (tpl.custom_tagline) {
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "normal");
        pdf.text(tpl.custom_tagline, margin + 20, yPos + 18);
      }

      yPos = 40;

      // Property photo(s) - grid style
      if (propertyPhotoData) {
        if (mapImageData) {
          // Main photo larger, map smaller
          const mainW = (pageWidth - margin * 2 - 3) * 0.65;
          const sideW = (pageWidth - margin * 2 - 3) * 0.35;
          addScaledImage(propertyPhotoData, "JPEG", margin, yPos, mainW, 65, photoWidth, photoHeight);
          addScaledImage(mapImageData, "PNG", margin + mainW + 3, yPos, sideW, 65, mapWidth, mapHeight);
          yPos += 70;
        } else {
          const { h } = addScaledImage(propertyPhotoData, "JPEG", margin, yPos, pageWidth - margin * 2, 70, photoWidth, photoHeight);
          yPos += h + 5;
        }
      }

      // Address
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(17);
      pdf.setFont("helvetica", "bold");
      pdf.text(event.address, margin, yPos + 3);
      yPos += 8;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(200, 200, 200);

      // Price
      if (event.price) {
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(secondaryR, secondaryG, secondaryB);
        pdf.text(`$${event.price.toLocaleString()}`, margin, yPos + 2);
        yPos += 10;
      }

      // Stats with accent color
      const statsArr = [];
      if (event.beds) statsArr.push(`${event.beds} Bed`);
      if (event.baths) statsArr.push(`${event.baths} Bath`);
      if (event.sqft) statsArr.push(`${event.sqft.toLocaleString()} Sq Ft`);
      if (statsArr.length) {
        pdf.setTextColor(200, 200, 200);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.text(statsArr.join("  |  "), margin, yPos);
        yPos += 7;
      }

      // Description
      if (event.listing_description) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(180, 180, 180);
        const lines = pdf.splitTextToSize(event.listing_description, pageWidth - margin * 2);
        pdf.text(lines.slice(0, 5), margin, yPos);
        yPos += Math.min(lines.length, 5) * 4 + 3;
      }

      // Key features
      if (event.key_features && event.key_features.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(secondaryR, secondaryG, secondaryB);
        pdf.text("Key Features:", margin, yPos);
        yPos += 5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(200, 200, 200);
        event.key_features.slice(0, 4).forEach((feature: string) => {
          pdf.text(`• ${feature}`, margin + 3, yPos);
          yPos += 4.5;
        });
      }

      // Open house date
      yPos += 3;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(secondaryR, secondaryG, secondaryB);
      pdf.text(`OPEN HOUSE: ${dateStr}  •  ${timeStr}`, margin, yPos);

      // Footer on accent color
      const footerH = 25;
      const footerY = pageHeight - footerH;
      pdf.setFillColor(secondaryR, secondaryG, secondaryB);
      pdf.rect(0, footerY, pageWidth, footerH, "F");

      let agentX = margin;
      if (headshotData && tpl.show_agent_photo) {
        const hsSize = 17;
        pdf.addImage(headshotData, "JPEG", margin, footerY + 4, hsSize, hsSize, undefined, "FAST");
        agentX = margin + hsSize + 5;
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(agent?.display_name || "Your Agent", agentX, footerY + 10);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      if (agent?.brokerage_name) pdf.text(agent.brokerage_name, agentX, footerY + 15);
      const bContactParts = [];
      if (agent?.phone_e164) bContactParts.push(agent.phone_e164);
      if (agent?.email) bContactParts.push(agent.email);
      if (bContactParts.length) pdf.text(bContactParts.join("  |  "), agentX, footerY + 20);

      if (logoData) {
        addScaledImage(logoData, "PNG", pageWidth - margin - 30, footerY + 4, 25, 12, logoWidth, logoHeight);
      }

    } else {
      // ─── Default/Generic Template (fallback) ─────────────────────
      const footerHeight = 50;
      const maxContentY = pageHeight - footerHeight - 10;
      let yPos = 25;

      const needsNewPage = (currentY: number, requiredSpace: number): boolean => {
        return currentY + requiredSpace > maxContentY;
      };

      const addNewPage = (): number => {
        pdf.addPage();
        return margin + 10;
      };

      // Header
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text(event.address, margin, yPos);
      yPos = 35;

      // Property photo + map
      if (propertyPhotoData || mapImageData) {
        const maxContentWidth = pageWidth - margin * 2;
        const maxH = 70;
        const gap = 5;

        if (propertyPhotoData && mapImageData) {
          const itemWidth = (maxContentWidth - gap) / 2;
          addScaledImage(propertyPhotoData, "JPEG", margin, yPos, itemWidth, maxH, photoWidth, photoHeight);
          addScaledImage(mapImageData, "PNG", margin + itemWidth + gap, yPos, itemWidth, maxH, mapWidth, mapHeight);
          yPos += maxH + 10;
        } else if (propertyPhotoData) {
          const { h } = addScaledImage(propertyPhotoData, "JPEG", margin, yPos, maxContentWidth, maxH, photoWidth, photoHeight);
          yPos += h + 10;
        } else if (mapImageData) {
          const { h } = addScaledImage(mapImageData, "PNG", margin, yPos, maxContentWidth, maxH, mapWidth, mapHeight);
          yPos += h + 10;
        }
      }

      // Price
      if (event.price) {
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 100, 0);
        pdf.text(`$${event.price.toLocaleString()}`, margin, yPos);
        pdf.setTextColor(0, 0, 0);
        yPos += 10;
      }

      // Stats
      drawStats(margin, yPos, [0, 0, 0]);
      yPos += 10;

      // Description
      if (event.listing_description) {
        yPos += 5;
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);
        const lines = pdf.splitTextToSize(event.listing_description, pageWidth - margin * 2);
        const descriptionHeight = lines.length * 5;
        if (needsNewPage(yPos, descriptionHeight + 10)) {
          yPos = addNewPage();
        }
        pdf.text(lines, margin, yPos);
        yPos += descriptionHeight + 5;
      }

      // Key Features + QR
      if (event.key_features && event.key_features.length > 0) {
        yPos += 5;
        const qrSize = 35;
        const qrGap = 10;
        const textWidth = qrCodeData ? (pageWidth - margin * 2 - qrSize - qrGap) : (pageWidth - margin * 2);
        let estimatedHeight = 12;
        event.key_features.forEach((feature: string) => {
          const fLines = pdf.splitTextToSize(`• ${feature}`, textWidth);
          estimatedHeight += fLines.length * 5;
        });
        if (needsNewPage(yPos, estimatedHeight + 15)) {
          yPos = addNewPage();
        }
        const featuresStartY = yPos;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        pdf.text("Key Features:", margin, yPos);
        yPos += 7;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        event.key_features.forEach((feature: string) => {
          const fLines = pdf.splitTextToSize(`• ${feature}`, textWidth);
          pdf.text(fLines, margin + 5, yPos);
          yPos += fLines.length * 5;
        });
        if (qrCodeData) {
          const qrX = margin + textWidth + qrGap;
          pdf.addImage(qrCodeData, "PNG", qrX, featuresStartY, qrSize, qrSize, undefined, "FAST");
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "bold");
          pdf.text("Scan to Check In", qrX + qrSize / 2, featuresStartY + qrSize + 3, { align: "center" });
        }
      }

      // Open house banner
      yPos += 8;
      const bannerHeight = 18;
      if (needsNewPage(yPos, bannerHeight + 10)) {
        yPos = addNewPage();
      }
      pdf.setDrawColor(0, 0, 255);
      pdf.setFillColor(230, 240, 255);
      pdf.roundedRect(margin, yPos, pageWidth - margin * 2, bannerHeight, 3, 3, "FD");
      pdf.setTextColor(0, 0, 150);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(`OPEN HOUSE: ${dateStr}  •  ${timeStr}`, margin + 5, yPos + 11);
      pdf.setTextColor(0, 0, 0);

      // Agent info footer
      const footerStartY = pageHeight - footerHeight;
      yPos = footerStartY;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      let textStartX = margin;
      if (headshotData) {
        const headshotSize = 25;
        pdf.addImage(headshotData, "JPEG", margin, yPos, headshotSize, headshotSize, undefined, "FAST");
        textStartX = margin + headshotSize + 5;
      }
      if (logoData) {
        addScaledImage(logoData, "PNG", pageWidth - margin - 40, yPos, 40, 20, logoWidth, logoHeight);
      }

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text(agent?.display_name || "Your Agent", textStartX, yPos + 5);
      let textY = yPos + 11;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      if (agent?.brokerage_name) { pdf.text(agent.brokerage_name, textStartX, textY); textY += 5; }
      if (agent?.phone_e164) { pdf.text(`Phone: ${agent.phone_e164}`, textStartX, textY); textY += 5; }
      if (agent?.email) { pdf.text(`Email: ${agent.email}`, textStartX, textY); textY += 5; }
      if (agent?.license_number) { pdf.text(`License: ${agent.license_number}`, textStartX, textY); }
    }

    // Disclaimer (all templates)
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(150, 150, 150);
    const disclaimer = "Information deemed reliable but not guaranteed. All measurements and information should be independently verified.";
    const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - margin * 2);
    pdf.text(disclaimerLines, margin, pageHeight - 5);

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="open-house-${event.address.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error.message },
      { status: 500 }
    );
  }
}
