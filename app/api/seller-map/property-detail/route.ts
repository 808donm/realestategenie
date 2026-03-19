import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { RentcastProperty } from "@/lib/integrations/rentcast-client";
import {
  getConfiguredRentcastClient,
  fetchAndMergeSingleProperty,
} from "@/lib/integrations/property-data-service";

/**
 * GET /api/seller-map/property-detail
 *
 * Fetch full property detail for a single address, merging RentCast + Realie data
 * via the shared property-data-service (same merge/AVM logic as prospecting).
 *
 * Returns building info, tax assessments, sale history, owner info, and comps.
 *
 * Query params:
 *   address  — full property address (required)
 *   lat, lng — coordinates for comps search
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl;
    const address = url.searchParams.get("address");
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    const rentcast = await getConfiguredRentcastClient();

    // ── Fetch merged property via shared service (RentCast + Realie + AVM sanity check) ──
    const merged = await fetchAndMergeSingleProperty(address, {
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
    });

    // Also fetch the raw RentCast property for fields the shared service doesn't return
    // (features, zoning, hoa, owner, sale history, tax assessments, property taxes)
    let property: RentcastProperty | null = null;
    if (rentcast) {
      try {
        const results = await rentcast.searchProperties({ address, limit: 1 });
        if (results.length > 0) {
          property = results[0];
        }
      } catch (err: any) {
        console.error("[PropertyDetail] RentCast property error:", err.message);
      }
    }

    // Fetch AVM value estimate + comps from RentCast
    let comps: any[] = [];
    let avmValue: number | undefined;
    let avmLow: number | undefined;
    let avmHigh: number | undefined;
    if (rentcast) {
      try {
        const avmParams: Record<string, any> = {
          address,
          compCount: 10,
        };
        if (property?.bedrooms) avmParams.bedrooms = property.bedrooms;
        if (property?.bathrooms) avmParams.bathrooms = property.bathrooms;
        if (property?.squareFootage) avmParams.squareFootage = property.squareFootage;
        if (property?.propertyType) avmParams.propertyType = property.propertyType;

        const valueEstimate = await rentcast.getValueEstimate(avmParams);
        avmValue = valueEstimate.price;
        avmLow = valueEstimate.priceRangeLow;
        avmHigh = valueEstimate.priceRangeHigh;

        // Use subjectProperty to fill gaps in the property record
        const sp = valueEstimate.subjectProperty;
        if (sp && !property) {
          property = {
            id: sp.id,
            formattedAddress: sp.formattedAddress,
            addressLine1: sp.addressLine1,
            addressLine2: sp.addressLine2,
            city: sp.city,
            state: sp.state,
            stateFips: sp.stateFips,
            zipCode: sp.zipCode,
            county: sp.county,
            countyFips: sp.countyFips,
            latitude: sp.latitude,
            longitude: sp.longitude,
            propertyType: sp.propertyType as any,
            bedrooms: sp.bedrooms,
            bathrooms: sp.bathrooms,
            squareFootage: sp.squareFootage,
            lotSize: sp.lotSize,
            yearBuilt: sp.yearBuilt,
            lastSaleDate: sp.lastSaleDate,
            lastSalePrice: sp.lastSalePrice,
            assessorID: "",
            legalDescription: "",
            subdivision: "",
            zoning: "",
            ownerOccupied: false,
          } as any;
        } else if (sp && property) {
          property.bedrooms = property.bedrooms || sp.bedrooms;
          property.bathrooms = property.bathrooms || sp.bathrooms;
          property.squareFootage = property.squareFootage || sp.squareFootage;
          property.lotSize = property.lotSize || sp.lotSize;
          property.yearBuilt = property.yearBuilt || sp.yearBuilt;
          property.lastSaleDate = property.lastSaleDate || sp.lastSaleDate;
          property.lastSalePrice = property.lastSalePrice ?? sp.lastSalePrice;
        }

        comps = (valueEstimate.comparables || []).map((c) => ({
          id: c.id,
          address: c.formattedAddress,
          lat: c.latitude,
          lng: c.longitude,
          price: c.price,
          beds: c.bedrooms,
          baths: c.bathrooms,
          sqft: c.squareFootage,
          yearBuilt: c.yearBuilt,
          distance: c.distance,
          daysOnMarket: c.daysOnMarket,
          correlation: c.correlation,
          status: c.status,
          listingType: c.listingType,
          listedDate: c.listedDate,
        }));
      } catch (err: any) {
        console.error("[PropertyDetail] AVM/comps error:", err.message);
      }
    }

    // Fetch active/recent sale listings for this address from Rentcast
    let saleListings: any[] = [];
    if (rentcast && property) {
      try {
        const listingParams: Record<string, any> = {
          address: property.addressLine1,
          city: property.city,
          state: property.state,
          status: "Active",
          limit: 5,
        };
        if (property.zipCode) listingParams.zipCode = property.zipCode;
        const listings = await rentcast.getSaleListings(listingParams);
        saleListings = listings || [];
      } catch (err: any) {
        // Sale listing fetch is optional
        console.warn("[PropertyDetail] Sale listings error:", err.message);
      }
    }

    // Fetch market data for the property's zip code
    let marketData: Record<string, any> = {};
    const propZip = property?.zipCode || merged?.zipCode;
    if (rentcast && propZip) {
      try {
        const mkt = await rentcast.getMarketData({ zipCode: propZip });
        const sale = mkt.saleData;
        if (sale) {
          let priceTrend: number | undefined;
          if (sale.history) {
            const months = Object.keys(sale.history).sort();
            if (months.length >= 2) {
              const current = sale.history[months[months.length - 1]];
              const previous = sale.history[months[months.length - 2]];
              if (current?.medianPrice && previous?.medianPrice) {
                priceTrend = ((current.medianPrice - previous.medianPrice) / previous.medianPrice) * 100;
              }
            }
          }
          marketData = {
            marketMedianPrice: sale.medianPrice,
            marketMedianPricePerSqft: sale.medianPricePerSquareFoot,
            marketAvgDaysOnMarket: sale.averageDaysOnMarket,
            marketTotalListings: sale.totalListings,
            marketNewListings: sale.newListings,
            marketPriceTrend: priceTrend,
            marketMedianRent: mkt.rentalData?.medianRent,
          };
        }
      } catch (err: any) {
        console.warn("[PropertyDetail] Market data error:", err.message);
      }
    }

    // ── Use the shared service's merged AVM (with assessed-value sanity check) ──
    // The shared service's fetchAndMergeSingleProperty already picked the best AVM
    // by comparing RentCast and Realie estimates against assessed value.
    const mergedModelValue = merged?.modelValue;

    // Build response
    const detail = {
      // Overview
      address: property?.formattedAddress || merged?.addressFull || merged?.address || address,
      addressLine1: property?.addressLine1 || merged?.address,
      city: property?.city || merged?.city,
      state: property?.state || merged?.state,
      zipCode: property?.zipCode || merged?.zipCode,
      county: property?.county || merged?.county,
      lat: property?.latitude || merged?.latitude || (lat ? Number(lat) : undefined),
      lng: property?.longitude || merged?.longitude || (lng ? Number(lng) : undefined),
      propertyType: property?.propertyType || merged?.useCode,
      lastSaleDate: property?.lastSaleDate || merged?.transferDate,
      lastSalePrice: property?.lastSalePrice || merged?.transferPrice,
      ownerOccupied: property?.ownerOccupied ?? merged?.ownerOccupied,

      // Building
      bedrooms: property?.bedrooms || merged?.totalBedrooms,
      bathrooms: property?.bathrooms || merged?.totalBathrooms,
      squareFootage: property?.squareFootage || merged?.buildingArea,
      lotSize: property?.lotSize || merged?.acres,
      yearBuilt: property?.yearBuilt || merged?.yearBuilt,
      features: property?.features,
      zoning: property?.zoning,

      // Financial
      taxAssessments: property?.taxAssessments,
      propertyTaxes: property?.propertyTaxes,
      hoa: property?.hoa,
      // AVM — use the shared service's merged AVM (assessed-value sanity check applied)
      avmValue: avmValue,
      avmLow: avmLow,
      avmHigh: avmHigh,
      // Realie enrichment via shared merge
      equity: merged?.equityCurrentEstBal,
      ltv: merged?.LTVCurrentEstCombined,
      totalMarketValue: merged?.totalMarketValue,
      forecloseCode: merged?.forecloseCode,
      totalLienCount: merged?.totalLienCount,
      totalLienBalance: merged?.totalLienBalance,
      ownerParcelCount: merged?.ownerParcelCount,
      ownerResCount: merged?.ownerResCount,
      ownerComCount: merged?.ownerComCount,
      // Use the shared service's sanity-checked AVM as modelValue
      modelValue: mergedModelValue || avmValue,

      // Ownership
      owner: property?.owner,
      saleHistory: property?.history,

      // Comps
      comps,

      // Active/recent sale listings from Rentcast
      saleListings: saleListings.map((l) => ({
        address: l.formattedAddress,
        price: l.price,
        status: l.status,
        listedDate: l.listedDate,
        daysOnMarket: l.daysOnMarket,
        mlsNumber: l.mlsNumber,
        listingType: l.listingType,
        listingAgent: l.listingAgent,
      })),

      // Market context
      ...marketData,
    };

    return NextResponse.json(detail);
  } catch (error: any) {
    console.error("[PropertyDetail] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch property detail" },
      { status: 500 }
    );
  }
}
