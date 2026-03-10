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
// Types
// ---------------------------------------------------------------------------

/** Supported property types (pipe-separated for multi-select in queries) */
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
  type: string; // "Individual", etc.
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

export interface RentcastSaleEvent {
  event: string;
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
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  ownerOccupied: boolean;
  hoa?: { fee: number };
  features?: RentcastFeatures;
  taxAssessments?: Record<string, RentcastTaxAssessment>;
  propertyTaxes?: Record<string, RentcastPropertyTax>;
  history?: Record<string, RentcastSaleEvent>;
  owner?: RentcastOwner;
}

// -- AVM / Valuation types --------------------------------------------------

export interface RentcastComparable {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  price: number;
  listingType: string; // "Standard" | "New Construction" | "Foreclosure" | "Short Sale"
  listedDate: string;
  removedDate: string;
  lastSeenDate: string;
  daysOnMarket: number;
  correlation?: number;
}

export interface RentcastValuation {
  price: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  latitude: number;
  longitude: number;
  comparables: RentcastComparable[];
}

// -- Listing types -----------------------------------------------------------

export interface RentcastListing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  price: number;
  listingType: string;
  status: string;
  listedDate: string;
  removedDate: string | null;
  lastSeenDate: string;
  daysOnMarket: number;
  mlsName?: string;
  mlsNumber?: string;
  listingAgent?: { name: string; phone?: string; email?: string };
  listingOffice?: { name: string; phone?: string; email?: string };
  hoa?: { fee: number };
}

// -- Market data types -------------------------------------------------------

export interface RentcastMarketStats {
  averagePrice?: number;
  medianPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  averagePricePerSquareFoot?: number;
  averageSquareFootage?: number;
  averageDaysOnMarket?: number;
  medianDaysOnMarket?: number;
  totalListings?: number;
  newListings?: number;
  dataByPropertyType?: Record<string, Record<string, number>>;
  dataByBedroomCount?: Record<string, Record<string, number>>;
  history?: Array<Record<string, unknown>>;
}

export interface RentcastMarketData {
  zipCode: string;
  city: string;
  state: string;
  county: string;
  saleData?: RentcastMarketStats;
  rentalData?: RentcastMarketStats;
}

// -- Query parameter types ---------------------------------------------------

export interface RentcastPropertySearchParams {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // miles, max 100
  propertyType?: string; // pipe-separated for multiple
  bedrooms?: string; // supports range "1:3" or multi "1|3"
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
  lookupSubjectAttributes?: boolean;
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
  price?: string;
  status?: string; // "Active" | "Inactive"
  daysOld?: number;
  limit?: number; // 1-500
  offset?: number;
}

export interface RentcastMarketParams {
  zipCode?: string;
  city?: string;
  state?: string;
  dataType?: "Sale" | "Rental" | "All";
  historyRange?: number; // months
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
  // Property Data
  // -------------------------------------------------------------------------

  /** Search property records by area, address, or coordinates. */
  async searchProperties(
    params: RentcastPropertySearchParams
  ): Promise<RentcastProperty[]> {
    return this.request<RentcastProperty[]>("/properties", params as any);
  }

  /** Get a single property record by its Rentcast ID. */
  async getPropertyById(id: string): Promise<RentcastProperty> {
    return this.request<RentcastProperty>(`/properties/${encodeURIComponent(id)}`);
  }

  /** Get random property records (useful for testing). */
  async getRandomProperties(limit = 5): Promise<RentcastProperty[]> {
    return this.request<RentcastProperty[]>("/properties/random", { limit });
  }

  // -------------------------------------------------------------------------
  // Valuations (AVM)
  // -------------------------------------------------------------------------

  /** Get a sale value estimate with comparables. */
  async getValueEstimate(params: RentcastAvmParams): Promise<RentcastValuation> {
    return this.request<RentcastValuation>("/avm/value", params as any);
  }

  /** Get a long-term rent estimate with comparables. */
  async getRentEstimate(params: RentcastAvmParams): Promise<RentcastValuation> {
    return this.request<RentcastValuation>("/avm/rent/long-term", params as any);
  }

  // -------------------------------------------------------------------------
  // Listings
  // -------------------------------------------------------------------------

  /** Search active/inactive sale listings. */
  async getSaleListings(
    params: RentcastListingSearchParams
  ): Promise<RentcastListing[]> {
    return this.request<RentcastListing[]>("/listings/sale", params as any);
  }

  /** Get a single sale listing by ID. */
  async getSaleListingById(id: string): Promise<RentcastListing> {
    return this.request<RentcastListing>(`/listings/sale/${encodeURIComponent(id)}`);
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
  // Market Data
  // -------------------------------------------------------------------------

  /** Get aggregate sale & rental market statistics for a zip code / city. */
  async getMarketData(params: RentcastMarketParams): Promise<RentcastMarketData> {
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
