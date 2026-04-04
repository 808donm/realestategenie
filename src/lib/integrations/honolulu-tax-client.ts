/**
 * Honolulu (CCHNL) ArcGIS Open Data Client
 *
 * Provides access to Honolulu parcel ownership and tax data via the
 * City & County of Honolulu's public ArcGIS FeatureServer endpoints.
 *
 * Data sources:
 *   - OWNALL Table: All owners listed on the deed for each parcel (weekly from BFS Real Property Assessment)
 *   - Tax Parcels:  Tax parcel boundaries and attributes
 *   - All Parcels:  Combined tax + regulatory parcels
 *
 * Portal: https://honolulu-cchnl.opendata.arcgis.com/
 * Org ID: tNJpAOha4mODLkXz
 *
 * No API key required — this is public open data.
 */

const ARCGIS_BASE = "https://services.arcgis.com/tNJpAOha4mODLkXz/arcgis/rest/services";

// Default service/layer names — updated March 2026 after city renamed services
// Old: OWNALL_Table/0, Tax_Parcels/0, All_Parcels/0 (now return 400 Invalid URL)
// New: OWNINFO/0, TaxMapKey/2
const DEFAULT_OWNALL_URL = `${ARCGIS_BASE}/OWNINFO/FeatureServer/0`;
const DEFAULT_TAX_PARCELS_URL = `${ARCGIS_BASE}/TaxMapKey/FeatureServer/2`;
const DEFAULT_ALL_PARCELS_URL = `${ARCGIS_BASE}/TaxMapKey/FeatureServer/2`;

// ── Response types ──────────────────────────────────────────────────────────

export interface HonoluluOwner {
  tmk?: string;
  parid?: string;
  owner?: string;
  // New OWNINFO fields (replaced OWNALL_Table March 2026)
  taxbillown?: string;
  taxbillown1?: string;
  taxbillown2?: string;
  owntype?: string;
  owntype1?: string;
  owntype_desc?: string;
  ownseq?: number;
  // Additional fields
  [key: string]: unknown;
}

export interface HonoluluParcel {
  tmk?: string;
  type?: string; // "Tax and Regulatory" | "Tax Only" | "Regulatory Only"
  // Tax assessment fields that may be present on Parcels-Tax
  landvalue?: number;
  bldgvalue?: number;
  totalvalue?: number;
  exemption?: number;
  taxable?: number;
  taxamount?: number;
  taxyear?: number;
  // Parcel details
  zoning?: string;
  landarea?: number;
  landareasf?: number;
  // Additional fields
  [key: string]: unknown;
}

export interface HonoluluTaxRecord {
  tmk: string;
  owners: HonoluluOwner[];
  parcel?: HonoluluParcel;
}

interface ArcGISQueryResponse {
  features?: Array<{
    attributes: Record<string, unknown>;
    geometry?: unknown;
  }>;
  exceededTransferLimit?: boolean;
  error?: {
    code: number;
    message: string;
    details?: string[];
  };
}

// ── Client ──────────────────────────────────────────────────────────────────

export class HonoluluTaxClient {
  private ownallUrl: string;
  private taxParcelsUrl: string;
  private allParcelsUrl: string;

  constructor(config?: { ownallUrl?: string; taxParcelsUrl?: string; allParcelsUrl?: string }) {
    this.ownallUrl = config?.ownallUrl || process.env.HONOLULU_OWNALL_URL || DEFAULT_OWNALL_URL;
    this.taxParcelsUrl = config?.taxParcelsUrl || process.env.HONOLULU_TAX_PARCELS_URL || DEFAULT_TAX_PARCELS_URL;
    this.allParcelsUrl = config?.allParcelsUrl || process.env.HONOLULU_ALL_PARCELS_URL || DEFAULT_ALL_PARCELS_URL;
  }

  /**
   * Query an ArcGIS FeatureServer layer/table
   */
  private async query(
    serviceUrl: string,
    where: string,
    options?: {
      outFields?: string;
      resultRecordCount?: number;
      resultOffset?: number;
      orderByFields?: string;
      returnGeometry?: boolean;
    },
  ): Promise<ArcGISQueryResponse> {
    const url = new URL(`${serviceUrl}/query`);
    url.searchParams.set("where", where);
    url.searchParams.set("outFields", options?.outFields || "*");
    url.searchParams.set("f", "json");
    url.searchParams.set("returnGeometry", String(options?.returnGeometry ?? false));

    if (options?.resultRecordCount) {
      url.searchParams.set("resultRecordCount", String(options.resultRecordCount));
    }
    if (options?.resultOffset) {
      url.searchParams.set("resultOffset", String(options.resultOffset));
    }
    if (options?.orderByFields) {
      url.searchParams.set("orderByFields", options.orderByFields);
    }

    console.log(`[HonoluluTax] ArcGIS query: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HonoluluTax] Query FAILED (${response.status}):`, errorText);
      throw new Error(`ArcGIS query error: ${response.status} - ${errorText}`);
    }

    const data: ArcGISQueryResponse = await response.json();

    if (data.error) {
      console.error(`[HonoluluTax] ArcGIS error:`, data.error);
      throw new Error(`ArcGIS error ${data.error.code}: ${data.error.message}`);
    }

    return data;
  }

  // ── Owner Lookup ────────────────────────────────────────────────────────

  /**
   * Get all owners for a parcel by TMK from the OWNALL table.
   * TMK can be in any format — dashes/spaces are stripped before querying.
   */
  async getOwnersByTMK(tmk: string, address?: string): Promise<HonoluluOwner[]> {
    const cleanTmk = tmk.replace(/[-\s.]/g, "");

    // OWNINFO uses two formats:
    //   tmk:   8 digits (e.g., 29029040) -- building-level, no island prefix, no unit suffix
    //   parid: 12 digits (e.g., 290290400118) -- tmk(8) + unit suffix(4)
    //
    // For condos, Trestle often provides only the land-level TMK (9 digits, no unit).
    // The unit suffix in parid is NOT the same as the unit number in the address
    // (e.g., unit 3001 has parid suffix 0134). So we can't derive it from the address.
    //
    // Strategy: if we get multiple results from a TMK query, try to filter by
    // street number from the address to find the specific unit owner.

    // Build query conditions
    const conditions: string[] = [];
    conditions.push(`parid='${cleanTmk}'`);
    conditions.push(`tmk='${cleanTmk}'`);

    // Strip island prefix if 9+ digits
    let noIsland = cleanTmk;
    if (cleanTmk.length >= 9) {
      noIsland = cleanTmk.slice(1);
      const padded12 = noIsland.padEnd(12, "0");
      if (padded12 !== cleanTmk) conditions.push(`parid='${padded12}'`);
      if (noIsland !== cleanTmk) {
        conditions.push(`tmk='${noIsland}'`);
        conditions.push(`parid='${noIsland}'`);
      }
    }

    // Also try 8-digit building-level TMK in the same query
    const tmk8 = noIsland.length >= 8 ? noIsland.slice(0, 8) : cleanTmk.length >= 8 ? cleanTmk.slice(0, 8) : null;
    if (tmk8) {
      conditions.push(`tmk='${tmk8}'`);
    }

    const where = [...new Set(conditions)].join(" OR ");
    const result = await this.query(this.ownallUrl, where, {
      resultRecordCount: 20,
      orderByFields: "tmk ASC",
    });

    let owners = (result.features || []).map((f) => this.normalizeAttributes(f.attributes) as HonoluluOwner);

    // If multiple results from a land-level TMK (no unit suffix), we're getting
    // all units in the building. Try to match by address fields to find the specific owner.
    if (owners.length > 1 && address) {
      // Extract unit from address. Handles multiple formats:
      //   "1150 Kamahele Street 3001" -> "3001"
      //   "1150 Kamahele Street Unit 3001" -> "3001"
      //   "1150 Kamahele Street #3001" -> "3001"
      //   "7018 Hawaii Kai Drive 6-15" -> "615"
      const streetPart = address.split(",")[0].trim();
      let unitPart: string | null = null;
      // Try explicit unit prefix first
      const unitPrefixMatch = streetPart.match(/(?:unit|apt|#)\s*(\S+)$/i);
      if (unitPrefixMatch) {
        unitPart = unitPrefixMatch[1];
      } else {
        // Bare trailing unit after street suffix
        const bareSuffixMatch = streetPart.match(
          /\b(?:st|street|rd|road|ave|avenue|dr|drive|ln|lane|pl|place|blvd|boulevard|ct|court|way|loop|pkwy|parkway|hwy|highway|cir|circle)\b\.?\s+([\dA-Z][\dA-Z-]*)$/i,
        );
        if (bareSuffixMatch) unitPart = bareSuffixMatch[1];
      }
      const unitClean = unitPart?.replace(/-/g, "");

      if (unitClean) {
        // OWNINFO has address1/address3 fields that may contain the property address with unit
        // Also check suffix field which may contain the unit identifier
        const filtered = owners.filter((o) => {
          const rec = o as Record<string, unknown>;
          const addr1 = String(rec.address1 || "").toUpperCase();
          const addr3 = String(rec.address3 || "").toUpperCase();
          const suffix = String(rec.suffix || "");
          const parid = String(rec.parid || "");

          // Match by address1/address3 containing the unit number
          if (addr1.includes(unitClean) || addr1.includes(unitPart || "")) return true;
          if (addr3.includes(unitClean) || addr3.includes(unitPart || "")) return true;
          // Match by suffix field
          if (suffix === unitClean || suffix === unitPart) return true;

          return false;
        });

        if (filtered.length >= 1 && filtered.length <= 2) {
          console.log(`[HonoluluTax] Matched ${filtered.length} owner(s) by unit "${unitClean}" from ${owners.length} building records`);
          owners = filtered;
        } else {
          console.log(`[HonoluluTax] Could not match unit "${unitClean}" in address/suffix fields, ${filtered.length} matches from ${owners.length} records`);
        }
      }
    }

    // If still multiple and we only have a land-level TMK, return empty
    // rather than showing wrong owners from other units
    if (owners.length > 2 && cleanTmk.length <= 9) {
      console.log(`[HonoluluTax] Land-level TMK ${tmk} returned ${owners.length} owners (condo building). Cannot determine specific unit.`);
      return [];
    }

    return owners;
  }

  /**
   * Search owners by name (partial match)
   */
  async searchOwnersByName(name: string, options?: { limit?: number; offset?: number }): Promise<HonoluluOwner[]> {
    const safeName = name.replace(/'/g, "''").toUpperCase();
    const where = `UPPER(owner) LIKE '%${safeName}%'`;

    const result = await this.query(this.ownallUrl, where, {
      resultRecordCount: options?.limit || 25,
      resultOffset: options?.offset,
      orderByFields: "owner ASC",
    });

    return (result.features || []).map((f) => this.normalizeAttributes(f.attributes) as HonoluluOwner);
  }

  // ── Parcel Lookup ───────────────────────────────────────────────────────

  /**
   * Get tax parcel data by TMK
   */
  async getTaxParcelByTMK(tmk: string): Promise<HonoluluParcel | null> {
    const cleanTmk = tmk.replace(/[-\s]/g, "");
    const where = `tmk='${cleanTmk}'`;

    const result = await this.query(this.taxParcelsUrl, where, {
      resultRecordCount: 1,
    });

    if (!result.features?.length) return null;
    return this.normalizeAttributes(result.features[0].attributes) as HonoluluParcel;
  }

  /**
   * Get all parcel data by TMK (includes regulatory + tax parcels)
   */
  async getAllParcelByTMK(tmk: string): Promise<HonoluluParcel | null> {
    const cleanTmk = tmk.replace(/[-\s]/g, "");
    const where = `tmk='${cleanTmk}'`;

    const result = await this.query(this.allParcelsUrl, where, {
      resultRecordCount: 1,
    });

    if (!result.features?.length) return null;
    return this.normalizeAttributes(result.features[0].attributes) as HonoluluParcel;
  }

  // ── Combined Lookup ─────────────────────────────────────────────────────

  /**
   * Get full tax record: owners + parcel data for a TMK
   */
  async getTaxRecord(tmk: string): Promise<HonoluluTaxRecord> {
    const cleanTmk = tmk.replace(/[-\s]/g, "");

    const [owners, parcel] = await Promise.allSettled([
      this.getOwnersByTMK(cleanTmk),
      this.getTaxParcelByTMK(cleanTmk),
    ]);

    return {
      tmk: cleanTmk,
      owners: owners.status === "fulfilled" ? owners.value : [],
      parcel: parcel.status === "fulfilled" ? (parcel.value ?? undefined) : undefined,
    };
  }

  /**
   * Search parcels by address fragment (if supported by the tax parcel layer)
   */
  async searchParcelsByAddress(
    address: string,
    options?: { limit?: number; offset?: number },
  ): Promise<HonoluluParcel[]> {
    const safeAddr = address.replace(/'/g, "''").toUpperCase();
    // Try common address field names used in Honolulu parcel data
    const where = `UPPER(fulladdr) LIKE '%${safeAddr}%' OR UPPER(situsaddr) LIKE '%${safeAddr}%' OR UPPER(address) LIKE '%${safeAddr}%'`;

    try {
      const result = await this.query(this.taxParcelsUrl, where, {
        resultRecordCount: options?.limit || 25,
        resultOffset: options?.offset,
        orderByFields: "tmk ASC",
      });

      return (result.features || []).map((f) => this.normalizeAttributes(f.attributes) as HonoluluParcel);
    } catch {
      // If address field doesn't exist, fall back to the all-parcels layer
      const altWhere = `UPPER(fulladdr) LIKE '%${safeAddr}%' OR UPPER(situsaddr) LIKE '%${safeAddr}%' OR UPPER(address) LIKE '%${safeAddr}%'`;
      try {
        const result = await this.query(this.allParcelsUrl, altWhere, {
          resultRecordCount: options?.limit || 25,
          resultOffset: options?.offset,
          orderByFields: "tmk ASC",
        });

        return (result.features || []).map((f) => this.normalizeAttributes(f.attributes) as HonoluluParcel);
      } catch {
        return [];
      }
    }
  }

  // ── Utility ─────────────────────────────────────────────────────────────

  /**
   * Normalize ArcGIS attribute keys to lowercase for consistent access.
   * ArcGIS field names can be mixed case (TMK, Tmk, tmk, PARID, etc.)
   */
  private normalizeAttributes(attrs: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attrs)) {
      result[key.toLowerCase()] = value;
    }
    // Map new OWNINFO fields to legacy field names for backwards compatibility
    // OWNINFO uses taxbillown/taxbillown1/taxbillown2 instead of owner
    if (!result.owner && (result.taxbillown || result.taxbillown1)) {
      result.owner = result.taxbillown || result.taxbillown1;
    }
    if (!result.owntype && (result.owntype1 || result.owntype_desc)) {
      result.owntype = result.owntype_desc || result.owntype1;
    }
    return result;
  }

  /**
   * Test connectivity to the ArcGIS endpoints.
   * Returns which endpoints are accessible.
   */
  async testConnection(): Promise<{
    ownall: { success: boolean; message: string; sampleFields?: string[] };
    taxParcels: { success: boolean; message: string; sampleFields?: string[] };
    allParcels: { success: boolean; message: string; sampleFields?: string[] };
  }> {
    const testEndpoint = async (
      url: string,
      name: string,
    ): Promise<{ success: boolean; message: string; sampleFields?: string[] }> => {
      try {
        const result = await this.query(url, "1=1", {
          resultRecordCount: 1,
        });
        const fields = result.features?.[0] ? Object.keys(result.features[0].attributes) : [];
        return {
          success: true,
          message: `${name}: Connected (${result.features?.length || 0} sample records)`,
          sampleFields: fields,
        };
      } catch (error) {
        return {
          success: false,
          message: `${name}: ${error instanceof Error ? error.message : "Connection failed"}`,
        };
      }
    };

    const [ownall, taxParcels, allParcels] = await Promise.allSettled([
      testEndpoint(this.ownallUrl, "OWNALL Table"),
      testEndpoint(this.taxParcelsUrl, "Tax Parcels"),
      testEndpoint(this.allParcelsUrl, "All Parcels"),
    ]);

    return {
      ownall: ownall.status === "fulfilled" ? ownall.value : { success: false, message: "Test failed" },
      taxParcels: taxParcels.status === "fulfilled" ? taxParcels.value : { success: false, message: "Test failed" },
      allParcels: allParcels.status === "fulfilled" ? allParcels.value : { success: false, message: "Test failed" },
    };
  }
}

/**
 * Create a Honolulu Tax client using environment config (or defaults).
 * No API key needed — this is public open data.
 */
export function createHonoluluTaxClient(): HonoluluTaxClient {
  return new HonoluluTaxClient();
}
