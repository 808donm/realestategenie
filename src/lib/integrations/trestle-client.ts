/**
 * Trestle (Cotality / CoreLogic) MLS API Client
 *
 * Handles property listings, agent rosters, and media via RESO Web API
 * API Documentation: https://trestle-documentation.corelogic.com/
 *
 * Authentication Methods:
 * 1. OAuth2 Client Credentials Flow (client_id + client_secret)
 * 2. Basic Auth (username + password)
 * 3. Bearer Token (pre-obtained token)
 *
 * Data Standard: RESO Data Dictionary 2.0
 */

const DEFAULT_TOKEN_URL = "https://api.cotality.com/trestle/oidc/connect/token";
const DEFAULT_API_URL = "https://api.cotality.com/trestle/odata";

export interface TrestleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface TrestleProperty {
  ListingKey: string;
  ListingId: string;
  StandardStatus: "Active" | "Pending" | "Closed" | "Expired" | "Withdrawn" | "Canceled";
  PropertyType: string;
  PropertySubType?: string;
  ListPrice: number;
  ClosePrice?: number;
  OriginalListPrice?: number;
  StreetNumber?: string;
  StreetName?: string;
  StreetSuffix?: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  Country?: string;
  UnparsedAddress?: string;
  Latitude?: number;
  Longitude?: number;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  LotSizeArea?: number;
  YearBuilt?: number;
  PublicRemarks?: string;
  PrivateRemarks?: string;
  ListAgentKey?: string;
  ListAgentMlsId?: string;
  ListAgentFullName?: string;
  ListAgentEmail?: string;
  ListAgentDirectPhone?: string;
  ListOfficeKey?: string;
  ListOfficeName?: string;
  BuyerAgentKey?: string;
  BuyerAgentFullName?: string;
  BuyerOfficeKey?: string;
  BuyerOfficeName?: string;
  ListingContractDate?: string;
  CloseDate?: string;
  OnMarketDate?: string;
  DaysOnMarket?: number;
  CumulativeDaysOnMarket?: number;
  ModificationTimestamp: string;
  PhotosCount?: number;
  Media?: TrestleMedia[];
  ListingURL?: string;
  VirtualTourURLUnbranded?: string;
  TaxAnnualAmount?: number;
  AssociationFee?: number;
  NumberOfUnitsTotal?: number;
  // Building / condo details
  SubdivisionName?: string;      // Building/condo name (e.g., "Park Lane", "The Century")
  // Hawaii-critical: Land tenure
  OwnershipType?: string;       // "Fee Simple", "Leasehold"
  LeaseAmount?: number;          // Monthly lease rent
  LeaseExpiration?: string;      // Lease expiration date
  LeaseAmountFrequency?: string; // "Monthly", "Annually"
}

export interface TrestleMedia {
  MediaKey: string;
  MediaURL: string;
  MediaType: string;
  Order?: number;
  ShortDescription?: string;
}

export interface TrestleMember {
  MemberKey: string;
  MemberMlsId: string;
  MemberFirstName: string;
  MemberLastName: string;
  MemberFullName: string;
  MemberEmail?: string;
  MemberDirectPhone?: string;
  MemberMobilePhone?: string;
  MemberOfficePhone?: string;
  MemberStatus: string;
  OfficeName?: string;
  OfficeKey?: string;
  ModificationTimestamp: string;
}

export interface TrestleOffice {
  OfficeKey: string;
  OfficeMlsId: string;
  OfficeName: string;
  OfficePhone?: string;
  OfficeEmail?: string;
  OfficeAddress1?: string;
  OfficeCity?: string;
  OfficeStateOrProvince?: string;
  OfficePostalCode?: string;
  ModificationTimestamp: string;
}

export interface TrestleOpenHouse {
  OpenHouseKey: string;
  ListingKey: string;
  ListingId?: string;
  OpenHouseDate: string;
  OpenHouseStartTime: string;
  OpenHouseEndTime: string;
  OpenHouseRemarks?: string;
  OpenHouseType?: string;
  ShowingAgentKey?: string;
  ShowingAgentName?: string;
  ModificationTimestamp: string;
}

export interface TrestlePropertyUnitType {
  UnitTypeKey?: string;
  UnitTypeType?: string;
  UnitTypeBedsTotal?: number;
  UnitTypeBathsTotal?: number;
  UnitTypeActualRent?: number;
  UnitTypeProFormaRent?: number;
  UnitTypeTotalRent?: number;
  UnitTypeGarageSpaces?: number;
  UnitTypeDescription?: string;
}

export interface ODataResponse<T> {
  "@odata.context"?: string;
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: T[];
}

export interface TrestleQueryParams {
  $filter?: string;
  $select?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
  $expand?: string;
}

export type TrestleAuthMethod = "oauth2" | "basic" | "bearer";

export interface TrestleAuthConfig {
  method: TrestleAuthMethod;
  // For OAuth2 Client Credentials
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  // For Basic Auth
  username?: string;
  password?: string;
  // For Bearer Token
  bearerToken?: string;
  // API Base URL (the WebAPI address)
  apiUrl: string;
}

export class TrestleClient {
  private authConfig: TrestleAuthConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: TrestleAuthConfig) {
    this.authConfig = config;
  }

  /**
   * Get authorization header based on auth method
   */
  private async getAuthHeader(): Promise<string> {
    switch (this.authConfig.method) {
      case "basic":
        // Basic Auth: base64 encode username:password
        const credentials = `${this.authConfig.username}:${this.authConfig.password}`;
        const encoded = Buffer.from(credentials).toString("base64");
        return `Basic ${encoded}`;

      case "bearer":
        // Pre-provided bearer token
        return `Bearer ${this.authConfig.bearerToken}`;

      case "oauth2":
      default:
        // OAuth2 Client Credentials flow
        const token = await this.getOAuth2Token();
        return `Bearer ${token}`;
    }
  }

  /**
   * Normalize the API URL to always end with /trestle/odata.
   * Handles these inputs:
   *   https://api.cotality.com                  → https://api.cotality.com/trestle/odata
   *   https://api.cotality.com/trestle          → https://api.cotality.com/trestle/odata
   *   https://api.cotality.com/trestle/odata    → https://api.cotality.com/trestle/odata (unchanged)
   */
  private normalizeApiUrl(): string {
    const raw = (this.authConfig.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
    if (raw.includes("/trestle/odata")) return raw;
    if (raw.includes("/trestle")) return `${raw}/odata`;
    return `${raw}/trestle/odata`;
  }

  /**
   * Derive token URL from the API URL when no explicit token URL is configured.
   * e.g. https://api.cotality.com → https://api.cotality.com/trestle/oidc/connect/token
   */
  private deriveTokenUrl(): string {
    if (this.authConfig.tokenUrl) return this.authConfig.tokenUrl;
    // Normalize first to ensure /trestle is in the path, then swap /odata for the OIDC path
    const trestleBase = this.normalizeApiUrl().replace(/\/odata$/, "");
    return `${trestleBase}/oidc/connect/token`;
  }

  /**
   * Get OAuth2 access token using client credentials
   */
  private async getOAuth2Token(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = this.deriveTokenUrl();
    console.log(`[Trestle] Requesting OAuth2 token from: ${tokenUrl}`);
    console.log(`[Trestle] Client ID: ${this.authConfig.clientId?.substring(0, 20)}...`);

    // Per Trestle docs, scope=api is required for WebAPI access.
    // If the account isn't provisioned for that scope yet, fall back to no scope.
    let response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.authConfig.clientId || "",
        client_secret: this.authConfig.clientSecret || "",
        scope: "api",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 400 && errorText.includes("invalid_scope")) {
        console.warn("[Trestle] scope=api rejected (invalid_scope) — retrying without scope. Contact Trestle to enable api scope for this client.");
        response = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.authConfig.clientId || "",
            client_secret: this.authConfig.clientSecret || "",
          }),
        });
        if (!response.ok) {
          const fallbackError = await response.text();
          console.error(`[Trestle] OAuth token request FAILED (${response.status}):`, fallbackError);
          throw new Error(`Trestle authentication failed: ${response.status} - ${fallbackError}`);
        }
      } else {
        console.error(`[Trestle] OAuth token request FAILED (${response.status}):`, errorText);
        throw new Error(`Trestle authentication failed: ${response.status} - ${errorText}`);
      }
    }

    const data: TrestleTokenResponse = await response.json();
    this.accessToken = data.access_token;
    // Set expiry 5 minutes before actual expiry for safety
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);

    console.log(`[Trestle] OAuth token obtained successfully (expires in ${data.expires_in}s)`);
    return this.accessToken;
  }

  /**
   * Make authenticated request to Trestle API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const authHeader = await this.getAuthHeader();

    const baseUrl = this.normalizeApiUrl();
    const url = `${baseUrl}${endpoint}`;
    console.log(`[Trestle] API request: ${url}`);

    const start = Date.now();
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json",
        "OData-Version": "4.0",
        "OData-MaxVersion": "4.0",
        ...options.headers,
      },
    });

    // Log API call (non-blocking)
    try {
      const { logApiCall } = await import("@/lib/api-call-logger");
      const ep = endpoint.split("?")[0]; // strip query params
      logApiCall({ provider: "trestle", endpoint: ep, method: options.method || "GET", statusCode: response.status, responseTimeMs: Date.now() - start });
    } catch { /* ignore */ }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Trestle] API request FAILED (${response.status}) for ${url}:`, errorText);
      throw new Error(`Trestle API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Build OData query string from params
   */
  private buildQueryString(params?: TrestleQueryParams): string {
    if (!params) return "";

    const queryParts: string[] = [];

    if (params.$filter) queryParts.push(`$filter=${encodeURIComponent(params.$filter)}`);
    if (params.$select) queryParts.push(`$select=${encodeURIComponent(params.$select)}`);
    if (params.$orderby) queryParts.push(`$orderby=${encodeURIComponent(params.$orderby)}`);
    if (params.$top !== undefined) queryParts.push(`$top=${params.$top}`);
    if (params.$skip !== undefined) queryParts.push(`$skip=${params.$skip}`);
    if (params.$count) queryParts.push(`$count=true`);
    if (params.$expand) queryParts.push(`$expand=${encodeURIComponent(params.$expand)}`);

    return queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  }

  /**
   * Get property listings
   */
  async getProperties(params?: TrestleQueryParams): Promise<ODataResponse<TrestleProperty>> {
    const query = this.buildQueryString(params);
    return this.request<ODataResponse<TrestleProperty>>(`/Property${query}`);
  }

  /**
   * Get a single property by ListingKey
   */
  async getProperty(listingKey: string): Promise<TrestleProperty> {
    return this.request<TrestleProperty>(`/Property('${listingKey}')`);
  }

  /**
   * Search properties with common filters
   */
  async searchProperties(options: {
    status?: ("Active" | "Pending" | "Closed")[];
    city?: string;
    postalCode?: string;
    subdivisionName?: string;
    minPrice?: number;
    maxPrice?: number;
    minBeds?: number;
    minBaths?: number;
    propertyType?: string;
    minDaysOnMarket?: number;
    modifiedSince?: Date;
    limit?: number;
    offset?: number;
    includeMedia?: boolean;
    skipCount?: boolean;
  }): Promise<ODataResponse<TrestleProperty>> {
    const filters: string[] = [];

    if (options.status?.length) {
      const statusFilter = options.status.map(s => `StandardStatus eq '${s}'`).join(" or ");
      filters.push(`(${statusFilter})`);
    }

    if (options.city) {
      // Case-insensitive partial match using OData contains + tolower
      filters.push(`contains(tolower(City), '${options.city.toLowerCase()}')`);
    }

    if (options.postalCode) {
      // Postal codes support startswith for partial zip matching
      filters.push(`startswith(PostalCode, '${options.postalCode}')`);
    }

    if (options.subdivisionName) {
      const escaped = options.subdivisionName.replace(/'/g, "''").toLowerCase();
      filters.push(`contains(tolower(SubdivisionName), '${escaped}')`);
    }

    if (options.minPrice !== undefined) {
      filters.push(`ListPrice ge ${options.minPrice}`);
    }

    if (options.maxPrice !== undefined) {
      filters.push(`ListPrice le ${options.maxPrice}`);
    }

    if (options.minBeds !== undefined) {
      filters.push(`BedroomsTotal ge ${options.minBeds}`);
    }

    if (options.minBaths !== undefined) {
      filters.push(`BathroomsTotalInteger ge ${options.minBaths}`);
    }

    if (options.propertyType) {
      filters.push(`PropertyType eq '${options.propertyType}'`);
    }

    if (options.minDaysOnMarket !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.minDaysOnMarket);
      filters.push(`OnMarketDate le ${cutoffDate.toISOString().split("T")[0]}`);
    }

    if (options.modifiedSince) {
      filters.push(`ModificationTimestamp gt ${options.modifiedSince.toISOString()}`);
    }

    const params: TrestleQueryParams = {
      $filter: filters.length > 0 ? filters.join(" and ") : undefined,
      $orderby: "ModificationTimestamp desc",
      $top: options.limit || 25,
      $skip: options.offset || 0,
      $count: options.skipCount ? undefined : true,
    };

    if (options.includeMedia) {
      params.$expand = "Media";
    }

    return this.getProperties(params);
  }

  /**
   * Get property media/photos
   */
  async getPropertyMedia(listingKey: string): Promise<ODataResponse<TrestleMedia>> {
    console.log(`[Trestle] Fetching media for listing ${listingKey}`);
    const result = await this.request<ODataResponse<TrestleMedia>>(
      `/Media?$filter=ResourceRecordKey eq '${listingKey}'&$orderby=Order&$select=MediaKey,MediaURL,MediaType,Order,ShortDescription`
    );
    console.log(`[Trestle] Media result: ${result.value?.length || 0} items`);
    return result;
  }

  /**
   * Get agent/member roster
   */
  async getMembers(params?: TrestleQueryParams): Promise<ODataResponse<TrestleMember>> {
    const query = this.buildQueryString(params);
    return this.request<ODataResponse<TrestleMember>>(`/Member${query}`);
  }

  /**
   * Get a single member by MemberKey
   */
  async getMember(memberKey: string): Promise<TrestleMember> {
    return this.request<TrestleMember>(`/Member('${memberKey}')`);
  }

  /**
   * Search members
   */
  async searchMembers(options: {
    name?: string;
    email?: string;
    officeKey?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ODataResponse<TrestleMember>> {
    const filters: string[] = [];

    if (options.name) {
      filters.push(`contains(MemberFullName, '${options.name}')`);
    }

    if (options.email) {
      filters.push(`MemberEmail eq '${options.email}'`);
    }

    if (options.officeKey) {
      filters.push(`OfficeKey eq '${options.officeKey}'`);
    }

    if (options.status) {
      filters.push(`MemberStatus eq '${options.status}'`);
    }

    const params: TrestleQueryParams = {
      $filter: filters.length > 0 ? filters.join(" and ") : undefined,
      $orderby: "MemberLastName",
      $top: options.limit || 25,
      $skip: options.offset || 0,
      $count: true,
    };

    return this.getMembers(params);
  }

  /**
   * Get offices
   */
  async getOffices(params?: TrestleQueryParams): Promise<ODataResponse<TrestleOffice>> {
    const query = this.buildQueryString(params);
    return this.request<ODataResponse<TrestleOffice>>(`/Office${query}`);
  }

  /**
   * Get a single office by OfficeKey
   */
  async getOffice(officeKey: string): Promise<TrestleOffice> {
    return this.request<TrestleOffice>(`/Office('${officeKey}')`);
  }

  /**
   * Get open houses
   */
  async getOpenHouses(params?: TrestleQueryParams): Promise<ODataResponse<TrestleOpenHouse>> {
    const query = this.buildQueryString(params);
    return this.request<ODataResponse<TrestleOpenHouse>>(`/OpenHouse${query}`);
  }

  /**
   * Get upcoming open houses
   */
  async getUpcomingOpenHouses(options?: {
    listingKey?: string;
    daysAhead?: number;
    limit?: number;
  }): Promise<ODataResponse<TrestleOpenHouse>> {
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + (options?.daysAhead || 14));
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const filters: string[] = [
      `OpenHouseDate ge ${today}`,
      `OpenHouseDate le ${futureDateStr}`,
    ];

    if (options?.listingKey) {
      filters.push(`ListingKey eq '${options.listingKey}'`);
    }

    const params: TrestleQueryParams = {
      $filter: filters.join(" and "),
      $orderby: "OpenHouseDate,OpenHouseStartTime",
      $top: options?.limit || 50,
      $count: true,
    };

    return this.getOpenHouses(params);
  }

  /**
   * Search properties by MLS Listing ID (not ListingKey)
   */
  async searchByListingId(listingId: string): Promise<TrestleProperty | null> {
    const result = await this.getProperties({
      $filter: `ListingId eq '${listingId}'`,
      $top: 1,
      $expand: "Media",
    });
    return result.value.length > 0 ? result.value[0] : null;
  }

  /**
   * Get sales history for a property address — queries closed listings
   * Returns all past transactions with close price, dates, agents, and offices
   */
  async getSalesHistory(address: string, options?: { limit?: number }): Promise<TrestleProperty[]> {
    // Parse the address: extract street portion (before city/state/zip)
    // Input formats: "45-535 Luluku Road #G5, Kaneohe, HI 96744" or "123 Main St"
    const parts = address.split(",");
    let streetPart = (parts[0] || address).trim();

    // Remove unit/apt numbers for broader matching
    streetPart = streetPart.replace(/\s*(#|apt|unit|ste|suite)\s*\S+/gi, "").trim();
    const escaped = streetPart.replace(/'/g, "''").toLowerCase();

    if (!escaped || escaped.length < 3) {
      console.warn("[Trestle] getSalesHistory: address too short to search:", address);
      return [];
    }

    // Extract street number and street name separately for precise matching
    const streetMatch = escaped.match(/^(\d[\d-]*)\s+(.+)/);
    let filter: string;
    if (streetMatch) {
      const [, streetNum, streetName] = streetMatch;
      // Match by street number + street name (most precise)
      filter = `StandardStatus eq 'Closed' and tolower(StreetNumber) eq '${streetNum}' and contains(tolower(StreetName), '${streetName}')`;
    } else {
      // Fallback: match against UnparsedAddress
      filter = `StandardStatus eq 'Closed' and contains(tolower(UnparsedAddress), '${escaped}')`;
    }

    console.log(`[Trestle] Sales history search: ${filter}`);

    const result = await this.getProperties({
      $filter: filter,
      $orderby: "CloseDate desc",
      $top: options?.limit || 20,
      $select: "ListingKey,ListingId,StandardStatus,ListPrice,OriginalListPrice,ClosePrice,CloseDate,OnMarketDate,DaysOnMarket,CumulativeDaysOnMarket,UnparsedAddress,StreetNumber,StreetName,StreetSuffix,City,PostalCode,BedroomsTotal,BathroomsTotalInteger,LivingArea,PropertyType,PropertySubType,ListAgentFullName,BuyerAgentFullName,ListOfficeName,BuyerOfficeName,OwnershipType",
    });

    console.log(`[Trestle] Sales history: ${result.value?.length || 0} closed transactions for "${streetPart}"`);
    return result.value || [];
  }

  /**
   * Get property unit types (for multi-family investment analysis)
   */
  async getPropertyUnits(listingKey: string): Promise<ODataResponse<TrestlePropertyUnitType>> {
    return this.request<ODataResponse<TrestlePropertyUnitType>>(
      `/PropertyUnitTypes?$filter=ListingKey eq '${listingKey}'`
    );
  }

  /**
   * Test API connection by hitting the OData service root, then attempting
   * a minimal Property query to confirm data access.
   */
  async testConnection(): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      console.log(`[Trestle] Testing connection (method: ${this.authConfig.method}, apiUrl: ${this.authConfig.apiUrl})`);

      const authHeader = await this.getAuthHeader();
      console.log(`[Trestle] Auth header obtained: ${authHeader.substring(0, 15)}...`);

      const baseUrl = this.normalizeApiUrl();

      // Step 1 — OData service root (always accessible once authenticated)
      const rootResp = await fetch(baseUrl, {
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json",
          "OData-Version": "4.0",
          "OData-MaxVersion": "4.0",
        },
      });

      console.log(`[Trestle] OData root response: ${rootResp.status}`);

      if (!rootResp.ok) {
        const body = await rootResp.text();
        throw new Error(`Trestle API error: ${rootResp.status} - ${body}`);
      }

      // Step 2 — minimal Property query (non-fatal; 403 means data not yet provisioned)
      let totalListings = 0;
      try {
        const propResp = await fetch(`${baseUrl}/Property?$top=1&$select=ListingKey`, {
          headers: {
            "Authorization": authHeader,
            "Accept": "application/json",
            "OData-Version": "4.0",
            "OData-MaxVersion": "4.0",
          },
        });
        console.log(`[Trestle] Property query response: ${propResp.status}`);
        if (propResp.ok) {
          const data = await propResp.json();
          totalListings = data["@odata.count"] ?? (data.value?.length ?? 0);
        } else {
          const body = await propResp.text();
          console.warn(`[Trestle] Property query returned ${propResp.status} (data may not be provisioned yet):`, body);
        }
      } catch (propErr) {
        console.warn("[Trestle] Property query failed (non-fatal):", propErr);
      }

      return {
        success: true,
        message: "Successfully connected to Trestle API",
        data: { totalListings },
      };
    } catch (error) {
      console.error("[Trestle] Connection test failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  /**
   * Get API metadata (schema information)
   */
  async getMetadata(): Promise<string> {
    const authHeader = await this.getAuthHeader();
    const baseUrl = this.normalizeApiUrl();

    const response = await fetch(`${baseUrl}/$metadata`, {
      headers: {
        "Authorization": authHeader,
        "Accept": "application/xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }

    return response.text();
  }
}

/**
 * Helper to create a Trestle client from stored config
 * Supports multiple authentication methods
 */
export function createTrestleClient(config: {
  // Auth method
  auth_method?: TrestleAuthMethod;
  // OAuth2 credentials
  client_id?: string;
  client_secret?: string;
  token_url?: string;
  // Basic Auth credentials
  username?: string;
  password?: string;
  // Bearer token
  bearer_token?: string;
  // API URL
  api_url?: string;
}): TrestleClient {
  // Determine auth method from provided credentials
  let method: TrestleAuthMethod = config.auth_method || "basic";

  if (!config.auth_method) {
    if (config.username && config.password) {
      method = "basic";
    } else if (config.client_id && config.client_secret) {
      method = "oauth2";
    } else if (config.bearer_token) {
      method = "bearer";
    }
  }

  // Fall back to env var or default Cotality API URL
  const apiUrl = config.api_url || process.env.TRESTLE_API_URL || DEFAULT_API_URL;

  return new TrestleClient({
    method,
    clientId: config.client_id,
    clientSecret: config.client_secret,
    tokenUrl: config.token_url,
    username: config.username,
    password: config.password,
    bearerToken: config.bearer_token,
    apiUrl,
  });
}
