/**
 * RMLS (Regional Multiple Listing Service) API Client.
 *
 * Covers Oregon and Southwest Washington. RESO Data Dictionary 1.7,
 * Web API Server Core 2.0.0, OData v4. Docs:
 *   https://rmlscentral.com/reso-api-documentation/
 *   https://rmlscentral.com/reso-technical-faqs/
 *
 * Key differences vs Trestle:
 * - Auth: a pre-issued Bearer token — PER-VENDOR, not per-agent. Stored
 *   in RMLS_BEARER_TOKEN env var server-side only. Agents don't bring
 *   their own credentials; they record their LCLA consent in our DB and
 *   we serve them data under our vendor entitlement.
 * - Enum filters require a type prefix:
 *     StandardStatus eq Odata.Models.StandardStatus'Active'
 * - Max 250 records per request. Recommended: slice by ListingKeyNumeric
 *   for bulk pulls and follow @odata.nextLink.
 * - BathsTotal is Edm.String (e.g. "3.1" = 3 full + 1 partial), not decimal.
 * - Integer fields return 0 instead of null (OData serializer quirk).
 * - Field names are case-sensitive; use standard single quotes (not curly).
 * - No sandbox. Data refreshes every ~15 minutes.
 */

import type {
  MLSClient,
  MlsProperty,
  MlsMedia,
  MlsMember,
  MlsOffice,
  MlsOpenHouse,
  MlsPropertyUnitType,
  MlsODataResponse,
  MlsQueryParams,
  MlsSearchOptions,
  MlsMemberSearchOptions,
} from "../mls/types";

const DEFAULT_RMLS_BASE = "https://resoapi.rmlsweb.com/reso/odata";
const RMLS_MAX_TOP = 250;

export interface RmlsConfig {
  bearerToken: string;
  baseUrl?: string;
}

/**
 * RESO OData v4 enum literal. RMLS requires the namespace prefix.
 * Example: enumLit("StandardStatus", "Active") → Odata.Models.StandardStatus'Active'
 */
function enumLit(typeName: string, value: string): string {
  return `Odata.Models.${typeName}'${value.replace(/'/g, "''")}'`;
}

/** String literal with doubled single-quote escaping, per OData v4. */
function strLit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export class RmlsClient implements MLSClient {
  public readonly provider = "rmls" as const;
  private readonly bearerToken: string;
  private readonly baseUrl: string;

  constructor(config: RmlsConfig) {
    if (!config.bearerToken) {
      throw new Error("RmlsClient: bearerToken is required (set RMLS_BEARER_TOKEN in env)");
    }
    this.bearerToken = config.bearerToken;
    this.baseUrl = (config.baseUrl || DEFAULT_RMLS_BASE).replace(/\/$/, "");
  }

  // ────────────────────────────────────────────────────────────────────
  // Core request plumbing
  // ────────────────────────────────────────────────────────────────────

  private buildQueryString(params?: MlsQueryParams): string {
    if (!params) return "";
    const parts: string[] = [];
    if (params.$filter) parts.push(`$filter=${encodeURIComponent(params.$filter)}`);
    if (params.$select) parts.push(`$select=${encodeURIComponent(params.$select)}`);
    if (params.$orderby) parts.push(`$orderby=${encodeURIComponent(params.$orderby)}`);
    if (params.$top !== undefined) parts.push(`$top=${Math.min(params.$top, RMLS_MAX_TOP)}`);
    if (params.$skip !== undefined) parts.push(`$skip=${params.$skip}`);
    if (params.$count) parts.push(`$count=true`);
    if (params.$expand) parts.push(`$expand=${encodeURIComponent(params.$expand)}`);
    return parts.length > 0 ? `?${parts.join("&")}` : "";
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const start = Date.now();

    const response = await fetch(url, {
      ...options,
      headers: {
        // RMLS docs show the header as literally "Authorization: YourBearerToken"
        // but standard RFC 6750 Bearer form is widely accepted. Sending both forms
        // via a single header value is not possible — use the RFC form which all
        // OAuth2-compliant resource servers honor.
        Authorization: `Bearer ${this.bearerToken}`,
        Accept: "application/json",
        "OData-Version": "4.0",
        "OData-MaxVersion": "4.0",
        ...options.headers,
      },
    });

    // Log API call (non-blocking)
    try {
      const { logApiCall } = await import("@/lib/api-call-logger");
      const ep = endpoint.split("?")[0];
      logApiCall({
        provider: "rmls",
        endpoint: ep,
        method: options.method || "GET",
        statusCode: response.status,
        responseTimeMs: Date.now() - start,
      });
    } catch {
      /* ignore */
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RMLS] API request FAILED (${response.status}) for ${url}:`, errorText);
      throw new Error(`RMLS API error: ${response.status} - ${errorText}`);
    }

    // Metadata endpoint returns XML; everything else returns JSON.
    if (endpoint.includes("$metadata")) {
      return response.text() as unknown as T;
    }
    return response.json();
  }

  // ────────────────────────────────────────────────────────────────────
  // Property queries
  // ────────────────────────────────────────────────────────────────────

  async getProperties(params?: MlsQueryParams): Promise<MlsODataResponse<MlsProperty>> {
    const q = this.buildQueryString(params);
    return this.request<MlsODataResponse<MlsProperty>>(`/Property${q}`);
  }

  async getProperty(listingKey: string): Promise<MlsProperty> {
    // RMLS uses ListingKeyNumeric as primary key but accepts ListingKey in Property('...') form.
    return this.request<MlsProperty>(`/Property(${strLit(listingKey)})`);
  }

  async searchProperties(options: MlsSearchOptions): Promise<MlsODataResponse<MlsProperty>> {
    const filters: string[] = [];

    if (options.status?.length) {
      const statusFilter = options.status.map((s) => `StandardStatus eq ${enumLit("StandardStatus", s)}`).join(" or ");
      filters.push(`(${statusFilter})`);
    }

    if (options.city) {
      filters.push(`contains(tolower(City), ${strLit(options.city.toLowerCase())})`);
    }

    if (options.postalCode) {
      filters.push(`startswith(PostalCode, ${strLit(options.postalCode)})`);
    }

    if (options.subdivisionName) {
      filters.push(`contains(tolower(SubdivisionName), ${strLit(options.subdivisionName.toLowerCase())})`);
    }

    if (options.minPrice !== undefined) {
      filters.push(`ListPrice ge ${options.minPrice}`);
    }

    if (options.maxPrice !== undefined) {
      filters.push(`ListPrice le ${options.maxPrice}`);
    }

    // Note: beds/baths often filtered post-fetch because not all listings populate them.
    // We still allow OData-side bed filtering since RMLS populates BedroomsTotal reliably.
    if (options.minBeds !== undefined) {
      filters.push(`BedroomsTotal ge ${options.minBeds}`);
    }

    if (options.propertyType) {
      const pt = options.propertyType.toLowerCase();
      if (pt.includes("single") || pt === "sfr") {
        filters.push(`PropertyType eq ${enumLit("PropertyType", "Residential")} and PropertySubType eq ${enumLit("PropertySubType", "SingleFamilyResidence")}`);
      } else if (pt.includes("condo")) {
        filters.push(`PropertyType eq ${enumLit("PropertyType", "Residential")} and PropertySubType eq ${enumLit("PropertySubType", "Condominium")}`);
      } else if (pt.includes("town")) {
        filters.push(`PropertyType eq ${enumLit("PropertyType", "Residential")} and PropertySubType eq ${enumLit("PropertySubType", "Townhouse")}`);
      } else if (pt.includes("rental") || pt.includes("lease")) {
        filters.push(`PropertyType eq ${enumLit("PropertyType", "ResidentialLease")}`);
      } else if (pt.includes("land")) {
        filters.push(`PropertyType eq ${enumLit("PropertyType", "Land")}`);
      } else if (pt.includes("residential")) {
        filters.push(`PropertyType eq ${enumLit("PropertyType", "Residential")}`);
      } else {
        filters.push(`PropertyType eq ${enumLit("PropertyType", options.propertyType)}`);
      }
    }

    if (options.minDaysOnMarket !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.minDaysOnMarket);
      filters.push(`OnMarketDate le ${cutoffDate.toISOString().split("T")[0]}`);
    }

    if (options.modifiedSince) {
      filters.push(`ModificationTimestamp gt ${options.modifiedSince.toISOString()}`);
    }

    const params: MlsQueryParams = {
      $filter: filters.length > 0 ? filters.join(" and ") : undefined,
      $orderby: "ModificationTimestamp desc",
      $top: Math.min(options.limit ?? 25, RMLS_MAX_TOP),
      $skip: options.offset || 0,
      $count: options.skipCount ? undefined : true,
    };

    if (options.includeMedia) {
      // RMLS supports $expand=Media inline with listings — preferred over a separate /Media call.
      params.$expand = "Media";
    }

    return this.getProperties(params);
  }

  async searchByListingId(listingId: string): Promise<MlsProperty | null> {
    const res = await this.getProperties({
      $filter: `ListingId eq ${strLit(listingId)}`,
      $top: 1,
    });
    return res.value?.[0] || null;
  }

  // ────────────────────────────────────────────────────────────────────
  // Media
  // ────────────────────────────────────────────────────────────────────

  async getPropertyMedia(listingKey: string): Promise<MlsODataResponse<MlsMedia>> {
    return this.request<MlsODataResponse<MlsMedia>>(
      `/Media?$filter=ResourceRecordKey eq ${strLit(listingKey)}&$orderby=Order&$select=MediaKey,MediaURL,MediaType,Order,ShortDescription`,
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // Members / Offices
  // ────────────────────────────────────────────────────────────────────

  async getMembers(params?: MlsQueryParams): Promise<MlsODataResponse<MlsMember>> {
    const q = this.buildQueryString(params);
    return this.request<MlsODataResponse<MlsMember>>(`/Member${q}`);
  }

  async getMember(memberKey: string): Promise<MlsMember> {
    return this.request<MlsMember>(`/Member(${strLit(memberKey)})`);
  }

  async searchMembers(options: MlsMemberSearchOptions): Promise<MlsODataResponse<MlsMember>> {
    const filters: string[] = [];
    if (options.name) filters.push(`contains(MemberFullName, ${strLit(options.name)})`);
    if (options.email) filters.push(`MemberEmail eq ${strLit(options.email)}`);
    if (options.officeKey) filters.push(`OfficeKey eq ${strLit(options.officeKey)}`);
    if (options.status) filters.push(`MemberStatus eq ${strLit(options.status)}`);

    return this.getMembers({
      $filter: filters.length > 0 ? filters.join(" and ") : undefined,
      $orderby: "MemberLastName",
      $top: Math.min(options.limit ?? 25, RMLS_MAX_TOP),
      $skip: options.offset || 0,
      $count: true,
    });
  }

  async getOffices(params?: MlsQueryParams): Promise<MlsODataResponse<MlsOffice>> {
    const q = this.buildQueryString(params);
    return this.request<MlsODataResponse<MlsOffice>>(`/Office${q}`);
  }

  async getOffice(officeKey: string): Promise<MlsOffice> {
    return this.request<MlsOffice>(`/Office(${strLit(officeKey)})`);
  }

  // ────────────────────────────────────────────────────────────────────
  // Open houses
  // ────────────────────────────────────────────────────────────────────

  async getOpenHouses(params?: MlsQueryParams): Promise<MlsODataResponse<MlsOpenHouse>> {
    const q = this.buildQueryString(params);
    return this.request<MlsODataResponse<MlsOpenHouse>>(`/OpenHouse${q}`);
  }

  async getUpcomingOpenHouses(options: { listingKey?: string; daysAhead?: number; limit?: number }): Promise<MlsODataResponse<MlsOpenHouse>> {
    const filters: string[] = [];
    const today = new Date().toISOString().split("T")[0];
    filters.push(`OpenHouseDate ge ${today}`);

    if (options.daysAhead) {
      const end = new Date();
      end.setDate(end.getDate() + options.daysAhead);
      filters.push(`OpenHouseDate le ${end.toISOString().split("T")[0]}`);
    }
    if (options.listingKey) filters.push(`ListingKey eq ${strLit(options.listingKey)}`);

    return this.getOpenHouses({
      $filter: filters.join(" and "),
      $orderby: "OpenHouseDate,OpenHouseStartTime",
      $top: Math.min(options.limit ?? 50, RMLS_MAX_TOP),
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Sales history (closed transactions for a specific address)
  // ────────────────────────────────────────────────────────────────────

  async getSalesHistory(
    address: string,
    options?: { city?: string; postalCode?: string; limit?: number },
  ): Promise<{ unit: MlsProperty[]; building: MlsProperty[]; unitNumber?: string }> {
    const filters: string[] = [];
    filters.push(`StandardStatus eq ${enumLit("StandardStatus", "Closed")}`);

    // RMLS doesn't split condo unit vs building listings the way HiCentral does,
    // so we do a single UnparsedAddress contains match and return everything as `unit`.
    const addressLower = address.trim().toLowerCase().replace(/\s+/g, " ");
    filters.push(`contains(tolower(UnparsedAddress), ${strLit(addressLower)})`);

    if (options?.city) filters.push(`contains(tolower(City), ${strLit(options.city.toLowerCase())})`);
    if (options?.postalCode) filters.push(`startswith(PostalCode, ${strLit(options.postalCode)})`);

    const res = await this.getProperties({
      $filter: filters.join(" and "),
      $orderby: "CloseDate desc",
      $top: Math.min(options?.limit ?? 25, RMLS_MAX_TOP),
    });

    // Detect unit number in the query address, if any (e.g. "Unit 4", "#12B").
    const unitMatch = address.match(/(?:unit|apt|#)\s*([A-Za-z0-9-]+)/i);
    const unitNumber = unitMatch ? unitMatch[1] : undefined;

    return { unit: res.value || [], building: [], unitNumber };
  }

  // ────────────────────────────────────────────────────────────────────
  // Multi-family unit types
  // ────────────────────────────────────────────────────────────────────

  async getPropertyUnits(listingKey: string): Promise<MlsODataResponse<MlsPropertyUnitType>> {
    return this.request<MlsODataResponse<MlsPropertyUnitType>>(
      `/PropertyUnitTypes?$filter=ListingKey eq ${strLit(listingKey)}`,
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // Health / metadata
  // ────────────────────────────────────────────────────────────────────

  async testConnection(): Promise<{ ok: boolean; message: string; totalListings?: number }> {
    try {
      const res = await this.getProperties({ $top: 1, $count: true });
      return {
        ok: true,
        message: "RMLS connection OK",
        totalListings: res["@odata.count"],
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async getMetadata(): Promise<string> {
    return this.request<string>(`/$metadata`);
  }
}

/** Parse "3.1" style BathsTotal → { full, partial, total }. Safe on null/undef/numbers. */
export function parseRmlsBathsTotal(v: unknown): { full: number; partial: number; total: number } | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const [fullRaw, partialRaw] = s.split(".");
  const full = Number.parseInt(fullRaw || "0", 10) || 0;
  const partial = Number.parseInt(partialRaw || "0", 10) || 0;
  if (!Number.isFinite(full) && !Number.isFinite(partial)) return null;
  return { full, partial, total: full + partial };
}

/** Factory — pulls bearer token from env. Throws if unconfigured. */
export function createRmlsClient(overrides?: Partial<RmlsConfig>): RmlsClient {
  const bearerToken = overrides?.bearerToken ?? process.env.RMLS_BEARER_TOKEN ?? "";
  const baseUrl = overrides?.baseUrl ?? process.env.RMLS_API_URL ?? DEFAULT_RMLS_BASE;
  if (!bearerToken) {
    throw new Error(
      "RMLS_BEARER_TOKEN is not configured. Request credentials from ds@rmls.com (vendor application + signed LCLA) and set the env var.",
    );
  }
  return new RmlsClient({ bearerToken, baseUrl });
}
