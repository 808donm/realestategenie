/**
 * Realie.ai Property Data API Client
 *
 * Primary source for property data: ownership, tax assessments, sales history,
 * valuations, and parcel boundaries sourced directly from county records.
 *
 * API Documentation: https://docs.realie.ai
 *
 * Authentication: API Key passed in x-api-key header
 * Base URL: https://api.realie.ai/v1
 */

const DEFAULT_BASE_URL = "https://app.realie.ai/api/public";

// ── Response types ──────────────────────────────────────────────────────────
// Realie returns data in a normalized format that we map to our internal
// ATTOM-compatible shape so the rest of the app doesn't need to change.

export interface RealieParcel {
  _id?: string;
  siteId?: string;
  parcelId?: string;
  fipsState?: string;
  fipsCounty?: string;
  county?: string;

  // Address fields (flat)
  address?: string;
  addressFull?: string;
  addressFormal?: string;
  addressFullUSPS?: string;
  addressRaw?: string;
  streetNumber?: string;
  street?: string;
  streetName?: string;
  streetType?: string;
  streetDirectionPrefix?: string;
  streetDirectionSuffix?: string;
  unitNumber?: string;
  city?: string;
  cityUSPS?: string;
  state?: string;
  zipCode?: string;
  zipCodePlusFour?: string;

  // Location
  latitude?: number;
  longitude?: number;
  location?: { type?: string; coordinates?: number[] };

  // Owner
  ownerName?: string;
  ownerAddressLine1?: string;
  ownerAddressFull?: string;
  ownerCity?: string;
  ownerState?: string;
  ownerZipCode?: string;
  ownerZipCodePlusFour?: string;
  ownerResCount?: number;
  ownerComCount?: number;
  ownerParcelCount?: number;
  ownerOriginCode?: string;
  ownershipStartDate?: string;

  // Property characteristics
  residential?: boolean;
  condo?: boolean;
  useCode?: string;
  zoningCode?: string;
  yearBuilt?: number;
  totalBedrooms?: number;
  totalBathrooms?: number;
  buildingArea?: number;
  landArea?: number;
  acres?: number;
  stories?: number;
  buildingCount?: number;
  constructionType?: string;
  wallType?: string;
  roofType?: string;
  roofStyle?: string;
  floorType?: string;
  foundationType?: string;
  basementType?: string;
  garageCount?: number;
  garageType?: string;
  pool?: boolean;
  poolCode?: string;
  fireplace?: boolean | null;
  fireplaceCount?: number | null;
  garage?: boolean;

  // Assessment / Tax
  totalAssessedValue?: number;
  assessedBuildingValue?: number;
  assessedLandValue?: number;
  totalBuildingValue?: number;
  totalLandValue?: number;
  totalMarketValue?: number;
  marketValueYear?: number;
  assessedYear?: number;
  taxValue?: number;
  taxYear?: number;
  taxRateCodeArea?: string;

  // Valuation (AVM)
  modelValue?: number;
  modelValueMin?: number;
  modelValueMax?: number;

  // Sale / Transfer
  transferPrice?: number;
  transferDate?: string;
  transferDateObject?: string;
  recordingDate?: string;
  transferDocNum?: string;
  transferDocType?: string;
  buyerIDCode?: string;
  buyerVestingCode?: string;

  // Mortgage / Liens
  lenderName?: string;
  totalLienCount?: number;
  totalLienBalance?: number;
  totalFinancingHistCount?: number;
  LTVCurrentEstCombined?: number;
  LTVCurrentEstRange?: number;
  equityCurrentEstBal?: number;
  equityCurrentEstRange?: number;
  LTVPurchase?: number;

  // Foreclosure
  forecloseCode?: string | null;
  forecloseRecordDate?: string | null;
  forecloseFileDate?: string | null;
  forecloseCaseNum?: string | null;
  auctionDate?: string | null;

  // Legal description
  legalDesc?: string;
  subdivision?: string | null;
  siteCensusTract?: string;
  bookNum?: string | null;
  pageNum?: string | null;
  blockNum?: string | null;
  lotNum?: string | null;
  lotCode?: string | null;
  phaseNum?: string | null;
  tractNum?: string | null;
  secTwnRng?: string | null;
  jurisdiction?: string | null;
  districtNum?: string | null;
  citySection?: string | null;
  landLot?: string | null;
  neighborhood?: string;
  depthSize?: number;
  frontage?: number;

  // Geometry
  geometry?: {
    type?: string;
    coordinates?: any;
  };

  // Historical data
  assessments?: Array<{
    assessedYear?: number;
    totalAssessedValue?: number;
    totalBuildingValue?: number;
    totalLandValue?: number;
    totalMarketValue?: number;
    marketValueYear?: number;
    taxValue?: number;
    taxYear?: number;
  }>;
  transfers?: Array<{
    transferPrice?: number;
    transferDate?: string;
    buyerName?: string;
    sellerName?: string;
    documentType?: string;
  }>;

  // Composite ID fields
  state_parcelId?: string;
  state_parcelIdSTD?: string;
  countyUSPS?: string;
}

export interface RealieSearchParams {
  // Address search
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Geographic search
  latitude?: number;
  longitude?: number;
  radius?: number; // miles

  // APN/FIPS
  apn?: string;
  fips?: string;

  // Filters
  property_type?: string;
  min_beds?: number;
  max_beds?: number;
  min_baths?: number;
  max_baths?: number;
  min_sqft?: number;
  max_sqft?: number;
  min_year_built?: number;
  max_year_built?: number;
  min_value?: number;
  max_value?: number;
  owner_occupied?: boolean;
  absentee_owner?: boolean;

  // Comparables
  timeFrame?: number;   // months
  maxResults?: number;

  // Pagination
  page?: number;
  limit?: number;
}

export interface RealieApiResponse {
  properties: RealieParcel[];
  metadata?: {
    limit: number;
    offset: number;
    count: number;
  };
}

// ── Mapper: Realie → ATTOM-compatible shape ─────────────────────────────────
// Our entire UI consumes the ATTOM data shape. Rather than rewriting every
// component, we map Realie's response into the same structure.

export function mapRealieToAttomShape(parcel: RealieParcel): any {
  // Parse owner names — Realie returns "LAST, FIRST; LAST2, FIRST2" in ownerName
  const ownerNames = parcel.ownerName?.split(";").map((n) => n.trim()) || [];
  const owner1 = ownerNames[0];
  const owner2 = ownerNames[1];

  // Build FIPS from state + county codes
  const fips = parcel.fipsState && parcel.fipsCounty
    ? `${parcel.fipsState}${parcel.fipsCounty}`
    : undefined;

  // Determine owner-occupied from address comparison
  const ownerOccupied = parcel.ownerAddressLine1 && parcel.address
    ? parcel.ownerAddressLine1 === parcel.address
    : undefined;

  // Calculate price per sqft from transfer
  const pricePerSqft = parcel.transferPrice && parcel.buildingArea
    ? Math.round(parcel.transferPrice / parcel.buildingArea)
    : undefined;

  // Format transfer date from "20171102" to "2017-11-02"
  const transferDate = parcel.transferDate?.length === 8
    ? `${parcel.transferDate.slice(0, 4)}-${parcel.transferDate.slice(4, 6)}-${parcel.transferDate.slice(6, 8)}`
    : parcel.transferDateObject || parcel.transferDate;

  return {
    identifier: {
      apn: parcel.parcelId,
      fips,
      obPropId: parcel._id || parcel.siteId,
    },
    address: {
      oneLine: parcel.addressFullUSPS || parcel.addressFull || `${parcel.address}, ${parcel.city}, ${parcel.state} ${parcel.zipCode}`,
      line1: parcel.address,
      locality: parcel.cityUSPS || parcel.city,
      countrySubd: parcel.state,
      postal1: parcel.zipCode,
      postal2: parcel.zipCodePlusFour?.split("-")[1],
    },
    location: {
      latitude: parcel.latitude ? String(parcel.latitude) : undefined,
      longitude: parcel.longitude ? String(parcel.longitude) : undefined,
    },
    owner: {
      owner1: owner1 ? { fullName: owner1 } : undefined,
      owner2: owner2 ? { fullName: owner2 } : undefined,
      corporateIndicator: parcel.ownerComCount && parcel.ownerComCount > 0 ? "Y" : "N",
      absenteeOwnerStatus: ownerOccupied === false ? "A" : ownerOccupied === true ? "O" : undefined,
      mailingAddressOneLine: parcel.ownerAddressFull,
      ownerOccupied: ownerOccupied === true ? "Y" : ownerOccupied === false ? "N" : undefined,
    },
    building: {
      size: {
        livingSize: parcel.buildingArea,
        universalSize: parcel.buildingArea,
      },
      rooms: {
        beds: parcel.totalBedrooms,
        bathsFull: parcel.totalBathrooms,
        bathsTotal: parcel.totalBathrooms,
      },
      summary: {
        yearBuilt: parcel.yearBuilt,
        levels: parcel.stories,
      },
      construction: {
        constructionType: parcel.constructionType,
        roofCover: parcel.roofType,
      },
    },
    lot: {
      lotSize1: parcel.acres,
      lotSize2: parcel.landArea,
    },
    summary: {
      propType: parcel.residential ? "SFR" : parcel.condo ? "CONDO" : undefined,
      propLandUse: parcel.useCode,
      yearBuilt: parcel.yearBuilt,
    },
    assessment: {
      assessed: {
        assdTtlValue: parcel.totalAssessedValue,
        assdImprValue: parcel.assessedBuildingValue || parcel.totalBuildingValue,
        assdLandValue: parcel.assessedLandValue || parcel.totalLandValue,
      },
      market: {
        mktTtlValue: parcel.totalMarketValue,
        mktImprValue: parcel.totalBuildingValue,
        mktLandValue: parcel.totalLandValue,
      },
      tax: {
        taxAmt: parcel.taxValue,
        taxYear: parcel.taxYear,
      },
    },
    avm: parcel.modelValue ? {
      amount: {
        value: parcel.modelValue,
        high: parcel.modelValueMax,
        low: parcel.modelValueMin,
      },
    } : undefined,
    sale: (parcel.transferPrice || parcel.transferDate) ? {
      amount: {
        saleAmt: parcel.transferPrice || undefined,
        saleTransDate: transferDate,
        saleRecDate: parcel.recordingDate,
      },
      calculation: {
        pricePerSizeUnit: pricePerSqft,
      },
    } : undefined,
    mortgage: parcel.totalLienBalance ? {
      amount: parcel.totalLienBalance,
      lender: parcel.lenderName ? { fullName: parcel.lenderName } : undefined,
    } : undefined,
    // Parcel geometry (for boundary endpoints)
    parcelBoundary: parcel.geometry || undefined,
    // Assessment history from Realie
    assessmenthistory: parcel.assessments?.map((a) => ({
      assessed: {
        assdTtlValue: a.totalAssessedValue,
        assdImprValue: a.totalBuildingValue,
        assdLandValue: a.totalLandValue,
      },
      market: {
        mktTtlValue: a.totalMarketValue,
      },
      tax: {
        taxAmt: a.taxValue,
        taxYear: a.taxYear,
      },
      assessedYear: a.assessedYear,
    })) || undefined,
    // Mark source so we know this came from Realie
    _source: "realie",
  };
}

// ── Client ──────────────────────────────────────────────────────────────────

export class RealieClient {
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

    console.log(`[Realie] API request: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Realie] API request FAILED (${response.status}) for ${url}:`,
        errorText
      );

      // Detect Vercel deployment errors (service is down/undeployed)
      if (
        response.status === 404 &&
        errorText.includes("deployment could not be found")
      ) {
        throw new Error(
          "Realie.ai service is currently unavailable (Vercel deployment not found). Property data will fall back to ATTOM."
        );
      }

      throw new Error(
        `Realie API error: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Normalize any Realie response to our standard RealieApiResponse shape.
   * The API can return either { property: { ... } } (single) or
   * { properties: [...] } (list), so we handle both.
   */
  private normalizeResponse(raw: any): RealieApiResponse {
    if (raw?.properties && Array.isArray(raw.properties)) {
      return raw as RealieApiResponse;
    }
    if (raw?.property) {
      return {
        properties: [raw.property],
        metadata: { limit: 1, offset: 0, count: 1 },
      };
    }
    return { properties: [], metadata: { limit: 0, offset: 0, count: 0 } };
  }

  /**
   * Search property by address.
   * Endpoint: /property/address/?state=XX&address=...
   */
  async searchByAddress(params: {
    address?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    page?: number;
    limit?: number;
  }): Promise<RealieApiResponse> {
    // The Realie address endpoint expects state + address (street portion)
    const queryParams: Record<string, string | number | boolean | undefined> = {};

    if (params.state) queryParams.state = params.state;
    if (params.zip) queryParams.zip = params.zip;

    // If a full address is given, try to extract state for the query
    if (params.address) {
      // Try to extract state from full address like "123 Main St, City, ST 12345"
      const stateMatch = params.address.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/);
      if (stateMatch && !queryParams.state) {
        queryParams.state = stateMatch[1];
        // Remove city/state/zip from address to get just the street
        queryParams.address = params.address.replace(/,\s*[^,]+,\s*[A-Z]{2}\s*\d{0,5}\s*$/, "").trim();
      } else {
        queryParams.address = params.address;
      }
    } else if (params.street) {
      queryParams.address = params.street;
    }

    if (params.city) queryParams.city = params.city;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;

    const raw = await this.request<any>("/property/address/", queryParams);
    return this.normalizeResponse(raw);
  }

  /**
   * Search properties by zip code with optional filters
   */
  async searchByZip(params: RealieSearchParams): Promise<RealieApiResponse> {
    const raw = await this.request<any>("/property/address/", {
      zip: params.zip,
      state: params.state,
      property_type: params.property_type,
      min_beds: params.min_beds,
      max_beds: params.max_beds,
      min_baths: params.min_baths,
      max_baths: params.max_baths,
      min_sqft: params.min_sqft,
      max_sqft: params.max_sqft,
      min_year_built: params.min_year_built,
      max_year_built: params.max_year_built,
      min_value: params.min_value,
      max_value: params.max_value,
      owner_occupied: params.owner_occupied,
      absentee_owner: params.absentee_owner,
      page: params.page,
      limit: params.limit,
    });
    return this.normalizeResponse(raw);
  }

  /**
   * Search properties by lat/lng + radius
   */
  async searchByRadius(params: {
    latitude: number;
    longitude: number;
    radius: number;
    page?: number;
    limit?: number;
    property_type?: string;
  }): Promise<RealieApiResponse> {
    const raw = await this.request<any>("/property/address/", params);
    return this.normalizeResponse(raw);
  }

  /**
   * Get a single property by APN + FIPS
   */
  async getByApn(apn: string, fips: string): Promise<RealieApiResponse> {
    const raw = await this.request<any>("/property/address/", { apn, fips });
    return this.normalizeResponse(raw);
  }

  /**
   * Get property detail by Realie parcel ID
   */
  async getByParcelId(parcelId: string): Promise<RealieApiResponse> {
    const raw = await this.request<any>(`/property/${encodeURIComponent(parcelId)}`);
    return this.normalizeResponse(raw);
  }

  /**
   * Get sales history for a property
   */
  async getSalesHistory(params: {
    address?: string;
    state?: string;
    apn?: string;
    fips?: string;
    parcel_id?: string;
  }): Promise<RealieApiResponse> {
    const raw = await this.request<any>("/property/address/", params);
    return this.normalizeResponse(raw);
  }

  /**
   * Get parcel boundary geometry
   */
  async getParcelBoundary(params: {
    address?: string;
    state?: string;
    apn?: string;
    fips?: string;
  }): Promise<RealieApiResponse> {
    const raw = await this.request<any>("/property/address/", params);
    return this.normalizeResponse(raw);
  }

  /**
   * Get comparable sales for a property.
   * Endpoint: /premium/comparables/?latitude=X&longitude=Y&radius=1&timeFrame=18&maxResults=25
   */
  async getComparables(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    timeFrame?: number;
    maxResults?: number;
  }): Promise<RealieApiResponse> {
    const raw = await this.request<any>("/premium/comparables/", {
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius ?? 1,
      timeFrame: params.timeFrame ?? 18,
      maxResults: params.maxResults ?? 25,
    });
    return this.normalizeResponse(raw);
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; serviceDown?: boolean }> {
    try {
      // Use a known address to test
      const raw = await this.request<any>("/property/address/", {
        state: "DC",
        address: "1600 Pennsylvania Avenue NW",
      });

      const result = this.normalizeResponse(raw);
      if (result.properties.length > 0) {
        return {
          success: true,
          message: "Realie.ai API connection successful",
        };
      }

      return {
        success: false,
        message: "Unexpected response from Realie.ai API",
      };
    } catch (error: any) {
      const msg = error.message || "Failed to connect to Realie.ai API";

      // Detect service-down conditions: Vercel deployment errors AND general
      // network failures (DNS, timeout, connection refused, SSL, etc.).
      // Only actual auth errors (401/403 with clear API messages) should
      // prevent saving the key — network issues are transient.
      const isServiceDown =
        msg.includes("service is currently unavailable") ||
        msg.includes("deployment could not be found") ||
        msg.includes("fetch failed") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("EHOSTUNREACH") ||
        msg.includes("socket hang up") ||
        msg.includes("network") ||
        msg.includes("abort") ||
        msg.includes("SSL") ||
        msg.includes("certificate") ||
        msg.includes("getaddrinfo") ||
        msg.includes("connect ECONNREFUSED") ||
        // Catch-all: if the error doesn't look like an explicit API auth rejection,
        // treat it as a transient failure so the key can still be saved
        (!msg.includes("401") && !msg.includes("403") && !msg.includes("Invalid API") && !msg.includes("Unauthorized"));

      return {
        success: false,
        serviceDown: isServiceDown,
        message: isServiceDown
          ? "Realie.ai service is temporarily unavailable. API key saved — it will activate automatically when the service returns."
          : msg,
      };
    }
  }
}

/**
 * Map ATTOM-style search params to Realie search params
 */
export function mapAttomParamsToRealie(
  endpoint: string,
  params: Record<string, any>
): RealieSearchParams | null {
  // Only handle property data endpoints — neighborhood, schools, risk etc. stay with ATTOM
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
    return null; // Not a Realie-compatible endpoint
  }

  const mapped: RealieSearchParams = {};

  // Address — Realie needs state separately for address lookups
  if (params.address1 && params.address2) {
    // address2 is typically "City, ST ZIP" — extract state
    mapped.address = params.address1;
    const stateMatch = params.address2.match(/\b([A-Z]{2})\b/);
    if (stateMatch) mapped.state = stateMatch[1];
  } else if (params.address) {
    // Full address like "123 Main St, City, ST 12345"
    const stateMatch = params.address.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/);
    if (stateMatch) {
      mapped.state = stateMatch[1];
      // Strip city/state/zip to get just street for address param
      mapped.address = params.address.replace(/,\s*[^,]+,\s*[A-Z]{2}\s*\d{0,5}\s*$/, "").trim();
    } else {
      mapped.address = params.address;
    }
  }

  // Zip code
  if (params.postalcode || params.postalCode) {
    mapped.zip = params.postalcode || params.postalCode;
  }

  // Lat/Lng/Radius
  if (params.latitude && params.longitude) {
    mapped.latitude = Number(params.latitude);
    mapped.longitude = Number(params.longitude);
    if (params.radius) mapped.radius = Number(params.radius);
  }

  // APN / FIPS
  if (params.apn || params.APN) mapped.apn = params.apn || params.APN;
  if (params.fips) mapped.fips = params.fips;

  // Property type
  if (params.propertytype || params.propertyType) {
    mapped.property_type = params.propertytype || params.propertyType;
  }

  // Beds / Baths
  if (params.minBeds) mapped.min_beds = Number(params.minBeds);
  if (params.maxBeds) mapped.max_beds = Number(params.maxBeds);
  if (params.minBathsTotal) mapped.min_baths = Number(params.minBathsTotal);
  if (params.maxBathsTotal) mapped.max_baths = Number(params.maxBathsTotal);

  // Size
  if (params.minUniversalSize) mapped.min_sqft = Number(params.minUniversalSize);
  if (params.maxUniversalSize) mapped.max_sqft = Number(params.maxUniversalSize);

  // Year built
  if (params.minYearBuilt) mapped.min_year_built = Number(params.minYearBuilt);
  if (params.maxYearBuilt) mapped.max_year_built = Number(params.maxYearBuilt);

  // Value filters (use AVM or assessed total)
  if (params.minAVMValue || params.minavmvalue) {
    mapped.min_value = Number(params.minAVMValue || params.minavmvalue);
  }
  if (params.maxAVMValue || params.maxavmvalue) {
    mapped.max_value = Number(params.maxAVMValue || params.maxavmvalue);
  }

  // Comparables
  if (params.timeFrame) mapped.timeFrame = Number(params.timeFrame);
  if (params.maxResults) mapped.maxResults = Number(params.maxResults);

  // Absentee owner
  if (params.absenteeowner === "Y") mapped.absentee_owner = true;
  if (params.absenteeowner === "N") mapped.owner_occupied = true;

  // Pagination
  if (params.page) mapped.page = Number(params.page);
  if (params.pagesize) mapped.limit = Number(params.pagesize);

  return mapped;
}

export function createRealieClient(apiKey?: string): RealieClient {
  const key = apiKey || process.env.REALIE_API_KEY;
  if (!key) {
    throw new Error(
      "Realie.ai API key is required. Set REALIE_API_KEY environment variable or connect via admin settings."
    );
  }
  return new RealieClient({ apiKey: key });
}
