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

const DEFAULT_BASE_URL = "https://api.realie.ai/v1";

// ── Response types ──────────────────────────────────────────────────────────
// Realie returns data in a normalized format that we map to our internal
// ATTOM-compatible shape so the rest of the app doesn't need to change.

export interface RealieParcel {
  parcel_id?: string;
  apn?: string;
  fips?: string;
  address?: {
    full?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    zip4?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  owner?: {
    name?: string;
    secondary_name?: string;
    mailing_address?: string;
    owner_occupied?: boolean;
    corporate?: boolean;
  };
  property?: {
    type?: string;
    sub_type?: string;
    land_use?: string;
    year_built?: number;
    bedrooms?: number;
    bathrooms?: number;
    bathrooms_half?: number;
    living_area_sqft?: number;
    lot_size_sqft?: number;
    lot_size_acres?: number;
    stories?: number;
    construction_type?: string;
    roof_type?: string;
    pool?: boolean;
  };
  tax?: {
    assessed_total?: number;
    assessed_land?: number;
    assessed_improvement?: number;
    market_total?: number;
    market_land?: number;
    market_improvement?: number;
    tax_amount?: number;
    tax_year?: number;
  };
  valuation?: {
    estimated_value?: number;
    value_low?: number;
    value_high?: number;
    confidence_score?: number;
    last_updated?: string;
  };
  sale?: {
    last_sale_amount?: number;
    last_sale_date?: string;
    price_per_sqft?: number;
  };
  mortgage?: {
    lender_name?: string;
    amount?: number;
    date?: string;
    due_date?: string;
    loan_type?: string;
    interest_rate_type?: string;
  };
  sales_history?: Array<{
    sale_amount?: number;
    sale_date?: string;
    buyer_name?: string;
    seller_name?: string;
    document_type?: string;
  }>;
  boundary?: {
    type?: string;
    coordinates?: any;
  };
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

  // Pagination
  page?: number;
  limit?: number;
}

export interface RealieApiResponse {
  success: boolean;
  data: RealieParcel[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ── Mapper: Realie → ATTOM-compatible shape ─────────────────────────────────
// Our entire UI consumes the ATTOM data shape. Rather than rewriting every
// component, we map Realie's response into the same structure.

export function mapRealieToAttomShape(parcel: RealieParcel): any {
  return {
    identifier: {
      apn: parcel.apn,
      fips: parcel.fips,
      obPropId: parcel.parcel_id,
    },
    address: {
      oneLine: parcel.address?.full,
      line1: parcel.address?.street,
      locality: parcel.address?.city,
      countrySubd: parcel.address?.state,
      postal1: parcel.address?.zip,
      postal2: parcel.address?.zip4,
    },
    location: {
      latitude: parcel.location?.latitude ? String(parcel.location.latitude) : undefined,
      longitude: parcel.location?.longitude ? String(parcel.location.longitude) : undefined,
    },
    owner: {
      owner1: parcel.owner?.name ? { fullName: parcel.owner.name } : undefined,
      owner2: parcel.owner?.secondary_name ? { fullName: parcel.owner.secondary_name } : undefined,
      corporateIndicator: parcel.owner?.corporate ? "Y" : "N",
      absenteeOwnerStatus: parcel.owner?.owner_occupied === false ? "A" : "O",
      mailingAddressOneLine: parcel.owner?.mailing_address,
      ownerOccupied: parcel.owner?.owner_occupied ? "Y" : "N",
    },
    building: {
      size: {
        livingSize: parcel.property?.living_area_sqft,
        universalSize: parcel.property?.living_area_sqft,
      },
      rooms: {
        beds: parcel.property?.bedrooms,
        bathsFull: parcel.property?.bathrooms,
        bathsHalf: parcel.property?.bathrooms_half,
        bathsTotal: (parcel.property?.bathrooms || 0) + (parcel.property?.bathrooms_half || 0) * 0.5 || undefined,
      },
      summary: {
        yearBuilt: parcel.property?.year_built,
        levels: parcel.property?.stories,
        archStyle: undefined,
        quality: undefined,
      },
      construction: {
        constructionType: parcel.property?.construction_type,
        roofCover: parcel.property?.roof_type,
      },
    },
    lot: {
      lotSize1: parcel.property?.lot_size_acres,
      lotSize2: parcel.property?.lot_size_sqft,
    },
    summary: {
      propType: parcel.property?.type,
      propSubType: parcel.property?.sub_type,
      propLandUse: parcel.property?.land_use,
      yearBuilt: parcel.property?.year_built,
    },
    assessment: {
      assessed: {
        assdTtlValue: parcel.tax?.assessed_total,
        assdImprValue: parcel.tax?.assessed_improvement,
        assdLandValue: parcel.tax?.assessed_land,
      },
      market: {
        mktTtlValue: parcel.tax?.market_total,
        mktImprValue: parcel.tax?.market_improvement,
        mktLandValue: parcel.tax?.market_land,
      },
      tax: {
        taxAmt: parcel.tax?.tax_amount,
        taxYear: parcel.tax?.tax_year,
      },
    },
    avm: parcel.valuation?.estimated_value ? {
      amount: {
        value: parcel.valuation.estimated_value,
        high: parcel.valuation.value_high,
        low: parcel.valuation.value_low,
        scr: parcel.valuation.confidence_score,
      },
      eventDate: parcel.valuation.last_updated,
    } : undefined,
    sale: parcel.sale?.last_sale_amount ? {
      amount: {
        saleAmt: parcel.sale.last_sale_amount,
        saleTransDate: parcel.sale.last_sale_date,
      },
      calculation: {
        pricePerSizeUnit: parcel.sale.price_per_sqft,
      },
    } : undefined,
    mortgage: parcel.mortgage?.amount ? {
      amount: parcel.mortgage.amount,
      lender: parcel.mortgage.lender_name ? { fullName: parcel.mortgage.lender_name } : undefined,
      date: parcel.mortgage.date,
      dueDate: parcel.mortgage.due_date,
      loanType: parcel.mortgage.loan_type,
      interestRateType: parcel.mortgage.interest_rate_type,
    } : undefined,
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
        "x-api-key": this.apiKey,
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
   * Search parcels by address
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
    return this.request("/parcels/search", params);
  }

  /**
   * Search parcels by zip code with optional filters
   */
  async searchByZip(params: RealieSearchParams): Promise<RealieApiResponse> {
    return this.request("/parcels/search", {
      zip: params.zip,
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
  }

  /**
   * Search parcels by lat/lng + radius
   */
  async searchByRadius(params: {
    latitude: number;
    longitude: number;
    radius: number;
    page?: number;
    limit?: number;
    property_type?: string;
  }): Promise<RealieApiResponse> {
    return this.request("/parcels/search", params);
  }

  /**
   * Get a single parcel by APN + FIPS
   */
  async getByApn(apn: string, fips: string): Promise<RealieApiResponse> {
    return this.request("/parcels/lookup", { apn, fips });
  }

  /**
   * Get parcel detail by Realie parcel ID
   */
  async getByParcelId(parcelId: string): Promise<RealieApiResponse> {
    return this.request(`/parcels/${encodeURIComponent(parcelId)}`);
  }

  /**
   * Get sales history for a parcel
   */
  async getSalesHistory(params: {
    address?: string;
    apn?: string;
    fips?: string;
    parcel_id?: string;
  }): Promise<RealieApiResponse> {
    return this.request("/parcels/sales-history", params);
  }

  /**
   * Get parcel boundary geometry
   */
  async getParcelBoundary(params: {
    address?: string;
    apn?: string;
    fips?: string;
  }): Promise<RealieApiResponse> {
    return this.request("/parcels/boundary", params);
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; serviceDown?: boolean }> {
    try {
      // Use a known address to test
      const result = await this.request<any>("/parcels/search", {
        address: "1600 Pennsylvania Avenue NW, Washington, DC 20500",
        limit: 1,
      });

      if (result?.success || result?.data) {
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
      const isServiceDown = msg.includes("service is currently unavailable") ||
        msg.includes("deployment could not be found");

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
  ];

  if (!propertyEndpoints.includes(endpoint)) {
    return null; // Not a Realie-compatible endpoint
  }

  const mapped: RealieSearchParams = {};

  // Address
  if (params.address1 && params.address2) {
    mapped.address = `${params.address1}, ${params.address2}`;
  } else if (params.address) {
    mapped.address = params.address;
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
