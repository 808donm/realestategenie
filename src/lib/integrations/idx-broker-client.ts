/**
 * IDX Broker Client
 *
 * Searches MLS listings via the IDX Broker API on behalf of agents
 * who have IDX Broker accounts. Each agent configures their own API key.
 *
 * IDX Broker API docs: https://middleware.idxbroker.com/docs/api/overview
 *
 * Key endpoints:
 *   GET /clients/search       -- Search properties
 *   GET /clients/listing/{id} -- Get single listing
 *   GET /clients/featured     -- Featured listings
 *   GET /clients/cities       -- Available cities
 *
 * All requests require header: accesskey: {agent_api_key}
 */

const IDX_BASE_URL = "https://api.idxbroker.com";

export interface IdxProperty {
  listingID: string;
  address: string;
  cityName: string;
  state: string;
  zipcode: string;
  listingPrice: string;
  bedrooms: string;
  totalBaths: string;
  sqFt: string;
  lotSize?: string;
  yearBuilt?: string;
  propertyType?: string;
  remarksConcat?: string;
  image?: { url: string }[];
  virtualTourLink?: string;
  listingAgentName?: string;
  listingOfficeName?: string;
  latitude?: string;
  longitude?: string;
  mlsStatus?: string;
}

export interface IdxSearchParams {
  /** City name */
  city?: string;
  /** Zip code */
  zipcode?: string;
  /** Min price */
  minPrice?: number;
  /** Max price */
  maxPrice?: number;
  /** Min bedrooms */
  minBeds?: number;
  /** Min bathrooms */
  minBaths?: number;
  /** Property type: "Residential", "Condo", "Multi-Family", etc. */
  propertyType?: string;
  /** Min square footage */
  minSqFt?: number;
  /** Max results (default 10) */
  limit?: number;
  /** Free-text search query */
  q?: string;
}

export interface IdxSearchResult {
  properties: IdxProperty[];
  totalCount: number;
}

export class IdxBrokerClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make an authenticated request to the IDX Broker API.
   */
  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${IDX_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== "") url.searchParams.set(k, v);
      });
    }

    const res = await fetch(url.toString(), {
      headers: {
        accesskey: this.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`IDX Broker API error ${res.status}: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Search for properties matching the given criteria.
   */
  async searchProperties(params: IdxSearchParams): Promise<IdxSearchResult> {
    const queryParams: Record<string, string> = {};

    if (params.city) queryParams.city = params.city;
    if (params.zipcode) queryParams.zipcode = params.zipcode;
    if (params.minPrice) queryParams.sPrice = String(params.minPrice);
    if (params.maxPrice) queryParams.ePrice = String(params.maxPrice);
    if (params.minBeds) queryParams.sBeds = String(params.minBeds);
    if (params.minBaths) queryParams.sBaths = String(params.minBaths);
    if (params.propertyType) queryParams.pt = params.propertyType;
    if (params.minSqFt) queryParams.sSqFt = String(params.minSqFt);

    // IDX Broker uses /clients/search for MLS search
    const data = await this.request<any>("/clients/search", queryParams);

    // IDX Broker returns an object keyed by listing ID
    const listings: IdxProperty[] = [];
    if (data && typeof data === "object") {
      for (const [key, val] of Object.entries(data)) {
        if (key === "totalResults" || key === "absolute" || typeof val !== "object") continue;
        listings.push(val as IdxProperty);
      }
    }

    const limit = params.limit || 10;
    return {
      properties: listings.slice(0, limit),
      totalCount: data?.totalResults || listings.length,
    };
  }

  /**
   * Get a single listing by ID.
   */
  async getListing(listingId: string): Promise<IdxProperty | null> {
    try {
      const data = await this.request<any>(`/clients/listing/${encodeURIComponent(listingId)}`);
      return data || null;
    } catch {
      return null;
    }
  }

  /**
   * Get the agent's featured listings.
   */
  async getFeaturedListings(limit: number = 6): Promise<IdxProperty[]> {
    try {
      const data = await this.request<any>("/clients/featured");
      const listings: IdxProperty[] = [];
      if (data && typeof data === "object") {
        for (const [key, val] of Object.entries(data)) {
          if (typeof val !== "object") continue;
          listings.push(val as IdxProperty);
        }
      }
      return listings.slice(0, limit);
    } catch {
      return [];
    }
  }

  /**
   * Test the API connection.
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<any>("/clients/systemlinks");
      return { success: true, message: "Connected to IDX Broker" };
    } catch (err: any) {
      return { success: false, message: err.message || "Connection failed" };
    }
  }
}

/**
 * Format IDX properties into a simple text summary for email/chat.
 */
export function formatPropertiesForEmail(properties: IdxProperty[], agentName: string): string {
  if (properties.length === 0) return "No matching properties found at this time.";

  const lines = [
    `Here are ${properties.length} properties that match your criteria:\n`,
  ];

  properties.forEach((p, i) => {
    const price = p.listingPrice ? `$${Number(p.listingPrice).toLocaleString()}` : "Price N/A";
    const details = [
      p.bedrooms ? `${p.bedrooms} bed` : null,
      p.totalBaths ? `${p.totalBaths} bath` : null,
      p.sqFt ? `${Number(p.sqFt).toLocaleString()} sqft` : null,
    ].filter(Boolean).join(" | ");

    lines.push(`${i + 1}. ${p.address}, ${p.cityName}, ${p.state} ${p.zipcode}`);
    lines.push(`   ${price} | ${details}`);
    if (p.yearBuilt) lines.push(`   Year Built: ${p.yearBuilt}`);
    lines.push("");
  });

  lines.push(`\nInterested in any of these? Contact ${agentName} to schedule a showing!`);
  return lines.join("\n");
}

/**
 * Format properties as HTML for email.
 */
export function formatPropertiesForHtmlEmail(
  properties: IdxProperty[],
  agentName: string,
  agentPhone?: string,
  agentEmail?: string,
): string {
  if (properties.length === 0) {
    return `<p>No matching properties found at this time. ${agentName} will reach out when new listings match your criteria.</p>`;
  }

  const propCards = properties.map((p) => {
    const price = p.listingPrice ? `$${Number(p.listingPrice).toLocaleString()}` : "Price N/A";
    const imgUrl = p.image?.[0]?.url;
    return `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
        ${imgUrl ? `<img src="${imgUrl}" alt="${p.address}" style="width: 100%; height: 180px; object-fit: cover;">` : ""}
        <div style="padding: 12px 16px;">
          <div style="font-size: 18px; font-weight: 700; color: #111827;">${price}</div>
          <div style="font-size: 14px; color: #374151; margin-top: 4px;">${p.address}</div>
          <div style="font-size: 13px; color: #6b7280;">${p.cityName}, ${p.state} ${p.zipcode}</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
            ${[p.bedrooms ? `${p.bedrooms} bed` : null, p.totalBaths ? `${p.totalBaths} bath` : null, p.sqFt ? `${Number(p.sqFt).toLocaleString()} sqft` : null].filter(Boolean).join(" | ")}
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <h2 style="color: #111827;">Properties Selected for You</h2>
      <p style="color: #6b7280;">Hi! Here are ${properties.length} properties that match what you're looking for:</p>
      ${propCards}
      <div style="margin-top: 20px; padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
        <p style="font-size: 14px; color: #374151; margin: 0 0 8px;">Interested in any of these properties?</p>
        <p style="font-size: 16px; font-weight: 700; color: #1e40af; margin: 0;">${agentName}</p>
        ${agentPhone ? `<p style="font-size: 13px; color: #6b7280; margin: 4px 0;">${agentPhone}</p>` : ""}
        ${agentEmail ? `<p style="font-size: 13px; color: #6b7280; margin: 4px 0;">${agentEmail}</p>` : ""}
      </div>
      <p style="font-size: 11px; color: #9ca3af; margin-top: 16px; text-align: center;">
        Sent by Hoku, ${agentName}'s AI assistant | Powered by Real Estate Genie
      </p>
    </div>
  `;
}
