import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import sizeOf from "image-size";
import QRCode from "qrcode";
import { FLYER_TEMPLATES } from "@/lib/flyer-templates";
import {
  renderDefaultTemplate,
  renderModernBlueTemplate,
  renderElegantWarmTemplate,
  FlyerRenderContext,
} from "./renderers";

// Lazy-init admin client to avoid build-time errors (env vars unavailable during build)
function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// Helper: fetch an image URL and return base64 data URI + dimensions
async function fetchImage(
  url: string,
  defaultWidth: number,
  defaultHeight: number,
  defaultType = "image/jpeg",
): Promise<{ data: string | null; width: number; height: number }> {
  try {
    const response = await fetch(url);
    if (!response.ok) return { data: null, width: defaultWidth, height: defaultHeight };

    const buffer = Buffer.from(await response.arrayBuffer());
    let width = defaultWidth;
    let height = defaultHeight;

    try {
      const dims = sizeOf(buffer);
      if (dims.width && dims.height) {
        width = dims.width;
        height = dims.height;
      }
    } catch {
      // Use defaults
    }

    const contentType = response.headers.get("content-type") || defaultType;
    const data = `data:${contentType};base64,${buffer.toString("base64")}`;
    return { data, width, height };
  } catch (error) {
    console.error("Failed to fetch image:", url, error);
    return { data: null, width: defaultWidth, height: defaultHeight };
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = getAdmin();

    // Get open house event details using admin client (bypasses RLS)
    let event: any = null;

    const result = await admin
      .from("open_house_events")
      .select(
        `
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
        flyer_description,
        flyer_features,
        property_photo_url,
        secondary_photo_url,
        tertiary_photo_url,
        latitude,
        longitude,
        agent_id,
        status,
        flyer_template_id,
        parking_notes
      `,
      )
      .eq("id", id)
      .single();

    if (result.error && result.error.message?.includes("flyer_template_id")) {
      const fallback = await admin
        .from("open_house_events")
        .select(
          `
          id, address, start_at, end_at, beds, baths, sqft, price,
          key_features, listing_description, property_photo_url,
          latitude, longitude, agent_id, status
        `,
        )
        .eq("id", id)
        .single();

      if (fallback.error || !fallback.data) {
        // Try with only base schema columns
        const minFallback = await admin
          .from("open_house_events")
          .select(`id, address, start_at, end_at, property_photo_url, latitude, longitude, agent_id, status`)
          .eq("id", id)
          .single();

        if (minFallback.error || !minFallback.data) {
          console.error("Event query error:", minFallback.error);
          return NextResponse.json(
            {
              error: "Open house not found",
              details: minFallback.error?.message,
              eventId: id,
            },
            { status: 404 },
          );
        }
        event = {
          ...minFallback.data,
          beds: null,
          baths: null,
          sqft: null,
          price: null,
          key_features: null,
          listing_description: null,
          flyer_template_id: null,
          secondary_photo_url: null,
          tertiary_photo_url: null,
          parking_notes: null,
          flyer_description: null,
          flyer_features: null,
        };
      } else {
        event = {
          ...fallback.data,
          flyer_template_id: null,
          secondary_photo_url: null,
          tertiary_photo_url: null,
          parking_notes: null,
          flyer_description: null,
          flyer_features: null,
        };
      }
    } else if (result.error || !result.data) {
      // Try with progressively fewer columns in case migrations haven't run yet
      console.error("Primary event query error:", result.error);

      // Try without the newest optional columns
      const fallback2 = await admin
        .from("open_house_events")
        .select(
          `
          id, address, start_at, end_at, beds, baths, sqft, price,
          key_features, listing_description, property_photo_url,
          latitude, longitude, agent_id, status
        `,
        )
        .eq("id", id)
        .single();

      if (fallback2.error || !fallback2.data) {
        console.error("Fallback2 event query error:", fallback2.error);

        // Try with only base schema columns (migration 004 columns may not exist)
        const fallback3 = await admin
          .from("open_house_events")
          .select(
            `
            id, address, start_at, end_at,
            property_photo_url, latitude, longitude,
            agent_id, status
          `,
          )
          .eq("id", id)
          .single();

        if (fallback3.error || !fallback3.data) {
          console.error("Fallback3 event query error:", fallback3.error);
          return NextResponse.json(
            {
              error: "Open house not found",
              details: fallback3.error?.message,
              eventId: id,
            },
            { status: 404 },
          );
        }
        event = {
          ...fallback3.data,
          beds: null,
          baths: null,
          sqft: null,
          price: null,
          key_features: null,
          listing_description: null,
          flyer_template_id: null,
          flyer_description: null,
          flyer_features: null,
          secondary_photo_url: null,
          tertiary_photo_url: null,
          parking_notes: null,
        };
      } else {
        event = {
          ...fallback2.data,
          flyer_template_id: null,
          flyer_description: null,
          flyer_features: null,
          secondary_photo_url: null,
          tertiary_photo_url: null,
          parking_notes: null,
        };
      }
    } else {
      event = result.data;
    }

    // Only allow downloading flyers for published events
    if (event.status !== "published") {
      return NextResponse.json(
        {
          error: "This open house is not published yet",
        },
        { status: 403 },
      );
    }

    // Resolve flyer template settings
    const templateId = event.flyer_template_id || "modern";
    const template = FLYER_TEMPLATES.find((t) => t.id === templateId) || FLYER_TEMPLATES[0];
    const tSettings = template.defaultSettings;

    // Parse template colors to RGB
    const hexToRGB = (hex: string) => {
      const h = hex.replace("#", "");
      return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
      };
    };
    const primaryRGB = hexToRGB(tSettings.primaryColor);
    const secondaryRGB = hexToRGB(tSettings.secondaryColor);

    // Get agent details using admin client
    const { data: agent } = await admin
      .from("agents")
      .select("display_name, phone_e164, email, license_number, agency_name, photo_url, headshot_url, company_logo_url")
      .eq("id", event.agent_id)
      .single();

    // Fetch all images in parallel
    const [propertyPhoto, secondaryPhoto, tertiaryPhoto, headshotPhoto, logoPhoto] = await Promise.all([
      event.property_photo_url
        ? fetchImage(event.property_photo_url, 800, 600)
        : Promise.resolve({ data: null, width: 800, height: 600 }),
      event.secondary_photo_url
        ? fetchImage(event.secondary_photo_url, 800, 400)
        : Promise.resolve({ data: null, width: 800, height: 400 }),
      event.tertiary_photo_url
        ? fetchImage(event.tertiary_photo_url, 400, 290)
        : Promise.resolve({ data: null, width: 400, height: 290 }),
      agent?.headshot_url
        ? fetchImage(agent.headshot_url, 150, 150)
        : Promise.resolve({ data: null, width: 150, height: 150 }),
      agent?.company_logo_url
        ? fetchImage(agent.company_logo_url, 200, 100, "image/png")
        : Promise.resolve({ data: null, width: 200, height: 100 }),
    ]);

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
            console.log("Trying map service:", mapUrl.split("?")[0]);
            const mapResponse = await fetch(mapUrl, {
              headers: { "User-Agent": "RealEstateGenie/1.0" },
              signal: AbortSignal.timeout(15000),
            });

            if (mapResponse.ok) {
              const mapBuffer = await mapResponse.arrayBuffer();
              const mapBufferNode = Buffer.from(mapBuffer);

              if (mapBufferNode.length < 1000) {
                continue;
              }

              try {
                const dimensions = sizeOf(mapBufferNode);
                if (dimensions.width && dimensions.height) {
                  mapWidth = dimensions.width;
                  mapHeight = dimensions.height;
                  mapImageData = `data:image/png;base64,${mapBufferNode.toString("base64")}`;
                  break;
                }
              } catch {
                continue;
              }
            }
          } catch (serviceError) {
            console.error("Error with map service:", serviceError);
          }
        }
      } catch (error) {
        console.error("Failed to fetch map image:", error);
      }
    }

    // Generate QR code for check-in
    let qrCodeData: string | null = null;
    try {
      const origin =
        request.headers.get("origin") || request.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";
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

    // Generate PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // Build render context
    const ctx: FlyerRenderContext = {
      pdf,
      event,
      agent,
      template,
      primaryRGB,
      secondaryRGB,
      propertyPhotoData: propertyPhoto.data,
      photoWidth: propertyPhoto.width,
      photoHeight: propertyPhoto.height,
      secondaryPhotoData: secondaryPhoto.data,
      secondaryPhotoWidth: secondaryPhoto.width,
      secondaryPhotoHeight: secondaryPhoto.height,
      tertiaryPhotoData: tertiaryPhoto.data,
      tertiaryPhotoWidth: tertiaryPhoto.width,
      tertiaryPhotoHeight: tertiaryPhoto.height,
      mapImageData,
      mapWidth,
      mapHeight,
      qrCodeData,
      headshotData: headshotPhoto.data,
      headshotWidth: headshotPhoto.width,
      headshotHeight: headshotPhoto.height,
      logoData: logoPhoto.data,
      logoWidth: logoPhoto.width,
      logoHeight: logoPhoto.height,
      pageWidth,
      pageHeight,
      margin,
    };

    // Dispatch to the appropriate renderer
    switch (templateId) {
      case "modern-blue":
        renderModernBlueTemplate(ctx);
        break;
      case "elegant-warm":
        renderElegantWarmTemplate(ctx);
        break;
      default:
        renderDefaultTemplate(ctx);
        break;
    }

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
    return NextResponse.json({ error: "Failed to generate PDF", details: error.message }, { status: 500 });
  }
}
