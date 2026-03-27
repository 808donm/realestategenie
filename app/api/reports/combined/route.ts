import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/reports/combined?address=xxx
 * One-tap combined property report (MLS + Tax + AVM + Demographics + Hazards)
 * Fetches data from multiple sources in parallel and merges them
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const address = request.nextUrl.searchParams.get("address");
    if (!address) {
      return NextResponse.json({ error: "address parameter is required" }, { status: 400 });
    }

    const baseUrl = request.nextUrl.origin;

    // Fetch from all data sources in parallel
    const [attomResult, hazardsResult, demographicsResult] = await Promise.allSettled([
      // ATTOM property data (AVM + Tax + Sale + Building details)
      fetch(`${baseUrl}/api/integrations/attom/property?endpoint=expanded&address=${encodeURIComponent(address)}`, {
        headers: { cookie: request.headers.get("cookie") || "" },
      }).then((r) => r.json()),

      // Hawaii hazards (FEMA flood, lava, tsunami, etc.)
      fetch(`${baseUrl}/api/integrations/hawaii/hazards?address=${encodeURIComponent(address)}`, {
        headers: { cookie: request.headers.get("cookie") || "" },
      })
        .then((r) => r.json())
        .catch(() => null),

      // Demographics / neighborhood
      fetch(`${baseUrl}/api/integrations/attom/property?endpoint=community&address=${encodeURIComponent(address)}`, {
        headers: { cookie: request.headers.get("cookie") || "" },
      })
        .then((r) => r.json())
        .catch(() => null),
    ]);

    const property = attomResult.status === "fulfilled" ? attomResult.value?.property?.[0] : null;
    const hazards = hazardsResult.status === "fulfilled" ? hazardsResult.value : null;
    const demographics = demographicsResult.status === "fulfilled" ? demographicsResult.value : null;

    if (!property) {
      return NextResponse.json({ error: "No property data found for this address" }, { status: 404 });
    }

    // Build combined report
    const report = {
      address: property.address?.oneLine || address,
      generatedAt: new Date().toISOString(),

      // Property Details
      property: {
        type: property.summary?.propertyType || property.summary?.propType,
        beds: property.building?.rooms?.beds,
        baths: property.building?.rooms?.bathsFull ?? property.building?.rooms?.bathsTotal,
        sqft: property.building?.size?.livingSize || property.building?.size?.universalSize,
        yearBuilt: property.building?.summary?.yearBuilt || property.summary?.yearBuilt,
        lotSize: property.lot?.lotSize2
          ? `${property.lot.lotSize2.toFixed(2)} acres`
          : property.lot?.lotSize1
            ? `${property.lot.lotSize1.toLocaleString()} sqft`
            : null,
        stories: property.building?.summary?.storyDesc || property.building?.summary?.levels,
        parking: property.building?.parking?.prkgSpaces,
      },

      // Valuation
      valuation: {
        avm: property.avm?.amount?.value,
        avmLow: property.avm?.amount?.low,
        avmHigh: property.avm?.amount?.high,
        avmDate: property.avm?.eventDate,
        assessedValue: property.assessment?.assessed?.assdTtlValue,
        assessedLand: property.assessment?.assessed?.assdLandValue,
        assessedImprovement: property.assessment?.assessed?.assdImprValue,
        marketValue: property.assessment?.market?.mktTtlValue,
      },

      // Tax Info
      tax: {
        annualTax: property.assessment?.tax?.taxAmt,
        taxYear: property.assessment?.tax?.taxYear,
        taxRate: property.assessment?.tax?.taxPerSizeUnit,
      },

      // Sale History
      sale: {
        lastSalePrice: property.sale?.amount?.saleAmt || property.sale?.amount?.salePrice,
        lastSaleDate: property.sale?.amount?.saleTransDate,
        priorSalePrice: property.sale?.amount?.saleAmt2,
        priorSaleDate: property.sale?.amount?.saleTransDate2,
      },

      // Ownership
      ownership: {
        owner: property.owner?.owner1?.fullName,
        owner2: property.owner?.owner2?.fullName,
        absentee: property.owner?.absenteeOwnerStatus || (property.summary?.absenteeInd === "O" ? "Yes" : "No"),
        mailingAddress: property.owner?.mailingAddressOneLine,
      },

      // Mortgage
      mortgage: property.mortgage
        ? {
            loanAmount: property.mortgage.amount,
            lender: property.mortgage.lender?.fullName,
            loanType: property.mortgage.loanType,
            term: property.mortgage.term,
            rate: property.mortgage.interestRate,
          }
        : null,

      // Hazards
      hazards: hazards
        ? {
            floodZone: hazards.floodZone || hazards.femaFloodZone,
            floodRisk: hazards.floodRisk,
            lavaZone: hazards.lavaZone,
            tsunamiZone: hazards.tsunamiZone,
            slopeFailure: hazards.slopeFailure,
            erosion: hazards.erosion,
          }
        : null,

      // Demographics
      demographics: demographics?.community || demographics?.demographics || null,

      // Estimated Equity
      estimatedEquity:
        property.avm?.amount?.value && (property.sale?.amount?.saleAmt || property.sale?.amount?.salePrice)
          ? property.avm.amount.value - (property.sale.amount.saleAmt || property.sale.amount.salePrice)
          : null,
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Combined report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 },
    );
  }
}
