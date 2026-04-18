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

    const rawBody = await request.text();
    console.log(`[reports/generate] Request body size: ${(rawBody.length / 1024).toFixed(0)}KB`);
    const body = JSON.parse(rawBody);
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

      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        console.log(`[reports/generate] Fetching map for ${lat},${lng}`);

        // Try Google Maps Static API first (if key available)
        const gkey = (process.env.GOOGLE_STATIC_MAP_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
        console.log(`[reports/generate] API key source: ${process.env.GOOGLE_STATIC_MAP_API_KEY ? "GOOGLE_STATIC_MAP_API_KEY" : process.env.GOOGLE_MAPS_API_KEY ? "GOOGLE_MAPS_API_KEY" : process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "NEXT_PUBLIC" : "NONE"}, prefix: ${gkey.substring(0, 8)}...`);
        if (gkey && gkey.length > 10) {
          try {
            const gmapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=600x400&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${gkey}`;
            const testRes = await fetch(gmapUrl, { signal: AbortSignal.timeout(10000) });
            console.log(`[reports/generate] Google Maps HTTP ${testRes.status}, content-type: ${testRes.headers.get("content-type")}, size: ${testRes.headers.get("content-length")}`);
            if (testRes.ok && (testRes.headers.get("content-type") || "").includes("image")) {
              const buffer = await testRes.arrayBuffer();
              if (buffer.byteLength > 5000) {
                const base64 = Buffer.from(buffer).toString("base64");
                property.mapImageData = `data:image/png;base64,${base64}`;
                console.log(`[reports/generate] Google Maps image saved (${buffer.byteLength} bytes)`);
              } else {
                console.warn(`[reports/generate] Google Maps image too small: ${buffer.byteLength} bytes`);
              }
            } else {
              const body = await testRes.text();
              console.warn(`[reports/generate] Google Maps error: ${body.substring(0, 200)}`);
            }
          } catch (e: unknown) {
            console.warn("[reports/generate] Google Maps fetch failed:", e instanceof Error ? e.message : e);
          }
        } else {
          console.log("[reports/generate] No valid Google Maps API key found");
        }

        // Fallback to OpenStreetMap
        if (!property.mapImageData) {
          try {
            const { fetchStaticMapImage } = await import("@/lib/documents/pdf-report-utils");
            const mapData = await fetchStaticMapImage(lat, lng, 600, 400, 15);
            if (mapData && mapData.length > 5000) {
              property.mapImageData = mapData;
              console.log(`[reports/generate] OSM map fetched (${mapData.length} chars)`);
            } else {
              console.warn(`[reports/generate] OSM map too small or null (${mapData?.length || 0})`);
            }
          } catch (e: unknown) {
            console.warn("[reports/generate] OSM map fetch error:", e instanceof Error ? e.message : e);
          }
        }

        if (!property.mapImageData) {
          console.warn("[reports/generate] All map providers failed - no map on cover");
        }
      } else {
        console.warn(`[reports/generate] Invalid lat/lng: ${property.latitude}, ${property.longitude}`);
      }
    }

    // Generate AI property narrative for Seller Report
    const t0 = Date.now();
    if (reportType === "seller" && !property.aiNarrative) {
      try {
        const { trackedGenerateText } = await import("@/lib/ai/ai-call-logger");
        const narrativePrompt = `You are a licensed real estate professional writing a property analysis for a seller report. Write 4-5 concise paragraphs. Be factual, objective, and professional. No headers or bullet points - just flowing paragraphs.

IMPORTANT: You MUST comply with the Fair Housing Act and NAR (National Association of REALTORS) standards:
- Do NOT reference race, color, religion, sex, national origin, familial status, or disability
- Do NOT describe the demographics or characteristics of neighborhood residents
- Do NOT use language that could be perceived as steering or discriminatory
- Focus on the PROPERTY features, market data, and financial analysis only
- Refer to the neighborhood by name and geographic features, not by the people who live there

Property: ${property.address}, ${property.city}, ${property.state} ${property.zip}
Type: ${property.propertyType || "Residential"} | Year Built: ${property.yearBuilt || "N/A"} | ${property.beds || "?"}bd/${property.baths || "?"}ba | ${property.sqft ? property.sqft.toLocaleString() + " sqft" : "N/A"} | Lot: ${property.lotSizeSqft ? property.lotSizeSqft.toLocaleString() + " sqft" : "N/A"}
AVM: ${property.avmValue ? "$" + property.avmValue.toLocaleString() : "N/A"} | Last Sale: ${property.lastSalePrice ? "$" + property.lastSalePrice.toLocaleString() : "Price not disclosed"} (${property.lastSaleDate || "N/A"})
Tax Assessment: ${property.assessedTotal ? "$" + property.assessedTotal.toLocaleString() : "N/A"} | Annual Tax: ${property.taxAmount ? "$" + property.taxAmount.toLocaleString() : "N/A"}
Construction: ${property.constructionType || "N/A"} | Condition: ${property.condition || "N/A"} | Roof: ${property.roofType || "N/A"}
${property.legal?.subdivision ? "Subdivision: " + property.legal.subdivision : ""} | Zoning: ${property.legal?.zoning || "N/A"}
Market: ${property.marketStats?.medianPrice ? "Median Sold $" + property.marketStats.medianPrice.toLocaleString() : ""} | ${property.marketStats?.avgDOM ? "Avg DOM " + property.marketStats.avgDOM + " days" : ""} | ${property.monthsOfInventory ? "Inventory " + property.monthsOfInventory + " months" : ""} | ${property.marketType ? property.marketType + " market" : ""}
${property.hazards?.length ? "Hazard Zones: " + property.hazards.map((h: { label: string }) => h.label).join(", ") : "No known hazard zones"}

Paragraph 1: Property overview - location, type, size, lot, key features
Paragraph 2: Building details and condition - construction quality, notable features
Paragraph 3: Market context - current market conditions, how property value compares to area median
Paragraph 4: Equity and financial position - estimated value, tax assessment, equity status
Paragraph 5: Considerations - hazard zones if any, HOA, zoning, and what makes this property marketable`;

        const result = await trackedGenerateText({
          model: process.env.REPORT_AI_MODEL || "anthropic/claude-haiku-4-5-20251001",
          prompt: narrativePrompt,
          temperature: 0.6,
          maxTokens: 700,
          source: "seller-report-narrative",
          agentId: user.id,
        });
        if (result.text) {
          property.aiNarrative = result.text;
          console.log(`[reports/generate] AI narrative: ${Date.now() - t0}ms (${result.text.length} chars)`);
        }
      } catch (e: unknown) {
        console.warn(`[reports/generate] AI narrative failed (${Date.now() - t0}ms):`, e instanceof Error ? e.message : e);
      }
    }

    // Import Oahu trends server-side (static data, no API call)
    if (reportType === "seller" && (property as any).includeOahuTrends && !(property as any).oahuTrends) {
      try {
        const { OAHU_RESALES_DATA } = await import("@/lib/data/oahu-resales-data");
        (property as any).oahuTrends = OAHU_RESALES_DATA.slice(-20).map((yr: any) => ({
          year: yr.year,
          sfrMedian: yr.singleFamily.medianPrice,
          sfrAvg: yr.singleFamily.avgPrice,
          sfrSales: yr.singleFamily.sales,
          condoMedian: yr.condo.medianPrice,
          condoAvg: yr.condo.avgPrice,
          condoSales: yr.condo.sales,
        }));
      } catch {}
    }

    // Build HTML and render to PDF
    const t1 = Date.now();
    console.log(`[reports/generate] Pre-render setup: ${t1 - t0}ms`);
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

    console.log(`[reports/generate] HTML built: ${Date.now() - t1}ms (${html.length} chars)`);
    const t2 = Date.now();
    // Seller report v2 uses @page CSS for full-bleed layout; other reports keep the default 0.5in margin.
    const pdfOptions = reportType === "seller"
      ? {
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
          format: "Letter" as const,
          waitUntil: "networkidle2" as const,
          timeoutMs: 50000,
        }
      : undefined;
    const pdfBuffer = await renderHtmlToPdf(html, pdfOptions);
    console.log(`[reports/generate] PDF rendered: ${Date.now() - t2}ms (${pdfBuffer.length} bytes)`);
    console.log(`[reports/generate] Total: ${Date.now() - t0}ms`);

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
