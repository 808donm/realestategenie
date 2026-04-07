import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";
import { computeGenieAvm, type GenieAvmInput, type MlsComp } from "@/lib/avm/genie-avm-engine";
import {
  buildPropertyCacheKey,
  propertyCacheGet,
  propertyCacheSet,
  propertyDbRead,
  propertyDbWrite,
} from "@/lib/integrations/property-data-cache";

/**
 * GET /api/avm/genie
 *
 * Computes a Genie AVM (proprietary ensemble valuation) for a property.
 * Combines MLS closed comps, RentCast AVM, county assessments, and
 * Hawaii-specific adjustments (leasehold, flood zones).
 *
 * Query params:
 *   address       -- Property address (required)
 *   zipCode       -- ZIP code (required)
 *   beds          -- Bedrooms
 *   baths         -- Bathrooms
 *   sqft          -- Square footage
 *   yearBuilt     -- Year built
 *   propertyType  -- e.g., "Residential"
 *   propertySubType -- e.g., "Single Family Residence", "Condominium"
 *   ownershipType -- "Fee Simple" or "Leasehold"
 *   subdivision   -- Subdivision/building name
 *   hoaFee        -- Monthly HOA fee
 *   lat           -- Latitude (for hazard lookup)
 *   lng           -- Longitude (for hazard lookup)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const address = params.get("address");
    const zipCode = params.get("zipCode");

    if (!address || !zipCode) {
      return NextResponse.json({ error: "address and zipCode are required" }, { status: 400 });
    }

    // Check cache (7-day TTL)
    const cacheKey = buildPropertyCacheKey("unified", "genie-avm", {
      address: address.toLowerCase().replace(/[^a-z0-9]/g, ""),
      zipCode,
    });

    const memCached = propertyCacheGet(cacheKey);
    if (memCached) {
      return NextResponse.json(memCached);
    }

    const dbCached = await propertyDbRead(cacheKey, "genie-avm");
    if (dbCached) {
      propertyCacheSet(cacheKey, dbCached, "computed");
      return NextResponse.json(dbCached);
    }

    // Gather inputs in parallel
    const beds = params.get("beds") ? Number(params.get("beds")) : undefined;
    const baths = params.get("baths") ? Number(params.get("baths")) : undefined;
    const sqft = params.get("sqft") ? Number(params.get("sqft")) : undefined;
    const yearBuilt = params.get("yearBuilt") ? Number(params.get("yearBuilt")) : undefined;
    const propertyType = params.get("propertyType") || undefined;
    const propertySubType = params.get("propertySubType") || undefined;
    const ownershipType = params.get("ownershipType") || undefined;
    const subdivision = params.get("subdivision") || undefined;
    const hoaFee = params.get("hoaFee") ? Number(params.get("hoaFee")) : undefined;
    const listPrice = params.get("listPrice") ? Number(params.get("listPrice")) : undefined;
    const lat = params.get("lat") ? Number(params.get("lat")) : undefined;
    const lng = params.get("lng") ? Number(params.get("lng")) : undefined;

    // Fetch RentCast AVM, property data, MLS comps, and hazard data in parallel
    const [avmResult, propertyResult, mlsCompsResult, hazardResult] = await Promise.allSettled([
      // RentCast AVM
      fetch(
        `${request.nextUrl.origin}/api/rentcast/comps?address=${encodeURIComponent(address)}&compCount=15${beds ? `&bedrooms=${beds}` : ""}${baths ? `&bathrooms=${baths}` : ""}${sqft ? `&squareFootage=${sqft}` : ""}${propertyType ? `&propertyType=${propertyType}` : ""}`,
        { headers: { cookie: request.headers.get("cookie") || "" } },
      ).then((r) => r.json()).catch(() => null),

      // Property data (for assessment history)
      fetch(
        `${request.nextUrl.origin}/api/integrations/attom/property?endpoint=expanded&address=${encodeURIComponent(address)}&postalcode=${zipCode}&pagesize=1`,
        { headers: { cookie: request.headers.get("cookie") || "" } },
      ).then((r) => r.json()).catch(() => null),

      // Comps — same data source as the Comps tab. Uses MLS first, RentCast fallback.
      (async () => {
        try {
          const compsUrl = `${request.nextUrl.origin}/api/comps?address=${encodeURIComponent(address)}&zipCode=${zipCode}&compCount=20${beds ? `&beds=${beds}` : ""}${baths ? `&baths=${baths}` : ""}${sqft ? `&sqft=${sqft}` : ""}${propertyType ? `&propertyType=${propertyType}` : ""}`;
          const compsRes = await fetch(compsUrl, {
            headers: { cookie: request.headers.get("cookie") || "" },
          });
          const compsData = await compsRes.json();
          const comps = compsData.comparables || [];
          return comps.map((c: any): MlsComp => ({
            address: c.address || c.formattedAddress || "",
            closePrice: c.closePrice || c.price || 0,
            listPrice: c.listPrice,
            beds: c.bedrooms || c.beds,
            baths: c.bathrooms || c.baths,
            sqft: c.squareFootage || c.sqft,
            yearBuilt: c.yearBuilt,
            lotSize: c.lotSize,
            closeDate: c.closeDate || c.listedDate || "",
            correlation: c.correlation,
            distance: c.distance,
          }));
        } catch { return []; }
      })(),

      // Hazard check (if coordinates available)
      lat && lng
        ? fetch(
            `${request.nextUrl.origin}/api/integrations/attom/property?endpoint=expanded&latitude=${lat}&longitude=${lng}&radius=0.01&pagesize=1`,
            { headers: { cookie: request.headers.get("cookie") || "" } },
          ).then(() => {
            // Use the hazards client directly
            return import("@/lib/integrations/hawaii-hazards-client").then(async ({ HawaiiHazardsClient }) => {
              const client = new HawaiiHazardsClient();
              return client.getPropertyHazardProfile(lat, lng);
            });
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Extract RentCast AVM
    const avmData = avmResult.status === "fulfilled" ? avmResult.value : null;
    const rentcastAvm = avmData?.avm
      ? { value: avmData.avm.price, low: avmData.avm.priceLow, high: avmData.avm.priceHigh }
      : null;

    // Extract property data for assessments
    const propData = propertyResult.status === "fulfilled" ? propertyResult.value?.property?.[0] : null;
    const taxAssessments = propData?.assessment?.assessed || propData?.taxAssessments;

    // Build assessment data
    let assessment = null;
    let assessmentHistory: { year: number; value: number }[] = [];
    if (taxAssessments) {
      // RentCast format: keyed by year string
      if (typeof taxAssessments === "object" && !Array.isArray(taxAssessments)) {
        for (const [yearStr, data] of Object.entries(taxAssessments)) {
          const yr = parseInt(yearStr);
          const val = (data as any).value || (data as any).assdTtlValue || 0;
          if (yr && val > 0) assessmentHistory.push({ year: yr, value: val });
        }
      }
    }
    // Also check Realie/ATTOM assessment format
    if (assessmentHistory.length === 0 && propData?.assessment?.market?.mktTtlValue) {
      assessment = {
        value: propData.assessment.market.mktTtlValue,
        year: propData.assessment.tax?.taxYear || new Date().getFullYear(),
        land: propData.assessment.market?.mktLandValue || 0,
        improvements: propData.assessment.market?.mktImprValue || 0,
      };
    }
    if (assessmentHistory.length > 0) {
      assessmentHistory.sort((a, b) => b.year - a.year);
      const latest = assessmentHistory[0];
      assessment = { value: latest.value, year: latest.year, land: 0, improvements: 0 };
    }

    // Extract Realie AVM
    const realieAvm = propData?.avm?.amount?.value
      ? { value: propData.avm.amount.value, low: propData.avm.amount.low, high: propData.avm.amount.high }
      : null;

    // Extract MLS comps
    const mlsComps = mlsCompsResult.status === "fulfilled" ? (mlsCompsResult.value as MlsComp[]) : [];

    // Extract hazard data
    const hazardData = hazardResult.status === "fulfilled" ? hazardResult.value : null;
    const isFloodZone = hazardData?.seaLevelRise?.found || hazardData?.tsunami?.found || false;
    const floodZoneCode = (hazardData?.seaLevelRise?.attributes as any)?.FLD_ZONE || undefined;

    // Property AVM: use Realie AVM first, fall back to RentCast AVM
    const propertyAvm = realieAvm || rentcastAvm || null;

    // Build input and compute
    const avmInput: GenieAvmInput = {
      address,
      zipCode,
      beds,
      baths,
      sqft,
      yearBuilt,
      propertyType,
      propertySubType,
      ownershipType,
      subdivision,
      hoaFee,
      listPrice,
      propertyAvm,
      rentcastAvm,
      realieAvm,
      assessment,
      assessmentHistory,
      mlsComps,
      isFloodZone,
      floodZoneCode,
    };

    const result = computeGenieAvm(avmInput);

    if (!result) {
      return NextResponse.json({ error: "Insufficient data for valuation" }, { status: 200 });
    }

    // Cache the result
    propertyCacheSet(cacheKey, result, "computed");
    propertyDbWrite(cacheKey, "genie-avm", result, "unified").catch(() => {});

    console.log(
      `[Genie AVM] ${address}: $${result.value.toLocaleString()} (${result.confidence}, FSD ${result.fsd}%, ${result.methodology.compsUsed} comps)`,
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Genie AVM] Error:", error);
    return NextResponse.json({ error: error.message || "AVM computation failed" }, { status: 500 });
  }
}
