/**
 * RentCast Property Data API Client
 *
 * Provides access to 140M+ US property records, owner details, sale/rental
 * valuations (AVM), active listings, comparable properties, and aggregate
 * market statistics. From the same company as Realie but with rental AVM
 * and neighborhood/market data.
 *
 * API Documentation: https://developers.rentcast.io
 *
 * Authentication: API Key passed in X-Api-Key header
 * Base URL: https://api.rentcast.io/v1
 */

const DEFAULT_BASE_URL = "https://api.rentcast.io/v1";

// ---------------------------------------------------------------------------
// Types — Property Data (/properties)
// ---------------------------------------------------------------------------

/** Supported property types (pipe-separated for multi-select in queries).
 *  Case-sensitive — must match exactly. */
export type RentcastPropertyType =
  | "Single Family"
  | "Condo"
  | "Townhouse"
  | "Manufactured"
  | "Multi-Family"
  | "Apartment"
  | "Land";

export interface RentcastOwner {
  names: string[];
  /** "Individual" for persons, "Organization" for entities */
  type: "Individual" | "Organization";
  mailingAddress?: {
    id: string;
    formattedAddress: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    stateFips: string;
    zipCode: string;
  };
}

export interface RentcastFeatures {
  architectureType?: string;
  cooling?: boolean;
  coolingType?: string;
  exteriorType?: string;
  fireplace?: boolean;
  fireplaceType?: string;
  floorCount?: number;
  foundationType?: string;
  garage?: boolean;
  garageSpaces?: number;
  garageType?: string;
  heating?: boolean;
  heatingType?: string;
  pool?: boolean;
  poolType?: string;
  roofType?: string;
  roomCount?: number;
  unitCount?: number;
  viewType?: string;
}

export interface RentcastTaxAssessment {
  year: number;
  value: number;
  land: number;
  improvements: number;
}

export interface RentcastPropertyTax {
  year: number;
  total: number;
}

/** Property sale history entry (keyed by YYYY-MM-DD in response). */
export interface RentcastPropertySaleEvent {
  event: "Sale";
  date: string; // ISO 8601
  price: number;
}

export interface RentcastProperty {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  stateFips: string;
  zipCode: string;
  county: string;
  countyFips: string;
  latitude: number;
  longitude: number;
  propertyType: RentcastPropertyType;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  assessorID: string;
  legalDescription: string;
  subdivision: string;
  zoning: string;
  lastSaleDate: string | null; // ISO 8601
  lastSalePrice: number | null;
  ownerOccupied: boolean;
  hoa?: { fee: number };
  features?: RentcastFeatures;
  /** Keyed by tax year string, e.g. "2024" */
  taxAssessments?: Record<string, RentcastTaxAssessment>;
  /** Keyed by tax year string, e.g. "2024" */
  propertyTaxes?: Record<string, RentcastPropertyTax>;
  /** Sale history keyed by sale date, e.g. "2024-11-18" */
  history?: Record<string, RentcastPropertySaleEvent>;
  owner?: RentcastOwner;
}

// ---------------------------------------------------------------------------
// Types — Valuations / AVM (/avm)
// ---------------------------------------------------------------------------

export interface RentcastComparable {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  stateFips: string;
  zipCode: string;
  county: string;
  countyFips: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  /** Active / Inactive */
  status: string;
  price: number;
  /** "Standard" | "New Construction" | "Foreclosure" | "Short Sale" */
  listingType: string;
  listedDate: string; // ISO 8601
  removedDate: string; // ISO 8601
  lastSeenDate: string; // ISO 8601
  daysOnMarket: number;
  /** Distance from subject property, in miles */
  distance: number;
  /** Days since listing was last seen active */
  daysOld: number;
  /** 0-1, similarity ratio to subject property */
  correlation: number;
}

export interface RentcastSubjectProperty {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  stateFips: string;
  zipCode: string;
  county: string;
  countyFips: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
}

/** Response from /avm/value */
export interface RentcastValueEstimate {
  price: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  subjectProperty: RentcastSubjectProperty;
  comparables: RentcastComparable[];
}

/** Response from /avm/rent/long-term */
export interface RentcastRentEstimate {
  rent: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  subjectProperty: RentcastSubjectProperty;
  comparables: RentcastComparable[];
}

// ---------------------------------------------------------------------------
// Types — Listings (/listings)
// ---------------------------------------------------------------------------

export interface RentcastListingAgent {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface RentcastListingOffice {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface RentcastBuilder {
  name: string;
  development?: string;
  phone?: string;
  website?: string;
}

/** Listing history entry (keyed by YYYY-MM-DD in response). */
export interface RentcastListingHistoryEntry {
  /** "Sale Listing" | "Rental Listing" */
  event: string;
  price: number;
  /** "Standard" | "New Construction" | "Foreclosure" | "Short Sale" */
  listingType: string;
  listedDate: string; // ISO 8601
  removedDate: string | null;
  daysOnMarket: number;
}

export interface RentcastListing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  stateFips: string;
  zipCode: string;
  county: string;
  countyFips: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  hoa?: { fee: number };
  /** "Active" | "Inactive" */
  status: string;
  price: number;
  /** "Standard" | "New Construction" | "Foreclosure" | "Short Sale" */
  listingType: string;
  listedDate: string; // ISO 8601
  removedDate: string | null;
  createdDate: string; // ISO 8601
  lastSeenDate: string;
  daysOnMarket: number;
  mlsName?: string;
  mlsNumber?: string;
  listingAgent?: RentcastListingAgent;
  listingOffice?: RentcastListingOffice;
  /** Present only for new construction listings */
  builder?: RentcastBuilder;
  /** Listing history keyed by date, e.g. "2024-06-24" */
  history?: Record<string, RentcastListingHistoryEntry>;
}

// ---------------------------------------------------------------------------
// Types — Market Data (/markets)
// ---------------------------------------------------------------------------

/** Sale market statistics fields */
export interface RentcastSaleStats {
  averagePrice?: number;
  medianPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  averagePricePerSquareFoot?: number;
  medianPricePerSquareFoot?: number;
  minPricePerSquareFoot?: number;
  maxPricePerSquareFoot?: number;
  averageSquareFootage?: number;
  medianSquareFootage?: number;
  minSquareFootage?: number;
  maxSquareFootage?: number;
  averageDaysOnMarket?: number;
  medianDaysOnMarket?: number;
  minDaysOnMarket?: number;
  maxDaysOnMarket?: number;
  newListings?: number;
  totalListings?: number;
}

/** Rental market statistics fields */
export interface RentcastRentalStats {
  averageRent?: number;
  medianRent?: number;
  minRent?: number;
  maxRent?: number;
  averageRentPerSquareFoot?: number;
  medianRentPerSquareFoot?: number;
  minRentPerSquareFoot?: number;
  maxRentPerSquareFoot?: number;
  averageSquareFootage?: number;
  medianSquareFootage?: number;
  minSquareFootage?: number;
  maxSquareFootage?: number;
  averageDaysOnMarket?: number;
  medianDaysOnMarket?: number;
  minDaysOnMarket?: number;
  maxDaysOnMarket?: number;
  newListings?: number;
  totalListings?: number;
}

export interface RentcastSaleDataByPropertyType extends RentcastSaleStats {
  propertyType: string;
}

export interface RentcastSaleDataByBedrooms extends RentcastSaleStats {
  bedrooms: number;
}

export interface RentcastRentalDataByPropertyType extends RentcastRentalStats {
  propertyType: string;
}

export interface RentcastRentalDataByBedrooms extends RentcastRentalStats {
  bedrooms: number;
}

export interface RentcastSaleHistoryEntry extends RentcastSaleStats {
  date: string; // ISO 8601
  dataByPropertyType?: RentcastSaleDataByPropertyType[];
  dataByBedrooms?: RentcastSaleDataByBedrooms[];
}

export interface RentcastRentalHistoryEntry extends RentcastRentalStats {
  date: string; // ISO 8601
  dataByPropertyType?: RentcastRentalDataByPropertyType[];
  dataByBedrooms?: RentcastRentalDataByBedrooms[];
}

export interface RentcastSaleData extends RentcastSaleStats {
  lastUpdatedDate: string;
  dataByPropertyType?: RentcastSaleDataByPropertyType[];
  dataByBedrooms?: RentcastSaleDataByBedrooms[];
  /** Monthly history keyed by "YYYY-MM" */
  history?: Record<string, RentcastSaleHistoryEntry>;
}

export interface RentcastRentalData extends RentcastRentalStats {
  lastUpdatedDate: string;
  dataByPropertyType?: RentcastRentalDataByPropertyType[];
  dataByBedrooms?: RentcastRentalDataByBedrooms[];
  /** Monthly history keyed by "YYYY-MM", available from April 2020 */
  history?: Record<string, RentcastRentalHistoryEntry>;
}

export interface RentcastMarketData {
  id: string;
  zipCode: string;
  saleData?: RentcastSaleData;
  rentalData?: RentcastRentalData;
}

// ---------------------------------------------------------------------------
// Types — Query Parameters
// ---------------------------------------------------------------------------

export interface RentcastPropertySearchParams {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // miles, max 100
  propertyType?: string; // pipe-separated for multiple, e.g. "Single Family|Condo"
  bedrooms?: string; // range "1:3" or multi "1|3"
  bathrooms?: string;
  squareFootage?: string;
  lotSize?: string;
  yearBuilt?: string;
  saleDateRange?: string;
  limit?: number; // 1-500, default 50
  offset?: number;
  includeTotalCount?: boolean;
}

export interface RentcastAvmParams {
  address?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  maxRadius?: number; // miles
  daysOld?: number;
  compCount?: number; // 5-25, default 15
  lookupSubjectAttributes?: boolean; // default true
}

export interface RentcastListingSearchParams {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  propertyType?: string;
  bedrooms?: string;
  bathrooms?: string;
  squareFootage?: string;
  lotSize?: string;
  yearBuilt?: string;
  price?: string;
  status?: "Active" | "Inactive";
  /** Days since listed, min 1. Supports numeric ranges (e.g. "30:90"). */
  daysOld?: string;
  limit?: number; // 1-500
  offset?: number;
  includeTotalCount?: boolean;
}

export interface RentcastMarketParams {
  /** Required — a valid 5-digit US zip code */
  zipCode: string;
  dataType?: "Sale" | "Rental" | "All"; // default "All"
  historyRange?: number; // months of history, default 12
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class RentcastClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    console.log(`[Rentcast] API request: ${url.toString()}`);

    const start = Date.now();
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Api-Key": this.apiKey,
      },
    });

    // Log API call (non-blocking)
    try {
      const { logApiCall } = await import("@/lib/api-call-logger");
      logApiCall({ provider: "rentcast", endpoint, method: "GET", statusCode: response.status, responseTimeMs: Date.now() - start });
    } catch { /* ignore in non-Next.js contexts */ }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        `[Rentcast] API error ${response.status}: ${errorBody.slice(0, 500)}`
      );
      throw new Error(
        `Rentcast API error ${response.status}: ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  // -------------------------------------------------------------------------
  // Property Data (/properties)
  // -------------------------------------------------------------------------

  /** Search property records by area, address, or coordinates. */
  async searchProperties(
    params: RentcastPropertySearchParams
  ): Promise<RentcastProperty[]> {
    return this.request<RentcastProperty[]>("/properties", params as any);
  }

  /** Get a single property record by its Rentcast ID. */
  async getPropertyById(id: string): Promise<RentcastProperty> {
    return this.request<RentcastProperty>(
      `/properties/${encodeURIComponent(id)}`
    );
  }

  /** Get random property records (useful for testing). */
  async getRandomProperties(limit = 5): Promise<RentcastProperty[]> {
    return this.request<RentcastProperty[]>("/properties/random", { limit });
  }

  // -------------------------------------------------------------------------
  // Valuations / AVM (/avm)
  // -------------------------------------------------------------------------

  /** Get a sale value estimate with comparables. */
  async getValueEstimate(
    params: RentcastAvmParams
  ): Promise<RentcastValueEstimate> {
    return this.request<RentcastValueEstimate>("/avm/value", params as any);
  }

  /** Get a long-term rent estimate with comparables. */
  async getRentEstimate(
    params: RentcastAvmParams
  ): Promise<RentcastRentEstimate> {
    return this.request<RentcastRentEstimate>(
      "/avm/rent/long-term",
      params as any
    );
  }

  // -------------------------------------------------------------------------
  // Listings (/listings)
  // -------------------------------------------------------------------------

  /** Search active/inactive sale listings. */
  async getSaleListings(
    params: RentcastListingSearchParams
  ): Promise<RentcastListing[]> {
    return this.request<RentcastListing[]>("/listings/sale", params as any);
  }

  /** Get a single sale listing by ID. */
  async getSaleListingById(id: string): Promise<RentcastListing> {
    return this.request<RentcastListing>(
      `/listings/sale/${encodeURIComponent(id)}`
    );
  }

  /** Search active/inactive long-term rental listings. */
  async getRentalListings(
    params: RentcastListingSearchParams
  ): Promise<RentcastListing[]> {
    return this.request<RentcastListing[]>(
      "/listings/rental/long-term",
      params as any
    );
  }

  /** Get a single rental listing by ID. */
  async getRentalListingById(id: string): Promise<RentcastListing> {
    return this.request<RentcastListing>(
      `/listings/rental/long-term/${encodeURIComponent(id)}`
    );
  }

  // -------------------------------------------------------------------------
  // Market Data (/markets)
  // -------------------------------------------------------------------------

  /** Get aggregate sale & rental market statistics for a zip code / city. */
  async getMarketData(
    params: RentcastMarketParams
  ): Promise<RentcastMarketData> {
    return this.request<RentcastMarketData>("/markets", params as any);
  }

  // -------------------------------------------------------------------------
  // Connection Test
  // -------------------------------------------------------------------------

  /** Test the API key by fetching a random property record. */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const result = await this.getRandomProperties(1);
      if (Array.isArray(result) && result.length > 0) {
        return {
          success: true,
          message: `Connected to Rentcast API. Sample: ${result[0].formattedAddress}`,
        };
      }
      return {
        success: false,
        message: "Rentcast API returned an empty response.",
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Rentcast API connection failed: ${err.message}`,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Mapper — RentcastProperty → RealieParcel (for scoring engine compatibility)
// ---------------------------------------------------------------------------

import type { RealieParcel } from "./realie-client";

/**
 * Convert a RentcastProperty to a RealieParcel shape so the existing seller
 * motivation scoring engine can process it without changes.
 */
export function mapRentcastToRealieParcel(rc: RentcastProperty): RealieParcel {
  // Find the most recent tax assessment value
  let totalAssessedValue: number | undefined;
  let assessedYear: number | undefined;
  if (rc.taxAssessments) {
    const years = Object.keys(rc.taxAssessments).sort().reverse();
    if (years.length > 0) {
      const latest = rc.taxAssessments[years[0]];
      totalAssessedValue = latest.value;
      assessedYear = latest.year;
    }
  }

  // Tax assessment trend: compute annualized growth from multi-year assessments
  let taxAssessmentTrendPct: number | undefined;
  if (rc.taxAssessments) {
    const sortedYears = Object.keys(rc.taxAssessments).sort();
    if (sortedYears.length >= 2) {
      const oldest = rc.taxAssessments[sortedYears[0]];
      const newest = rc.taxAssessments[sortedYears[sortedYears.length - 1]];
      const yearSpan = newest.year - oldest.year;
      if (oldest.value > 0 && yearSpan > 0) {
        const totalGrowth = ((newest.value - oldest.value) / oldest.value) * 100;
        taxAssessmentTrendPct = totalGrowth / yearSpan; // annualized
      }
    }
  }

  // Derive transfer date from lastSaleDate or most recent history entry
  let transferDate: string | undefined;
  let transferPrice: number | undefined;
  if (rc.lastSaleDate || rc.lastSalePrice) {
    console.log(`[Rentcast→Parcel] ${rc.formattedAddress}: lastSaleDate=${rc.lastSaleDate}, lastSalePrice=${rc.lastSalePrice}`);
  }
  if (rc.lastSaleDate) {
    transferDate = rc.lastSaleDate;
    transferPrice = rc.lastSalePrice ?? undefined;
  } else if (rc.history) {
    const dates = Object.keys(rc.history).sort().reverse();
    if (dates.length > 0) {
      const latest = rc.history[dates[0]];
      transferDate = latest.date;
      transferPrice = latest.price;
    }
  }

  // Find original purchase price from sale history chain
  // Use the earliest sale with a price > 0 as the purchase price
  let purchasePrice: number | undefined;
  if (rc.history) {
    const sortedDates = Object.keys(rc.history).sort();
    for (const d of sortedDates) {
      if (rc.history[d].price > 0) {
        purchasePrice = rc.history[d].price;
        break;
      }
    }
  }
  // Fall back to lastSalePrice if no history chain
  if (!purchasePrice && rc.lastSalePrice) {
    purchasePrice = rc.lastSalePrice;
  }

  // Appreciation: compare purchase price to current estimated value
  // Use lastSalePrice as market proxy if no AVM is available yet
  const currentValue = rc.lastSalePrice ?? totalAssessedValue;
  let appreciationPct: number | undefined;
  if (purchasePrice && currentValue && currentValue !== purchasePrice && purchasePrice > 0) {
    appreciationPct = ((currentValue - purchasePrice) / purchasePrice) * 100;
  }

  // Owner type: map RentCast "Organization" to more specific signals
  // Also check owner name for trust/estate/LLC/corp patterns
  let ownerType: string | undefined;
  if (rc.owner?.type) {
    ownerType = rc.owner.type; // "Individual" or "Organization"
  }
  const ownerNames = rc.owner?.names?.join(" ") || "";
  if (ownerNames) {
    const upper = ownerNames.toUpperCase();
    if (/\bTRUST\b/.test(upper) || /\bTRUSTEE\b/.test(upper)) {
      ownerType = "Trust";
    } else if (/\bLLC\b/.test(upper) || /\bINC\b/.test(upper) || /\bCORP\b/.test(upper)) {
      ownerType = "Corporate";
    } else if (/\bESTATE\b/.test(upper)) {
      ownerType = "Estate";
    } else if (/\bBANK\b/.test(upper) || /\bLENDER\b/.test(upper) || /\bMORTGAGE\b/.test(upper)) {
      ownerType = "Bank/REO";
    }
  }

  // Owner address for absentee detection
  const ownerAddr = rc.owner?.mailingAddress;

  return {
    _id: rc.id,
    latitude: rc.latitude,
    longitude: rc.longitude,

    // Address
    address: rc.addressLine1,
    addressFull: rc.formattedAddress,
    city: rc.city,
    state: rc.state,
    zipCode: rc.zipCode,
    county: rc.county,

    // Owner
    ownerName: rc.owner?.names?.join(", "),
    ownerType,
    ownerAddressLine1: ownerAddr?.addressLine1,
    ownerAddressFull: ownerAddr?.formattedAddress,
    ownerCity: ownerAddr?.city,
    ownerState: ownerAddr?.state,
    ownerZipCode: ownerAddr?.zipCode,

    // Property characteristics
    residential: rc.propertyType === "Single Family" || rc.propertyType === "Townhouse",
    condo: rc.propertyType === "Condo",
    yearBuilt: rc.yearBuilt,
    totalBedrooms: rc.bedrooms,
    totalBathrooms: rc.bathrooms,
    buildingArea: rc.squareFootage,
    landArea: rc.lotSize,
    pool: rc.features?.pool,
    fireplace: rc.features?.fireplace,
    garage: rc.features?.garage,
    garageCount: rc.features?.garageSpaces,
    stories: rc.features?.floorCount,

    // Assessment / Tax
    totalAssessedValue,
    assessedYear,
    taxAssessmentTrendPct,

    // Sale / Transfer — used by ownership duration & transfer recency scoring
    transferDate,
    transferPrice,
    purchasePrice,
    ownershipStartDate: transferDate, // Best proxy from RentCast data

    // Appreciation
    appreciationPct,

    // Use lastSalePrice as a rough market value proxy when no AVM is available.
    // This enables tax anomaly scoring (assessed vs market gap).
    modelValue: rc.lastSalePrice ?? undefined,

    // HOA
    hoaFee: rc.hoa?.fee,

    // RentCast's ownerOccupied boolean — direct absentee signal
    ownerOccupied: rc.ownerOccupied,

    // RentCast doesn't provide these — scoring factors will gracefully skip:
    //   LTVCurrentEstCombined, equityCurrentEstBal,
    //   forecloseCode, totalLienCount, totalLienBalance, ownerParcelCount
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a RentcastClient using an explicit key or the RENTCAST_API_KEY env var.
 */
export function createRentcastClient(apiKey?: string): RentcastClient | null {
  const key = apiKey || process.env.RENTCAST_API_KEY;
  if (!key) {
    return null;
  }
  return new RentcastClient({ apiKey: key });
}

// ---------------------------------------------------------------------------
// ATTOM-compatible Mappers
// ---------------------------------------------------------------------------

/**
 * Convert ATTOM-style query parameters to RentCast search parameters.
 * Used by the property route to translate prospecting module requests.
 */
export function mapAttomParamsToRentcast(
  endpoint: string,
  params: Record<string, any>
): RentcastPropertySearchParams | null {
  const propertyEndpoints = [
    "expanded", "detail", "detailowner", "detailmortgage",
    "detailmortgageowner", "profile", "snapshot",
    "assessment", "assessmentsnapshot",
    "sale", "salesnapshot", "saleshistory", "saleshistorybasic",
    "saleshistoryexpanded", "saleshistorysnapshot",
    "avm", "attomavm", "avmhistory",
    "parcelboundary", "id",
    "comparables",
  ];

  if (!propertyEndpoints.includes(endpoint)) {
    return null;
  }

  const mapped: RentcastPropertySearchParams = {};

  // Address
  if (params.address1 && params.address2) {
    mapped.address = `${params.address1}, ${params.address2}`;
  } else if (params.address) {
    mapped.address = params.address;
  }

  // Zip code
  if (params.postalcode || params.postalCode) {
    mapped.zipCode = params.postalcode || params.postalCode;
  }

  // Lat/Lng/Radius
  if (params.latitude && params.longitude) {
    mapped.latitude = Number(params.latitude);
    mapped.longitude = Number(params.longitude);
    if (params.radius) mapped.radius = Number(params.radius);
  }

  // Property type — map ATTOM numeric indicators to RentCast string types
  const propType = params.propertytype || params.propertyType;
  if (propType) {
    const typeMap: Record<string, string> = {
      "SFR": "Single Family",
      "CONDO": "Condo",
      "APARTMENT": "Multi-Family",
      "MOBILE": "Manufactured",
      "LAND": "Land",
      // ATTOM numeric codes
      "10": "Single Family",
      "11": "Condo",
    };
    mapped.propertyType = typeMap[propType] || propType;
  }

  // Beds / Baths — RentCast uses range strings "min:max"
  if (params.minBeds || params.maxBeds) {
    mapped.bedrooms = `${params.minBeds || ""}:${params.maxBeds || ""}`;
  }
  if (params.minBathsTotal || params.maxBathsTotal) {
    mapped.bathrooms = `${params.minBathsTotal || ""}:${params.maxBathsTotal || ""}`;
  }

  // Size
  if (params.minUniversalSize || params.maxUniversalSize) {
    mapped.squareFootage = `${params.minUniversalSize || ""}:${params.maxUniversalSize || ""}`;
  }

  // Year built
  if (params.minYearBuilt || params.maxYearBuilt) {
    mapped.yearBuilt = `${params.minYearBuilt || ""}:${params.maxYearBuilt || ""}`;
  }

  // Sale date range for RentCast
  if (params.startSaleSearchDate || params.endSaleSearchDate) {
    const start = params.startSaleSearchDate?.replace(/\//g, "-");
    const end = params.endSaleSearchDate?.replace(/\//g, "-");
    if (start) mapped.saleDateRange = `${start}:${end || ""}`;
  }

  // Pagination — RentCast uses limit/offset
  const pageSize = params.pagesize || 25;
  const page = params.page || 1;
  mapped.limit = Math.min(pageSize, 500);
  mapped.offset = (page - 1) * pageSize;

  return mapped;
}

/**
 * Convert a RentCast property record to the ATTOM-compatible shape
 * used by the prospecting module and property detail UI.
 */
export function mapRentcastToAttomShape(rc: RentcastProperty): any {
  // Parse owner names
  const ownerNames = rc.owner?.names || [];
  const owner1 = ownerNames[0];
  const owner2 = ownerNames[1];

  // Owner type detection from names
  let corporateIndicator = "N";
  const fullName = ownerNames.join(" ").toUpperCase();
  if (/\b(LLC|INC|CORP|LTD|LP|TRUST|TRUSTEE|BANK|ASSOC)\b/.test(fullName)) {
    corporateIndicator = "Y";
  }
  if (rc.owner?.type === "Organization") {
    corporateIndicator = "Y";
  }

  // Determine absentee status
  const ownerOccupied = rc.ownerOccupied;
  const absenteeStatus = ownerOccupied === false ? "A" : ownerOccupied === true ? "O" : undefined;

  // Owner mailing address
  const ownerMailing = rc.owner?.mailingAddress;
  const mailingOneLine = ownerMailing
    ? [ownerMailing.addressLine1, ownerMailing.addressLine2, ownerMailing.city, ownerMailing.state, ownerMailing.zipCode]
        .filter(Boolean).join(", ")
    : undefined;

  // Most recent tax assessment
  let assdTtlValue: number | undefined;
  let assdYear: number | undefined;
  let taxAmt: number | undefined;
  let taxYear: number | undefined;
  if (rc.taxAssessments) {
    const years = Object.keys(rc.taxAssessments).sort().reverse();
    if (years.length > 0) {
      const latest = rc.taxAssessments[years[0]];
      assdTtlValue = latest.value;
      assdYear = latest.year;
    }
  }
  if (rc.propertyTaxes) {
    const years = Object.keys(rc.propertyTaxes).sort().reverse();
    if (years.length > 0) {
      const latest = rc.propertyTaxes[years[0]];
      taxAmt = latest.total;
      taxYear = latest.year;
    }
  }

  // Assessment history for multi-year trend analysis
  const assessmentHistory = rc.taxAssessments
    ? Object.entries(rc.taxAssessments)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, a]) => ({
          assessed: { assdTtlValue: a.value, assdImprValue: a.improvements, assdLandValue: a.land },
          market: { mktTtlValue: a.value },
          tax: { taxAmt: rc.propertyTaxes?.[String(a.year)]?.total, taxYear: a.year },
          assessedYear: a.year,
        }))
    : undefined;

  // Sale history — get earliest and most recent
  let saleAmt: number | undefined;
  let saleDate: string | undefined;
  if (rc.lastSaleDate) {
    saleDate = rc.lastSaleDate;
    saleAmt = rc.lastSalePrice ?? undefined;
  } else if (rc.history) {
    const dates = Object.keys(rc.history).sort().reverse();
    if (dates.length > 0) {
      const latest = rc.history[dates[0]];
      saleDate = latest.date;
      saleAmt = latest.price;
    }
  }

  // Price per sqft
  const pricePerSqft = saleAmt && rc.squareFootage
    ? Math.round(saleAmt / rc.squareFootage)
    : undefined;

  // Generate a stable numeric ID from RentCast string ID
  const numericId = hashStringToNumber(rc.id);

  return {
    identifier: {
      apn: rc.assessorID || undefined,
      fips: rc.countyFips || undefined,
      obPropId: rc.id,
      attomId: numericId,
      Id: numericId,
    },
    address: {
      oneLine: rc.formattedAddress,
      line1: rc.addressLine1,
      line2: rc.addressLine2 || undefined,
      locality: rc.city,
      countrySubd: rc.state,
      postal1: rc.zipCode,
    },
    location: {
      latitude: String(rc.latitude),
      longitude: String(rc.longitude),
    },
    owner: {
      owner1: owner1 ? { fullName: owner1 } : undefined,
      owner2: owner2 ? { fullName: owner2 } : undefined,
      corporateIndicator,
      absenteeOwnerStatus: absenteeStatus,
      mailingAddressOneLine: mailingOneLine,
      ownerOccupied: ownerOccupied === true ? "Y" : ownerOccupied === false ? "N" : undefined,
    },
    building: {
      size: {
        livingSize: rc.squareFootage || undefined,
        universalSize: rc.squareFootage || undefined,
        bldgSize: rc.squareFootage || undefined,
      },
      rooms: {
        beds: rc.bedrooms || undefined,
        bathsFull: rc.bathrooms || undefined,
        bathsTotal: rc.bathrooms || undefined,
      },
      summary: {
        yearBuilt: rc.yearBuilt || undefined,
        levels: rc.features?.floorCount || undefined,
      },
      construction: {
        constructionType: rc.features?.exteriorType || undefined,
        roofCover: rc.features?.roofType || undefined,
      },
      interior: {
        fplcCount: rc.features?.fireplace ? 1 : undefined,
      },
      parking: {
        garageType: rc.features?.garageType || undefined,
        prkgSpaces: rc.features?.garageSpaces ? String(rc.features.garageSpaces) : undefined,
      },
    },
    lot: {
      lotSize1: rc.lotSize || undefined,
      poolInd: rc.features?.pool ? "Y" : undefined,
      siteZoningIdent: rc.zoning || undefined,
    },
    summary: {
      propType: rc.propertyType || undefined,
      propertyType: rc.propertyType || undefined,
      yearBuilt: rc.yearBuilt || undefined,
      absenteeInd: ownerOccupied === false ? "ABSENTEE OWNER"
        : ownerOccupied === true ? "OWNER OCCUPIED"
        : undefined,
    },
    assessment: {
      assessed: {
        assdTtlValue: assdTtlValue || undefined,
      },
      market: {
        mktTtlValue: rc.lastSalePrice || assdTtlValue || undefined,
      },
      tax: {
        taxAmt: taxAmt || undefined,
        taxYear: taxYear || assdYear || undefined,
      },
    },
    avm: rc.lastSalePrice ? {
      amount: {
        value: rc.lastSalePrice,
      },
    } : undefined,
    sale: (saleAmt || saleDate) ? {
      amount: {
        saleAmt: saleAmt || undefined,
        salePrice: saleAmt || undefined,
        saleTransDate: saleDate || undefined,
        saleRecDate: saleDate || undefined,
      },
      calculation: {
        pricePerSizeUnit: pricePerSqft || undefined,
      },
    } : undefined,
    hoa: rc.hoa?.fee ? { fee: rc.hoa.fee } : undefined,
    homeEquity: undefined,
    assessmenthistory: assessmentHistory,
    // Sale history from RentCast history dict (keyed by date)
    saleHistory: rc.history
      ? Object.entries(rc.history)
          .filter(([, entry]) => entry.event === "Sale" && (entry.date || entry.price))
          .map(([date, entry]) => ({
            date: entry.date || date,
            amount: entry.price || undefined,
            _source: "rentcast",
          }))
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      : undefined,
    _source: "rentcast",
  };
}

/**
 * Generate a stable numeric hash from a string ID.
 * Used to create ATTOM-compatible numeric IDs from RentCast string IDs.
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
