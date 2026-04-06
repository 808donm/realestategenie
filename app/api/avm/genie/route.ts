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
 * Computes a Genie AVM v2 (hybrid ensemble valuation) for a property.
 * Implements four pillars: Hedonic, Repeat-Sales, CMA, and AI Validation.
 *
 * Query params:
 *   address        -- Property address (required)
 *   zipCode        -- ZIP code (required)
 *   beds           -- Bedrooms
 *   baths          -- Bathrooms
 *   sqft           -- Square footage
 *   yearBuilt      -- Year built
 *   lotSize        -- Lot size in sqft
 *   stories        -- Number of stories
 *   propertyType   -- e.g., "Residential"
 *   propertySubType -- e.g., "Single Family Residence", "Condominium"
 *   ownershipType  -- "Fee Simple" or "Leasehold"
 *   leaseExpiration -- ISO date for lease end
 *   subdivision    -- Subdivision/building name
 *   hoaFee         -- Monthly HOA fee
 *   lat            -- Latitude (for hazard lookup)
 *   lng            -- Longitude (for hazard lookup)
 *   lastSalePrice  -- Most recent sale price
 *   lastSaleDate   -- Most recent sale date (ISO)
 *   saleHistory    -- JSON array of {price, date} objects
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

    // Check cache (7-day TTL) - include subdivision in key for condo accuracy
    const subdivision = params.get("subdivision") || undefined;
    const cacheKey = buildPropertyCacheKey("unified", "genie-avm-v2", {
      address: address.toLowerCase().replace(/[^a-z0-9]/g, ""),
      zipCode,
      subdivision: subdivision?.toLowerCase().replace(/[^a-z0-9]/g, "") || "",
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

    // Parse all query params
    const beds = params.get("beds") ? Number(params.get("beds")) : undefined;
    const baths = params.get("baths") ? Number(params.get("baths")) : undefined;
    const sqft = params.get("sqft") ? Number(params.get("sqft")) : undefined;
    const yearBuilt = params.get("yearBuilt") ? Number(params.get("yearBuilt")) : undefined;
    const lotSize = params.get("lotSize") ? Number(params.get("lotSize")) : undefined;
    const stories = params.get("stories") ? Number(params.get("stories")) : undefined;
    const propertyType = params.get("propertyType") || undefined;
    const propertySubType = params.get("propertySubType") || undefined;
    const ownershipType = params.get("ownershipType") || undefined;
    const leaseExpiration = params.get("leaseExpiration") || undefined;
    const hoaFee = params.get("hoaFee") ? Number(params.get("hoaFee")) : undefined;
    const lat = params.get("lat") ? Number(params.get("lat")) : undefined;
    const lng = params.get("lng") ? Number(params.get("lng")) : undefined;

    // Parse sales history from query params
    let salesHistory: { price: number; date: string }[] = [];
    const saleHistoryParam = params.get("saleHistory");
    if (saleHistoryParam) {
      try {
        salesHistory = JSON.parse(saleHistoryParam);
      } catch { /* ignore parse errors */ }
    }
    // Also accept single lastSale params
    const lastSalePrice = params.get("lastSalePrice") ? Number(params.get("lastSalePrice")) : undefined;
    const lastSaleDate = params.get("lastSaleDate") || undefined;
    if (lastSalePrice && lastSaleDate && !salesHistory.some((s) => s.price === lastSalePrice)) {
      salesHistory.unshift({ price: lastSalePrice, date: lastSaleDate });
    }

    // ═══════════════════════════════════════════════════════════════
    // Fetch all data sources in parallel (no new API costs)
    // ═══════════════════════════════════════════════════════════════
    const cookie = request.headers.get("cookie") || "";
    const origin = request.nextUrl.origin;

    const [propertyResult, mlsCompsResult, hazardResult, hpiResult] = await Promise.allSettled([
      // Property data (assessments, sale history, features)
      fetch(
        `${origin}/api/integrations/attom/property?endpoint=expanded&address=${encodeURIComponent(address)}&postalcode=${zipCode}&pagesize=1`,
        { headers: { cookie } },
      ).then((r) => r.json()).catch(() => null),

      // MLS Comps - pass subdivision for building-level matching
      (async () => {
        try {
          let compsUrl = `${origin}/api/comps?address=${encodeURIComponent(address)}&zipCode=${zipCode}&compCount=20`;
          if (beds) compsUrl += `&beds=${beds}`;
          if (baths) compsUrl += `&baths=${baths}`;
          if (sqft) compsUrl += `&sqft=${sqft}`;
          if (propertyType) compsUrl += `&propertyType=${propertyType}`;
          if (subdivision) compsUrl += `&subdivision=${encodeURIComponent(subdivision)}`;
          if (yearBuilt) compsUrl += `&yearBuilt=${yearBuilt}`;
          const compsRes = await fetch(compsUrl, { headers: { cookie } });
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
            subdivision: c.subdivision || c.subdivisionName,
            propertySubType: c.propertySubType || c.propertyType,
          }));
        } catch { return []; }
      })(),

      // Hazard check
      lat && lng
        ? import("@/lib/integrations/hawaii-hazards-client").then(async ({ HawaiiHazardsClient }) => {
            const client = new HawaiiHazardsClient();
            return client.getPropertyHazardProfile(lat, lng);
          }).catch(() => null)
        : Promise.resolve(null),

      // HPI data (for temporal normalization) - state level for Hawaii
      import("@/lib/integrations/free-data/fred-trends-client").then(async ({ getSalesTrends }) => {
        // Extract state abbreviation from address or default to HI
        const stateMatch = address.match(/\b([A-Z]{2})\s*\d{5}\b/);
        const stateAbbrev = stateMatch?.[1] || "HI";
        return getSalesTrends({ stateAbbrev, startYear: 2022, endYear: 2026 });
      }).catch(() => null),
    ]);

    // ═══════════════════════════════════════════════════════════════
    // Extract property data
    // ═══════════════════════════════════════════════════════════════
    const propData = propertyResult.status === "fulfilled" ? propertyResult.value?.property?.[0] : null;

    // Assessment data
    const taxAssessments = propData?.assessment?.assessed || propData?.taxAssessments;
    let assessment = null;
    let assessmentHistory: { year: number; value: number }[] = [];
    if (taxAssessments && typeof taxAssessments === "object" && !Array.isArray(taxAssessments)) {
      for (const [yearStr, data] of Object.entries(taxAssessments)) {
        const yr = parseInt(yearStr);
        const val = (data as any).value || (data as any).assdTtlValue || 0;
        if (yr && val > 0) assessmentHistory.push({ year: yr, value: val });
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

    // Sales history from property data (supplement query params)
    if (propData?.saleHistory?.length) {
      for (const s of propData.saleHistory) {
        const amt = s.amount || s.saleAmt;
        const dt = s.date || s.recordingDate;
        if (amt > 0 && dt && !salesHistory.some((h) => h.price === amt && h.date === dt)) {
          salesHistory.push({ price: amt, date: dt });
        }
      }
    }
    // Also check sale.amount from property data
    if (propData?.sale?.amount?.saleAmt && propData?.sale?.amount?.saleTransDate) {
      const amt = propData.sale.amount.saleAmt;
      const dt = propData.sale.amount.saleTransDate;
      if (!salesHistory.some((h) => h.price === amt)) {
        salesHistory.push({ price: amt, date: dt });
      }
    }

    // Area market data (for hedonic pillar)
    const marketData = propData?.marketData || propData?.areaStats;
    const areaMedianPricePerSqft = marketData?.medianPricePerSqft
      || marketData?.avgPricePerSquareFoot
      || propData?.marketMedianPricePerSqft
      || undefined;
    const areaMedianPrice = marketData?.medianPrice
      || propData?.marketMedianPrice
      || undefined;

    // HPI data
    let areaHPI: { period: string; hpi: number }[] | undefined;
    if (hpiResult.status === "fulfilled" && hpiResult.value?.trends) {
      areaHPI = hpiResult.value.trends
        .filter((t: any) => t.hpi != null)
        .map((t: any) => ({ period: t.period, hpi: t.hpi }));
    }

    // MLS comps
    const mlsComps = mlsCompsResult.status === "fulfilled" ? (mlsCompsResult.value as MlsComp[]) : [];

    // Hazard data
    const hazardData = hazardResult.status === "fulfilled" ? hazardResult.value : null;
    const isFloodZone = hazardData?.seaLevelRise?.found || false;
    const floodZoneCode = (hazardData?.seaLevelRise?.attributes as any)?.FLD_ZONE || undefined;
    const tsunamiZone = hazardData?.tsunami?.found || false;
    const lavaFlowData = hazardData?.lavaFlow;
    const lavaFlowZone = lavaFlowData?.found ? ((lavaFlowData.attributes as any)?.zone || 9) : undefined;

    // External AVMs as cross-check references
    const externalAvms: { source: string; value: number }[] = [];
    const realieAvmVal = propData?.avm?.amount?.value;
    if (realieAvmVal) externalAvms.push({ source: "realie", value: realieAvmVal });

    // ═══════════════════════════════════════════════════════════════
    // Build input and compute
    // ═══════════════════════════════════════════════════════════════
    const avmInput: GenieAvmInput = {
      address,
      zipCode,
      beds,
      baths,
      sqft,
      yearBuilt,
      lotSize,
      stories,
      propertyType,
      propertySubType,
      ownershipType,
      leaseExpiration,
      subdivision,
      hoaFee,
      salesHistory: salesHistory.length > 0 ? salesHistory : undefined,
      assessment,
      assessmentHistory,
      areaMedianPricePerSqft,
      areaMedianPrice,
      areaHPI,
      mlsComps,
      isFloodZone,
      floodZoneCode,
      tsunamiZone,
      lavaFlowZone,
      externalAvms: externalAvms.length > 0 ? externalAvms : undefined,
      // Legacy fields
      rentcastAvm: null,
      realieAvm: realieAvmVal ? { value: realieAvmVal } : null,
    };

    const result = computeGenieAvm(avmInput);

    if (!result) {
      return NextResponse.json({ error: "Insufficient data for valuation" }, { status: 200 });
    }

    // Cache the result
    propertyCacheSet(cacheKey, result, "computed");
    propertyDbWrite(cacheKey, "genie-avm", result, "unified").catch(() => {});

    console.log(
      `[Genie AVM v2] ${address}: $${result.value.toLocaleString()} (${result.confidence} ${result.confidenceScore}/100, FSD ${(result.fsd * 100).toFixed(1)}%, ${result.methodology.compsUsed} comps, ${result.methodology.pillars.length} pillars)`,
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Genie AVM] Error:", error);
    return NextResponse.json({ error: error.message || "AVM computation failed" }, { status: 500 });
  }
}
