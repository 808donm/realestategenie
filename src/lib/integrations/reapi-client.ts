/**
 * REAPI (Real Estate API) Client
 *
 * Comprehensive property data API that can replace Realie + RentCast + Trestle
 * with a single provider. Provides property details, MLS search, AVM, comps,
 * skip tracing, and more.
 *
 * API Documentation: https://api.realestateapi.com/swagger
 *
 * Authentication: API Key passed in x-api-key header
 * Base URL: https://api.realestateapi.com
 */

const BASE_URL = "https://api.realestateapi.com";

// ── Types ────────────────────────────────────────────────────────────────

export type ReapiPropertyType = "SFR" | "MFR" | "CONDO" | "LAND" | "MOBILE" | "OTHER";

export interface ReapiAddress {
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
}

// ── Property Search ──────────────────────────────────────────────────────

export interface ReapiPropertySearchParams {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  value_min?: number;
  value_max?: number;
  year_min?: number;
  year_max?: number;
  sqft_min?: number;
  sqft_max?: number;
  property_type?: ReapiPropertyType;
  foreclosure?: boolean;
  pre_foreclosure?: boolean;
  auction?: boolean;
  // Lead flags
  absentee_owner?: boolean;
  high_equity?: boolean;
  vacant?: boolean;
  investor?: boolean;
  // Geo search
  polygon?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  // Pagination
  size?: number;
  resultIndex?: number;
}

export interface ReapiPropertySearchResult {
  data: ReapiProperty[];
  recordCount: number;
  resultCount: number;
  resultIndex: number;
  statusCode: number;
  statusMessage: string;
  requestExecutionTimeMS: number;
}

// ── Property Detail ──────────────────────────────────────────────────────

export interface ReapiProperty {
  id?: number;
  // Address
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  apn?: string;
  fips?: string;
  // Property attributes
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_footage?: number;
  lot_size?: number;
  year_built?: number;
  stories?: number;
  units?: number;
  // Owner info
  owner_name?: string;
  owner_name_2?: string;
  owner_type?: string;
  owner_occupied?: boolean;
  absentee_owner?: boolean;
  mailing_address?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
  // Valuation
  estimated_value?: number;
  estimated_value_low?: number;
  estimated_value_high?: number;
  estimated_equity?: number;
  assessed_value?: number;
  assessed_land_value?: number;
  assessed_improvement_value?: number;
  market_value?: number;
  tax_amount?: number;
  // Mortgage
  mortgage_amount?: number;
  mortgage_lender?: string;
  mortgage_rate?: number;
  mortgage_term?: number;
  mortgage_date?: string;
  mortgage_maturity_date?: string;
  mortgage_balance?: number;
  second_mortgage_amount?: number;
  total_lien_balance?: number;
  total_lien_count?: number;
  // Sale history
  last_sale_date?: string;
  last_sale_price?: number;
  prior_sale_date?: string;
  prior_sale_price?: number;
  // Lead flags
  foreclosure_status?: string;
  pre_foreclosure?: boolean;
  high_equity?: boolean;
  investor?: boolean;
  vacant?: boolean;
  // Schools
  schools?: ReapiSchool[];
  // Flood
  flood_zone?: string;
  flood_zone_description?: string;
  // Demographics
  median_income?: number;
  // Investor portfolio
  owner_parcel_count?: number;
  owner_total_value?: number;
  owner_total_equity?: number;
  // Sale history array
  sale_history?: ReapiSaleRecord[];
  assessment_history?: ReapiAssessmentRecord[];
  // Raw additional fields
  [key: string]: any;
}

export interface ReapiSchool {
  name?: string;
  type?: string;
  level?: string;
  rating?: number;
  distance?: number;
  grades_low?: string;
  grades_high?: string;
  enrollment?: number;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ReapiSaleRecord {
  date?: string;
  price?: number;
  buyer?: string;
  seller?: string;
  document_type?: string;
}

export interface ReapiAssessmentRecord {
  year?: number;
  total?: number;
  land?: number;
  improvement?: number;
}

// ── MLS Search ───────────────────────────────────────────────────────────

export interface ReapiMLSSearchParams {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  listing_id?: number;
  id?: number;
  mls_number?: string;
  // Status filters
  active?: boolean;
  pending?: boolean;
  sold?: boolean;
  cancelled?: boolean;
  failed?: boolean;
  // Property filters
  bedrooms_min?: number;
  bedrooms_max?: number;
  bathrooms_min?: number;
  bathrooms_max?: number;
  listing_price_min?: number;
  listing_price_max?: number;
  listing_date_min?: string;
  listing_date_max?: string;
  sqft_min?: number;
  sqft_max?: number;
  property_type?: string;
  // Geo search
  polygon?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  // Options
  include_photos?: boolean;
  size?: number;
  resultIndex?: number;
}

export interface ReapiMLSResult {
  data: ReapiMLSListing[];
  recordCount: number;
  resultCount: number;
  resultIndex: number;
  statusCode: number;
  statusMessage: string;
  requestExecutionTimeMS: number;
}

export interface ReapiMLSListing {
  id?: number;
  listing_id?: number;
  mls_number?: string;
  mls_board_code?: string;
  // Status
  status?: string;
  status_date?: string;
  listing_date?: string;
  // Pricing
  listing_price?: number;
  original_listing_price?: number;
  sold_price?: number;
  sold_date?: string;
  close_date?: string;
  // Property
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_footage?: number;
  lot_size?: number;
  year_built?: number;
  stories?: number;
  // Description
  description?: string;
  features?: string[];
  // Agent
  listing_agent_name?: string;
  listing_agent_phone?: string;
  listing_agent_email?: string;
  listing_office_name?: string;
  buyer_agent_name?: string;
  buyer_office_name?: string;
  // Photos
  photos?: string[];
  photo_count?: number;
  // Dates
  days_on_market?: number;
  // Open houses
  open_houses?: Array<{ date?: string; start_time?: string; end_time?: string }>;
  // Raw
  [key: string]: any;
}

// ── AVM ──────────────────────────────────────────────────────────────────

export interface ReapiAvmParams {
  id?: number;
  address?: string;
  strict?: boolean;
}

export interface ReapiAvmResult {
  data: {
    id?: number;
    address?: string;
    estimated_value?: number;
    estimated_value_low?: number;
    estimated_value_high?: number;
    confidence_score?: number;
    [key: string]: any;
  };
  statusCode: number;
  statusMessage: string;
  requestExecutionTimeMS: number;
}

// ── Comps ─────────────────────────────────────────────────────────────────

export interface ReapiCompsParams {
  id?: number;
  address?: string;
}

export interface ReapiCompsResult {
  data: {
    subject?: ReapiProperty;
    comps?: ReapiProperty[];
    [key: string]: any;
  };
  statusCode: number;
  statusMessage: string;
  requestExecutionTimeMS: number;
}

// ── Skip Trace ───────────────────────────────────────────────────────────

export interface ReapiSkipTraceParams {
  address?: string;
  id?: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  match_requirements?: {
    phones?: boolean;
    emails?: boolean;
    social?: boolean;
    operator?: "and" | "or";
  };
  age?: number;
  age_range_min?: number;
  age_range_max?: number;
  ethnicity_code?: string;
  marital_status_code?: string;
  gender?: string;
}

export interface ReapiSkipTraceResult {
  data: ReapiPerson[];
  recordCount: number;
  statusCode: number;
  statusMessage: string;
  requestExecutionTimeMS: number;
}

export interface ReapiPerson {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  age?: number;
  date_of_birth?: string;
  gender?: string;
  // Contact
  phones?: Array<{
    number?: string;
    type?: string;
    carrier?: string;
    line_type?: string;
    connected?: boolean;
    do_not_call?: boolean;
  }>;
  emails?: Array<{
    address?: string;
    type?: string;
  }>;
  // Address
  addresses?: Array<{
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    type?: string;
    first_seen?: string;
    last_seen?: string;
  }>;
  // Social
  social_profiles?: Array<{
    type?: string;
    url?: string;
    username?: string;
  }>;
  // Demographics
  marital_status?: string;
  ethnicity?: string;
  education?: string;
  occupation?: string;
  income_range?: string;
  net_worth_range?: string;
  // Relations
  relatives?: Array<{
    name?: string;
    relationship?: string;
  }>;
  associates?: Array<{
    name?: string;
  }>;
  [key: string]: any;
}

// ── AutoComplete ─────────────────────────────────────────────────────────

export interface ReapiAutoCompleteParams {
  search: string;
  search_types?: string; // A=Address, S=Street, C=City, G=GeoPlace, N=Neighborhood, Z=Zip, P=Poi
  latitude?: number;
  longitude?: number;
  precision?: number;
}

export interface ReapiAutoCompleteResult {
  data: Array<{
    text?: string;
    type?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    [key: string]: any;
  }>;
  totalResults: number;
  returnedResults: number;
  statusCode: number;
  requestExecutionTimeMS: number;
}

// ── Address Verification ─────────────────────────────────────────────────

export interface ReapiAddressVerificationParams {
  addresses: ReapiAddress[];
  strict?: boolean;
}

// ── Client ───────────────────────────────────────────────────────────────

export class ReapiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: any, params?: Record<string, any>): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    // Add query params for GET requests
    if (params && method === "GET") {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };

    const options: RequestInit = { method, headers };
    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      throw new Error(`REAPI ${method} ${path} failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  // ── Property Search ──

  async searchProperties(params: ReapiPropertySearchParams): Promise<ReapiPropertySearchResult> {
    return this.request<ReapiPropertySearchResult>("POST", "/v2/PropertySearch", params);
  }

  // ── Property Detail ──

  async getPropertyDetail(id: number): Promise<{ data: ReapiProperty; statusCode: number; statusMessage: string }> {
    return this.request("GET", "/v2/PropertyDetail", undefined, { id });
  }

  async getPropertyDetailBulk(ids: number[]): Promise<{ data: ReapiProperty[]; recordCount: number; statusCode: number }> {
    return this.request("POST", "/v2/PropertyDetailBulk", { ids });
  }

  // ── Lender Grade AVM ──

  async getPropertyAvm(params: ReapiAvmParams): Promise<ReapiAvmResult> {
    if (params.id) {
      return this.request("GET", "/v2/PropertyAvm", undefined, params);
    }
    return this.request("POST", "/v2/PropertyAvm", params);
  }

  async getPropertyAvmBulk(properties: ReapiAvmParams[]): Promise<{ data: any[]; statusCode: number }> {
    return this.request("POST", "/v2/PropertyAvmBulk", { properties });
  }

  // ── Property Boundary (parcel polygon) ──

  async getPropertyBoundary(params: {
    id?: number;
    address?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ data: any; statusCode: number }> {
    if (params.id) {
      return this.request("GET", "/v2/PropertyBoundary", undefined, params);
    }
    return this.request("POST", "/v2/PropertyBoundary", params);
  }

  // ── Property Portfolio (investor portfolio) ──

  async getPropertyPortfolio(params: {
    id?: number;
    address?: string;
    owner_name?: string;
  }): Promise<{ data: any; statusCode: number }> {
    return this.request("POST", "/v2/PropertyPortfolio", params);
  }

  // ── Property Comps ──

  async getPropertyComps(params: ReapiCompsParams): Promise<ReapiCompsResult> {
    if (params.id) {
      return this.request("GET", "/v2/PropertyComps", undefined, params);
    }
    return this.request("POST", "/v2/PropertyComps", params);
  }

  async getPropertyCompsV3(params: ReapiCompsParams): Promise<ReapiCompsResult> {
    if (params.id) {
      return this.request("GET", "/v3/PropertyComps", undefined, params);
    }
    return this.request("POST", "/v3/PropertyComps", params);
  }

  // ── MLS Search ──

  async searchMLS(params: ReapiMLSSearchParams): Promise<ReapiMLSResult> {
    return this.request<ReapiMLSResult>("POST", "/v2/MLSSearch", params);
  }

  // ── MLS Detail ──

  async getMLSDetail(params: {
    listing_id?: number;
    id?: number;
    address?: string;
    mls_number?: string;
    mls_board_code?: string;
  }): Promise<{ data: ReapiMLSListing; recordCount: number; statusCode: number }> {
    if (params.listing_id || params.id) {
      return this.request("GET", "/v2/MLSDetail", undefined, params);
    }
    return this.request("POST", "/v2/MLSDetail", params);
  }

  // ── Skip Trace ──

  async skipTrace(params: ReapiSkipTraceParams): Promise<ReapiSkipTraceResult> {
    return this.request<ReapiSkipTraceResult>("POST", "/v2/SkipTrace", params);
  }

  async skipTraceBatch(
    addresses: Array<ReapiAddress & { first_name?: string; last_name?: string }>,
    matchRequirements?: ReapiSkipTraceParams["match_requirements"],
  ): Promise<{ data: ReapiPerson[][]; statusCode: number }> {
    return this.request("POST", "/v2/SkipTraceBatch", {
      addresses,
      match_requirements: matchRequirements,
    });
  }

  // ── AutoComplete ──

  async autoComplete(params: ReapiAutoCompleteParams): Promise<ReapiAutoCompleteResult> {
    return this.request<ReapiAutoCompleteResult>("POST", "/v2/AutoComplete", params);
  }

  // ── Address Verification ──

  async verifyAddresses(params: ReapiAddressVerificationParams): Promise<{ data: any[]; matchCount: number; statusCode: number }> {
    return this.request("POST", "/v2/AddressVerification", params);
  }

  // ── Property Mapping ──

  async propertyMapping(params: {
    address?: string;
    latitude?: number;
    longitude?: number;
    id?: number;
  }): Promise<{ data: any; statusCode: number }> {
    return this.request("POST", "/v2/PropertyMapping", params);
  }

  // ── PropGPT ──

  async propGPT(query: string, params?: {
    city?: string;
    state?: string;
    zip?: string;
    size?: number;
  }): Promise<{ data: ReapiProperty[]; statusCode: number }> {
    return this.request("POST", "/v2/PropGPT", { query, ...params });
  }

  // ── Key Info ──

  async getKeyInfo(): Promise<{ data: any; statusCode: number }> {
    return this.request("GET", "/v2/key/info");
  }
}

// ── Factory ──

let _client: ReapiClient | null = null;

export function getReapiClient(): ReapiClient | null {
  if (_client) return _client;
  const apiKey = process.env.REAPI_API_KEY;
  if (!apiKey) return null;
  _client = new ReapiClient(apiKey);
  return _client;
}

// ── ATTOM-Compatible Mapping ─────────────────────────────────────────────
// Maps REAPI property data to the ATTOM-compatible shape used throughout the app

export function mapReapiToAttomShape(p: ReapiProperty): any {
  const oneLine = [p.address || p.street, p.city, p.state, p.zip].filter(Boolean).join(", ");

  return {
    identifier: {
      apn: p.apn,
      fips: p.fips,
      obPropId: p.id ? String(p.id) : undefined,
      attomId: p.id || 0,
    },
    address: {
      oneLine,
      line1: p.address || p.street || "",
      locality: p.city || "",
      countrySubd: p.state || "",
      postal1: p.zip || "",
    },
    location: {
      latitude: p.latitude,
      longitude: p.longitude,
    },
    summary: {
      propType: mapPropertyType(p.property_type),
      propSubType: mapPropertySubType(p.property_type),
      yearBuilt: p.year_built,
    },
    owner: {
      owner1: { fullName: p.owner_name },
      owner2: p.owner_name_2 ? { fullName: p.owner_name_2 } : undefined,
      corporateIndicator: p.owner_type === "Corporate" ? "Y" : "N",
      absenteeOwnerStatus: p.absentee_owner ? "A" : "O",
      mailingAddressOneLine: [p.mailing_address, p.mailing_city, p.mailing_state, p.mailing_zip]
        .filter(Boolean)
        .join(", "),
      ownerOccupied: p.owner_occupied ? "Y" : "N",
      ownerParcelCount: p.owner_parcel_count,
    },
    building: {
      size: {
        livingSize: p.square_footage,
        universalSize: p.square_footage,
      },
      rooms: {
        beds: p.bedrooms,
        bathsTotal: p.bathrooms,
        bathsFull: p.bathrooms ? Math.floor(p.bathrooms) : undefined,
      },
      summary: {
        yearBuilt: p.year_built,
        storyCount: p.stories,
        unitsCount: p.units,
      },
    },
    lot: {
      lotSize1: p.lot_size,
    },
    avm: {
      amount: {
        value: p.estimated_value,
        low: p.estimated_value_low,
        high: p.estimated_value_high,
      },
    },
    assessment: {
      assessed: {
        assdTtlValue: p.assessed_value,
        assdLandValue: p.assessed_land_value,
        assdImprValue: p.assessed_improvement_value,
      },
      market: {
        mktTtlValue: p.market_value || p.assessed_value,
        mktLandValue: p.assessed_land_value,
        mktImprValue: p.assessed_improvement_value,
      },
      tax: {
        taxAmt: p.tax_amount,
      },
    },
    homeEquity: p.estimated_equity != null
      ? {
          estimatedValue: p.estimated_value,
          equity: p.estimated_equity,
          lienBal: p.total_lien_balance,
          lienCount: p.total_lien_count,
        }
      : undefined,
    mortgage: p.mortgage_amount
      ? {
          amount: {
            firstAmt: p.mortgage_amount,
            secondAmt: p.second_mortgage_amount,
          },
          lender: { name: p.mortgage_lender },
          interestRate: p.mortgage_rate,
          term: p.mortgage_term,
          dueDate: p.mortgage_maturity_date,
          loanDate: p.mortgage_date,
        }
      : undefined,
    sale: {
      amount: {
        saleAmt: p.last_sale_price,
        salePrice: p.last_sale_price,
        saleTransDate: p.last_sale_date,
      },
    },
    saleHistory: (p.sale_history || []).map((s) => ({
      amount: {
        saleAmt: s.price,
        saleTransDate: s.date,
      },
      buyer: s.buyer,
      seller: s.seller,
      documentType: s.document_type,
    })),
    assessmenthistory: (p.assessment_history || []).map((a) => ({
      year: a.year,
      value: a.total,
      land: a.land,
      improvements: a.improvement,
    })),
    foreclosure: p.foreclosure_status
      ? { code: p.foreclosure_status, isForeclosure: true }
      : undefined,
    // Lead flags (REAPI-specific enrichment)
    leadFlags: {
      absenteeOwner: p.absentee_owner,
      highEquity: p.high_equity,
      investor: p.investor,
      vacant: p.vacant,
      preForeclosure: p.pre_foreclosure,
      foreclosure: !!p.foreclosure_status,
    },
    // Schools (REAPI-specific enrichment)
    schools: (p.schools || []).map((s) => ({
      name: s.name,
      type: s.type,
      level: s.level,
      rating: s.rating,
      distance: s.distance,
      gradesLow: s.grades_low,
      gradesHigh: s.grades_high,
      enrollment: s.enrollment,
    })),
    // Flood zone
    floodZone: p.flood_zone
      ? { zone: p.flood_zone, description: p.flood_zone_description }
      : undefined,
    // Source marker
    _source: "reapi",
  };
}

function mapPropertyType(type?: string): string {
  if (!type) return "Unknown";
  switch (type.toUpperCase()) {
    case "SFR": return "SFR";
    case "MFR": return "Multi-Family";
    case "CONDO": return "CONDO";
    case "LAND": return "Land";
    case "MOBILE": return "Mobile Home";
    default: return type;
  }
}

function mapPropertySubType(type?: string): string {
  if (!type) return "";
  switch (type.toUpperCase()) {
    case "SFR": return "Single Family Residence";
    case "MFR": return "Multi-Family";
    case "CONDO": return "Condominium";
    case "LAND": return "Land";
    case "MOBILE": return "Manufactured Home";
    default: return type;
  }
}

// ── MLS Listing Mapping ──

export function mapReapiMLSToTrestleShape(listing: ReapiMLSListing): any {
  return {
    ListingKey: listing.listing_id ? String(listing.listing_id) : undefined,
    ListingId: listing.mls_number,
    StandardStatus: mapMLSStatus(listing.status),
    PropertyType: listing.property_type || "Residential",
    ListPrice: listing.listing_price,
    OriginalListPrice: listing.original_listing_price,
    ClosePrice: listing.sold_price,
    CloseDate: listing.sold_date || listing.close_date,
    UnparsedAddress: listing.address,
    City: listing.city,
    StateOrProvince: listing.state,
    PostalCode: listing.zip,
    Latitude: listing.latitude,
    Longitude: listing.longitude,
    BedroomsTotal: listing.bedrooms,
    BathroomsTotalInteger: listing.bathrooms,
    LivingArea: listing.square_footage,
    YearBuilt: listing.year_built,
    LotSizeArea: listing.lot_size,
    DaysOnMarket: listing.days_on_market,
    ListAgentFullName: listing.listing_agent_name,
    ListOfficeName: listing.listing_office_name,
    BuyerAgentFullName: listing.buyer_agent_name,
    BuyerOfficeName: listing.buyer_office_name,
    PublicRemarks: listing.description,
    Media: (listing.photos || []).map((url, i) => ({
      MediaURL: url,
      MediaType: "image/jpeg",
      Order: i,
    })),
    _source: "reapi",
  };
}

function mapMLSStatus(status?: string): string {
  if (!status) return "Active";
  const s = status.toLowerCase();
  if (s.includes("active")) return "Active";
  if (s.includes("pending")) return "Pending";
  if (s.includes("sold") || s.includes("closed")) return "Closed";
  if (s.includes("cancel")) return "Canceled";
  if (s.includes("withdrawn") || s.includes("expired") || s.includes("fail")) return "Withdrawn";
  return status;
}

// ── Skip Trace Mapping ──

export function mapReapiSkipTrace(person: ReapiPerson): any {
  return {
    name: person.full_name || [person.first_name, person.last_name].filter(Boolean).join(" "),
    firstName: person.first_name,
    lastName: person.last_name,
    age: person.age,
    dateOfBirth: person.date_of_birth,
    gender: person.gender,
    phones: (person.phones || []).map((p) => ({
      number: p.number,
      type: p.type,
      carrier: p.carrier,
      lineType: p.line_type,
      connected: p.connected,
      doNotCall: p.do_not_call,
    })),
    emails: (person.emails || []).map((e) => ({
      address: e.address,
      type: e.type,
    })),
    addresses: (person.addresses || []).map((a) => ({
      address: a.address,
      city: a.city,
      state: a.state,
      zip: a.zip,
      type: a.type,
    })),
    socialProfiles: (person.social_profiles || []).map((s) => ({
      type: s.type,
      url: s.url,
      username: s.username,
    })),
    demographics: {
      maritalStatus: person.marital_status,
      ethnicity: person.ethnicity,
      education: person.education,
      occupation: person.occupation,
      incomeRange: person.income_range,
      netWorthRange: person.net_worth_range,
    },
    relatives: person.relatives,
    associates: person.associates,
  };
}
