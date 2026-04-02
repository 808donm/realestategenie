import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generatePropertyIntelligencePDF, type PropertyReportData } from "@/lib/documents/property-intelligence-report";
import { fetchImageAsDataUri, fetchStaticMapImage, type AgentBranding } from "@/lib/documents/pdf-report-utils";

/**
 * POST /api/property-intelligence/generate
 *
 * Accepts pre-gathered property data from the client and generates a branded
 * Property Intelligence Report PDF.  The client already has all the ATTOM /
 * Realie / federal / hazard data loaded in the property-detail-modal, so we
 * avoid redundant API calls by letting it POST the assembled payload.
 *
 * Body: { property: PropertyReportData }
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
    const property: PropertyReportData = body.property;

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

    // Fetch headshot & broker logo images in parallel (for PDF embedding)
    const photoSrc = agent?.headshot_url || agent?.photo_url;
    const logoSrc = agent?.company_logo_url;
    const [headshotData, brokerLogoData] = await Promise.all([
      photoSrc ? fetchImageAsDataUri(photoSrc) : Promise.resolve(null),
      logoSrc ? fetchImageAsDataUri(logoSrc) : Promise.resolve(null),
    ]);

    const branding: AgentBranding = {
      displayName: agent?.display_name || agent?.email || user.email || "Agent",
      email: agent?.email || user.email || "",
      phone: agent?.phone_e164 || null,
      licenseNumber: agent?.license_number || null,
      photoUrl: agent?.photo_url || null,
      brokerageName: agent?.brokerage_name || "Real Estate Genie",
      brokerLogoUrl: agent?.company_logo_url || null,
      headshotData,
      brokerLogoData,
    };

    // Ensure generated timestamp
    if (!property.generatedAt) {
      property.generatedAt = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    // Pre-fetch map image and photo gallery for the upgraded report
    const enrichPromises: Promise<void>[] = [];

    // Static map for cover page
    if (property.latitude && property.longitude && !property.mapImageData) {
      enrichPromises.push(
        fetchStaticMapImage(property.latitude, property.longitude, 600, 400, 15).then((data) => {
          if (data) property.mapImageData = data;
        }),
      );
    }

    // Primary photo for cover page
    if (property.photos?.length && !property.primaryPhotoData) {
      enrichPromises.push(
        fetchImageAsDataUri(property.photos[0]).then((data) => {
          if (data) property.primaryPhotoData = data;
        }),
      );
    }

    // Photo gallery (up to 6 photos)
    if (property.photos?.length && (!property.photoGalleryData || property.photoGalleryData.length === 0)) {
      const galleryUrls = property.photos.slice(0, 6);
      enrichPromises.push(
        Promise.all(galleryUrls.map((url) => fetchImageAsDataUri(url))).then((results) => {
          property.photoGalleryData = results.filter(Boolean) as string[];
        }),
      );
    }

    // Compute market type from months of inventory
    if (property.marketStats && !property.marketType) {
      const totalListings = property.marketStats.totalListings;
      const avgDOM = property.marketStats.avgDOM;
      if (totalListings != null && avgDOM != null && avgDOM > 0) {
        // Estimate monthly sales rate: listings / (avgDOM / 30)
        const monthlySales = totalListings / (avgDOM / 30);
        if (monthlySales > 0) {
          const moi = totalListings / monthlySales;
          property.monthsOfInventory = Math.round(moi * 10) / 10;
          property.marketType = moi <= 4 ? "sellers" : moi <= 6 ? "balanced" : "buyers";
        }
      }
    }

    await Promise.allSettled(enrichPromises);

    // Generate PDF
    const pdfBlob = generatePropertyIntelligencePDF(property, branding);

    // Convert Blob to ArrayBuffer for the response
    const arrayBuffer = await pdfBlob.arrayBuffer();

    // Sanitize filename
    const safeAddr = property.address
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 60);
    const filename = `Property_Intelligence_${safeAddr}.pdf`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("[property-intelligence/generate] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate report" }, { status: 500 });
  }
}
