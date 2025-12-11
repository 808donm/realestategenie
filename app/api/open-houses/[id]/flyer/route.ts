import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import jsPDF from "jspdf";
import sizeOf from "image-size";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();

    // Get open house event details
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
      return NextResponse.json({ error: "Open house not found" }, { status: 404 });
    }

    // Get agent details
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("display_name, phone_e164, email, license_number, brokerage_name, photo_url")
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
        // Use OpenStreetMap static map via geoapify or similar service
        // Using a simple tile-based approach with OpenStreetMap
        const zoom = 15;
        mapWidth = 400;
        mapHeight = 300;

        // Using staticmap.openstreetmap.de service (free OSM static maps)
        const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${event.latitude},${event.longitude}&zoom=${zoom}&size=${mapWidth}x${mapHeight}&maptype=mapnik&markers=${event.latitude},${event.longitude},red-pushpin`;

        const mapResponse = await fetch(mapUrl);
        if (mapResponse.ok) {
          const mapBuffer = await mapResponse.arrayBuffer();
          const mapBufferNode = Buffer.from(mapBuffer);

          // Get actual map dimensions
          try {
            const dimensions = sizeOf(mapBufferNode);
            if (dimensions.width && dimensions.height) {
              mapWidth = dimensions.width;
              mapHeight = dimensions.height;
            }
          } catch (err) {
            console.error("Failed to get map dimensions:", err);
          }

          const mapBase64 = mapBufferNode.toString("base64");
          mapImageData = `data:image/png;base64,${mapBase64}`;
        }
      } catch (error) {
        console.error("Failed to fetch map image:", error);
        // Continue without the map
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

    // Key Features
    if (event.key_features && event.key_features.length > 0) {
      yPos += 5;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Key Features:", margin, yPos);
      yPos += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      event.key_features.forEach((feature: string) => {
        pdf.text(`• ${feature}`, margin + 5, yPos);
        yPos += 5;
      });
    }

    // Open House Information Box
    yPos += 10;
    pdf.setDrawColor(0, 0, 255);
    pdf.setFillColor(230, 240, 255);
    pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, "FD");

    yPos += 8;
    pdf.setTextColor(0, 0, 150);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("OPEN HOUSE", margin + 5, yPos);

    yPos += 8;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    const startDate = new Date(event.start_at);
    const endDate = new Date(event.end_at);
    const openHouseText = `${startDate.toLocaleDateString()} • ${startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })} - ${endDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
    pdf.text(openHouseText, margin + 5, yPos);

    // Agent Information (Bottom)
    yPos = pageHeight - 50;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 8;
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(agent?.display_name || "Your Agent", margin, yPos);

    yPos += 6;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    if (agent?.brokerage_name) {
      pdf.text(agent.brokerage_name, margin, yPos);
      yPos += 5;
    }
    if (agent?.phone_e164) {
      pdf.text(`Phone: ${agent.phone_e164}`, margin, yPos);
      yPos += 5;
    }
    if (agent?.email) {
      pdf.text(`Email: ${agent.email}`, margin, yPos);
      yPos += 5;
    }
    if (agent?.license_number) {
      pdf.text(`License: ${agent.license_number}`, margin, yPos);
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
