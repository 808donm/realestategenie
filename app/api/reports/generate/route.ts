import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { renderHtmlToPdf } from "@/lib/documents/html-to-pdf";
import { buildSellerReportHtml } from "@/lib/documents/seller-report-html";
import { fetchImageAsDataUri, type AgentBranding } from "@/lib/documents/pdf-report-utils";
import type { SellerReportData } from "@/lib/documents/seller-report-pdf";

/**
 * POST /api/reports/generate
 *
 * Generates RPR-quality PDF reports using headless browser rendering.
 * Accepts report data + type, renders HTML template, converts to PDF via Puppeteer.
 *
 * Body: { property: ReportData, reportType: "seller" | "buyer" | ... }
 * Returns: PDF blob (application/pdf)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const reportType: string = body.reportType || "seller";
    const property = body.property;

    if (!property || !property.address) {
      return NextResponse.json({ error: "property.address is required" }, { status: 400 });
    }

    // Fetch agent branding
    const { data: agent } = await supabase
      .from("agents")
      .select(
        "display_name, email, phone_e164, license_number, photo_url, headshot_url, company_logo_url, brokerage_name",
      )
      .eq("id", user.id)
      .single();

    const photoSrc = agent?.headshot_url || agent?.photo_url;
    const headshotData = photoSrc ? await fetchImageAsDataUri(photoSrc) : null;

    const branding: AgentBranding = {
      displayName: agent?.display_name || agent?.email || user.email || "Agent",
      email: agent?.email || user.email || "",
      phone: agent?.phone_e164 || null,
      licenseNumber: agent?.license_number || null,
      photoUrl: agent?.photo_url || null,
      brokerageName: agent?.brokerage_name || "Real Estate Genie",
      headshotData,
    };

    // Ensure generated timestamp
    if (!property.generatedAt) {
      property.generatedAt = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    // Pre-fetch primary photo as data URI for embedding in HTML
    if (property.photos?.length && !property.primaryPhotoData) {
      try {
        const photoData = await fetchImageAsDataUri(property.photos[0]);
        if (photoData) property.primaryPhotoData = photoData;
      } catch {}
    }

    // Pre-fetch gallery photos as data URIs
    if (property.photos?.length && (!property.photoGalleryData || property.photoGalleryData.length === 0)) {
      try {
        const galleryUrls = property.photos.slice(0, 16);
        const results = await Promise.all(galleryUrls.map((url: string) => fetchImageAsDataUri(url).catch(() => null)));
        property.photoGalleryData = results.filter(Boolean);
      } catch {}
    }

    // Pre-fetch map image for cover page
    if (property.latitude && property.longitude && !property.mapImageData) {
      const lat = Number(property.latitude);
      const lng = Number(property.longitude);
      console.log(`[reports/generate] Fetching map for ${lat},${lng}`);

      // Try Google Maps Static API first (if key available), then OpenStreetMap
      const gkey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (gkey) {
        try {
          const gmapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${gkey}`;
          const { fetchImageAsDataUri } = await import("@/lib/documents/pdf-report-utils");
          const mapData = await fetchImageAsDataUri(gmapUrl);
          if (mapData) {
            property.mapImageData = mapData;
            console.log("[reports/generate] Google Maps image fetched");
          }
        } catch (e: unknown) {
          console.warn("[reports/generate] Google Maps fetch failed:", e instanceof Error ? e.message : e);
        }
      }

      // Fallback to OpenStreetMap
      if (!property.mapImageData) {
        try {
          const { fetchStaticMapImage } = await import("@/lib/documents/pdf-report-utils");
          const mapData = await fetchStaticMapImage(lat, lng, 600, 400, 15);
          if (mapData) {
            property.mapImageData = mapData;
            console.log("[reports/generate] OSM map image fetched");
          } else {
            console.warn("[reports/generate] OSM map returned null");
          }
        } catch (e: unknown) {
          console.warn("[reports/generate] OSM map fetch failed:", e instanceof Error ? e.message : e);
        }
      }
    }

    // Build HTML and render to PDF
    let html: string;
    let filenamePrefix: string;

    switch (reportType) {
      case "seller":
        html = buildSellerReportHtml(property as SellerReportData, branding);
        filenamePrefix = "Seller_Report";
        break;
      // Future: case "buyer": html = buildBuyerReportHtml(...); break;
      default:
        return NextResponse.json({ error: `Unsupported report type: ${reportType}` }, { status: 400 });
    }

    const pdfBuffer = await renderHtmlToPdf(html);

    // Log activity (fire-and-forget)
    void (async () => {
      try {
        await supabase.from("agent_activity_log").insert({
          agent_id: user.id,
          action: "report_generated",
          details: { address: property.address, type: `html_${reportType}` },
        });
      } catch {}
    })();

    // Sanitize filename
    const safeAddr = property.address
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 60);
    const filename = `${filenamePrefix}_${safeAddr}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate report";
    console.error("[reports/generate] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
