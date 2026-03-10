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

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Api-Key": this.apiKey,
      },
    });

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

  // Derive transfer date from lastSaleDate or most recent history entry
  let transferDate: string | undefined;
  let transferPrice: number | undefined;
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

    // Sale / Transfer — used by ownership duration & transfer recency scoring
    transferDate,
    transferPrice,
    ownershipStartDate: transferDate, // Best proxy from RentCast data

    // Use lastSalePrice as a rough market value proxy when no AVM is available.
    // This enables tax anomaly scoring (assessed vs market gap).
    modelValue: rc.lastSalePrice ?? undefined,

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
export function createRentcastClient(apiKey?: string): RentcastClient {
  const key = apiKey || process.env.RENTCAST_API_KEY;
  if (!key) {
    throw new Error(
      "Rentcast API key is required. Set RENTCAST_API_KEY env var or pass apiKey."
    );
  }
  return new RentcastClient({ apiKey: key });
}
