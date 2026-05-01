import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
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
 * The engine builds the value entirely from our own analysis: MLS closed
 * comps (with public-records / rental fallback for off-market), list
 * price (when on-market), trend-adjusted county assessment, time-adjusted
 * last sale, and an area median $/sqft sanity blend. No third-party AVM
 * is consumed as a source.
 *
 * Query params:
 *   address         -- Property address (required)
 *   zipCode         -- ZIP code (required)
 *   beds            -- Bedrooms
 *   baths           -- Bathrooms
 *   sqft            -- Square footage
 *   yearBuilt       -- Year built
 *   propertyType    -- e.g., "Residential"
 *   propertySubType -- e.g., "Single Family Residence", "Condominium"
 *   ownershipType   -- "Fee Simple" or "Leasehold"
 *   subdivision     -- Subdivision/building name
 *   hoaFee          -- Monthly HOA fee
 *   listPrice       -- On-market list price (when applicable)
 *   lat             -- Latitude (for hazard lookup)
 *   lng             -- Longitude (for hazard lookup)
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

    // Gather subject inputs
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

    // Fetch property records (for assessment + last sale), comps, market
    // stats, and hazard data in parallel. The /api/comps endpoint handles
    // MLS-first / public-records-fallback comp resolution internally so
    // this route doesn't have to.
    const [propertyResult, mlsCompsResult, marketStatsResult, hazardResult] = await Promise.allSettled([
      // Property data (assessment history + last sale)
      fetch(
        `${request.nextUrl.origin}/api/integrations/attom/property?endpoint=expanded&address=${encodeURIComponent(address)}&postalcode=${zipCode}&pagesize=1`,
        { headers: { cookie: request.headers.get("cookie") || "" } },
      )
        .then((r) => r.json())
        .catch(() => null),

      // Closed comps. MLS preferred, public-records / rental provider as
      // off-market fallback. Engine filters these by property type.
      (async () => {
        try {
          const compsUrl = `${request.nextUrl.origin}/api/comps?address=${encodeURIComponent(address)}&zipCode=${zipCode}&compCount=20${beds ? `&beds=${beds}` : ""}${baths ? `&baths=${baths}` : ""}${sqft ? `&sqft=${sqft}` : ""}${propertyType ? `&propertyType=${propertyType}` : ""}`;
          const compsRes = await fetch(compsUrl, {
            headers: { cookie: request.headers.get("cookie") || "" },
          });
          const compsData = await compsRes.json();
          const comps = compsData.comparables || [];
          return comps.map(
            (c: any): MlsComp => ({
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
              propertyType: c.propertyType,
              propertySubType: c.propertySubType,
              propType: c.propType,
              ownershipType: c.ownershipType,
              subdivision: c.subdivision,
            }),
          );
        } catch {
          return [];
        }
      })(),

      // Area median $/sqft for sanity-blend (pulls value toward median when
      // ensemble diverges 25%+). Falls back to the SFR/condo split provided
      // by neighborhood-stats; engine handles a missing value gracefully.
      fetch(`${request.nextUrl.origin}/api/mls/neighborhood-stats?zipCode=${zipCode}`, {
        headers: { cookie: request.headers.get("cookie") || "" },
      })
        .then((r) => r.json())
        .catch(() => null),

      // Hazard check (if coordinates available)
      lat && lng
        ? fetch(
            `${request.nextUrl.origin}/api/integrations/attom/property?endpoint=expanded&latitude=${lat}&longitude=${lng}&radius=0.01&pagesize=1`,
            { headers: { cookie: request.headers.get("cookie") || "" } },
          )
            .then(() =>
              import("@/lib/integrations/hawaii-hazards-client").then(async ({ HawaiiHazardsClient }) => {
                const client = new HawaiiHazardsClient();
                return client.getPropertyHazardProfile(lat, lng);
              }),
            )
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    // Extract property data for assessments and last sale
    const propData = propertyResult.status === "fulfilled" ? propertyResult.value?.property?.[0] : null;
    const taxAssessments = propData?.assessment?.assessed || propData?.taxAssessments;

    let assessment = null;
    let assessmentHistory: { year: number; value: number }[] = [];
    if (taxAssessments) {
      if (typeof taxAssessments === "object" && !Array.isArray(taxAssessments)) {
        for (const [yearStr, data] of Object.entries(taxAssessments)) {
          const yr = parseInt(yearStr);
          const val = (data as any).value || (data as any).assdTtlValue || 0;
          if (yr && val > 0) assessmentHistory.push({ year: yr, value: val });
        }
      }
    }
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

    // Extract MLS comps (engine filters by property type)
    const mlsComps = mlsCompsResult.status === "fulfilled" ? (mlsCompsResult.value as MlsComp[]) : [];

    // Extract hazard data
    const hazardData = hazardResult.status === "fulfilled" ? hazardResult.value : null;
    const isFloodZone = hazardData?.seaLevelRise?.found || hazardData?.tsunami?.found || false;
    const floodZoneCode = (hazardData?.seaLevelRise?.attributes as any)?.FLD_ZONE || undefined;

    // Extract area median $/sqft for the sanity blend
    const stats = marketStatsResult.status === "fulfilled" ? marketStatsResult.value : null;
    const marketStats =
      stats?.medianPricePerSqft || stats?.medianPricePerSqftSfr || stats?.medianPricePerSqftCondo
        ? {
            medianPricePerSqft: stats.medianPricePerSqft,
            medianPricePerSqftSfr: stats.medianPricePerSqftSfr,
            medianPricePerSqftCondo: stats.medianPricePerSqftCondo,
          }
        : undefined;

    // List-to-sale ratio for this area
    let listToSaleRatio: number | undefined;
    try {
      const { getListToSaleRatio } = await import("@/lib/avm/avm-cache-service");
      const ratio = await getListToSaleRatio(zipCode, subdivision, propertyType);
      if (ratio && ratio.count >= 5) {
        listToSaleRatio = ratio.median;
      }
    } catch {
      /* ratio not available yet */
    }

    // Last sale data for time-adjusted valuation
    const lastSalePrice = propData?.sale?.amount?.saleAmt || propData?.sale?.amount?.salePrice || undefined;
    const lastSaleDate = propData?.sale?.amount?.saleTransDate || propData?.sale?.amount?.saleRecDate || undefined;

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
      listToSaleRatio,
      lastSalePrice: lastSalePrice && lastSalePrice > 1000 ? lastSalePrice : undefined,
      lastSaleDate,
      assessment,
      assessmentHistory,
      mlsComps,
      marketStats,
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
      `[Genie AVM] ${address}: $${result.value.toLocaleString()} (${result.confidence}, FSD ${result.fsd}%, ${result.methodology.compsUsed} comps, ${result.methodology.compsFilteredByType} type-mismatched comps filtered)`,
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Genie AVM] Error:", error);
    return NextResponse.json({ error: error.message || "AVM computation failed" }, { status: 500 });
  }
}
