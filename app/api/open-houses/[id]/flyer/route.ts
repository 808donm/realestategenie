import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import jsPDF from "jspdf";
import sizeOf from "image-size";
import QRCode from "qrcode";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();

    // Check authentication FIRST (before querying database with RLS)
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    console.log("Auth user:", user?.id);
    console.log("Auth error:", authError);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please sign in to download the flyer" }, { status: 401 });
    }

    // Get open house event details (RLS will filter by agent_id = auth.uid())
    const { data: event, error } = await supabase
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
        longitude
      `)
      .eq("id", id)
      .single();

    if (error || !event) {
      console.error("Event query error:", error);
      console.error("Event ID:", id);
      console.error("User ID:", user.id);
      console.error("Event data:", event);
      return NextResponse.json({
        error: "Open house not found or you don't have permission to access it",
        details: error?.message,
        eventId: id
      }, { status: 404 });
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("display_name, phone_e164, email, license_number, brokerage_name, photo_url, headshot_url, company_logo_url")
      .eq("id", user.id)
      .single();

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

          // Get image dimensions
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
        // Continue without the photo
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

        // Try multiple static map services in order of preference
        const mapServices = [
          // MapQuest Open Static Map (more reliable)
          `https://www.mapquestapi.com/staticmap/v5/map?center=${event.latitude},${event.longitude}&zoom=${zoom}&size=${mapWidth},${mapHeight}&locations=${event.latitude},${event.longitude}|marker-sm-red`,

          // OpenStreetMap static map service
          `https://staticmap.openstreetmap.de/staticmap.php?center=${event.latitude},${event.longitude}&zoom=${zoom}&size=${mapWidth}x${mapHeight}&maptype=mapnik&markers=${event.latitude},${event.longitude},red-pushpin`,
        ];

        for (const mapUrl of mapServices) {
          try {
            console.log("Trying map service:", mapUrl.split('?')[0]);
            const mapResponse = await fetch(mapUrl, {
              headers: { 'User-Agent': 'RealEstateGenie/1.0' },
              signal: AbortSignal.timeout(15000) // 15 second timeout
            });

            console.log("Map response status:", mapResponse.status);

            if (mapResponse.ok) {
              const contentType = mapResponse.headers.get("content-type");
              console.log("Map content type:", contentType);

              const mapBuffer = await mapResponse.arrayBuffer();
              const mapBufferNode = Buffer.from(mapBuffer);

              console.log("Map buffer size:", mapBufferNode.length);

              // Verify we got an image, not an error page
              if (mapBufferNode.length < 1000) {
                console.warn("Map buffer too small, likely an error response");
                continue;
              }

              // Get actual map dimensions
              try {
                const dimensions = sizeOf(mapBufferNode);
                console.log("Map dimensions:", dimensions);
                if (dimensions.width && dimensions.height) {
                  mapWidth = dimensions.width;
                  mapHeight = dimensions.height;

                  const mapBase64 = mapBufferNode.toString("base64");
                  mapImageData = `data:image/png;base64,${mapBase64}`;
                  console.log("Map image data created successfully, length:", mapImageData.length);
                  break; // Success! Stop trying other services
                }
              } catch (err) {
                console.error("Failed to get map dimensions:", err);
                continue;
              }
            } else {
              console.error("Map fetch failed with status:", mapResponse.status);
            }
          } catch (serviceError) {
            console.error("Error with map service:", serviceError);
            // Try next service
          }
        }

        if (!mapImageData) {
          console.error("All map services failed");
        }
      } catch (error) {
        console.error("Failed to fetch map image:", error);
        // Continue without the map
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
      // Continue without QR code
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

          // Get image dimensions
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
        // Continue without headshot
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

          // Get image dimensions
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
        // Continue without logo
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

    // Header - Property Address
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text(event.address, margin, 25);

    let yPos = 35;

    // Property Photo and Map
    const hasPhoto = !!propertyPhotoData;
    const hasMap = !!mapImageData;

    if (hasPhoto || hasMap) {
      try {
        const maxContentWidth = pageWidth - (margin * 2);
        const maxHeight = 70; // Maximum height in mm
        const gap = 5; // Gap between photo and map

        if (hasPhoto && hasMap) {
          // Both photo and map - show side by side
          const itemWidth = (maxContentWidth - gap) / 2;

          // Property Photo (left side)
          const photoAspect = photoWidth / photoHeight;
          let scaledPhotoWidth = itemWidth;
          let scaledPhotoHeight = scaledPhotoWidth / photoAspect;
          if (scaledPhotoHeight > maxHeight) {
            scaledPhotoHeight = maxHeight;
            scaledPhotoWidth = scaledPhotoHeight * photoAspect;
          }
          const photoX = margin + (itemWidth - scaledPhotoWidth) / 2;
          pdf.addImage(propertyPhotoData!, "JPEG", photoX, yPos, scaledPhotoWidth, scaledPhotoHeight, undefined, "FAST");

          // Map (right side)
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
          // Only photo - full width
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
          // Only map - full width
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
        // Continue without the images
      }
    }

    // Property Details Box
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    if (event.price) {
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 100, 0);
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
      pdf.text(stats.join(" • "), margin, yPos);
      yPos += 10;
    }

    // Listing Description
    if (event.listing_description) {
      yPos += 5;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      const lines = pdf.splitTextToSize(event.listing_description, pageWidth - (margin * 2));
      pdf.text(lines, margin, yPos);
      yPos += (lines.length * 5) + 5;
    }

    // Key Features with QR Code
    if (event.key_features && event.key_features.length > 0) {
      yPos += 5;
      const featuresStartY = yPos;
      const qrSize = 35; // QR code size in mm
      const qrGap = 10; // Gap between text and QR code
      const textWidth = qrCodeData ? (pageWidth - (margin * 2) - qrSize - qrGap) : (pageWidth - (margin * 2));

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Key Features:", margin, yPos);
      yPos += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      event.key_features.forEach((feature: string) => {
        const lines = pdf.splitTextToSize(`• ${feature}`, textWidth);
        pdf.text(lines, margin + 5, yPos);
        yPos += lines.length * 5;
      });

      // Add QR code on the right side if available
      if (qrCodeData) {
        const qrX = margin + textWidth + qrGap;
        const qrY = featuresStartY;
        pdf.addImage(qrCodeData, "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST");

        // Add label under QR code
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        const labelY = qrY + qrSize + 3;
        pdf.text("Scan to Check In", qrX + (qrSize / 2), labelY, { align: "center" });
      }
    } else if (qrCodeData) {
      // No features, but we have QR code - show it centered
      yPos += 5;
      const qrSize = 35;
      const qrX = margin + ((pageWidth - (margin * 2) - qrSize) / 2);
      pdf.addImage(qrCodeData, "PNG", qrX, yPos, qrSize, qrSize, undefined, "FAST");

      // Add label under QR code
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      const labelY = yPos + qrSize + 3;
      pdf.text("Scan to Check In", qrX + (qrSize / 2), labelY, { align: "center" });

      yPos += qrSize + 8;
    }

    // Open House Information - Compact Banner
    yPos += 8;

    // Calculate footer height (need to reserve space)
    const footerHeight = 50; // Total space needed for footer
    const footerStartY = pageHeight - footerHeight;
    const bannerHeight = 18;

    // Check if banner would overlap footer - if so, skip banner or adjust
    if (yPos + bannerHeight + 10 < footerStartY) {
      // Safe to draw banner
      pdf.setDrawColor(0, 0, 255);
      pdf.setFillColor(230, 240, 255);
      pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), bannerHeight, 3, 3, "FD");

      // Open house text on one line
      pdf.setTextColor(0, 0, 150);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      const startDate = new Date(event.start_at);
      const endDate = new Date(event.end_at);
      const openHouseText = `OPEN HOUSE: ${startDate.toLocaleDateString()} • ${startDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })} - ${endDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
      pdf.text(openHouseText, margin + 5, yPos + 11);
      pdf.setTextColor(0, 0, 0);
    }

    // Agent Information (Bottom) - always at fixed position
    yPos = footerStartY;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 8;

    // Layout: Headshot (left) | Agent Info (middle) | Company Logo (right)
    const agentSectionHeight = 40;
    const headshotSize = 25; // mm
    const logoMaxWidth = 40; // mm
    const logoMaxHeight = 20; // mm
    let textStartX = margin;

    // Add agent headshot (left)
    if (headshotData) {
      try {
        pdf.addImage(headshotData, "JPEG", margin, yPos, headshotSize, headshotSize, undefined, "FAST");
        textStartX = margin + headshotSize + 5; // Add gap after headshot
      } catch (error) {
        console.error("Failed to add headshot to PDF:", error);
      }
    }

    // Add company logo (right side)
    if (logoData) {
      try {
        // Scale logo to fit within max dimensions while maintaining aspect ratio
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

    // Agent text information (middle)
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

    // Disclaimer (Bottom)
    yPos = pageHeight - 15;
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(100, 100, 100);
    const disclaimer = "Information deemed reliable but not guaranteed. All measurements and information should be independently verified.";
    const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - (margin * 2));
    pdf.text(disclaimerLines, margin, yPos);

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
