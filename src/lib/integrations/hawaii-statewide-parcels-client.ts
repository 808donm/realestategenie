/**
 * Hawaii Statewide Parcels ArcGIS Client
 *
 * Provides access to TMK parcel data for ALL Hawaii counties via the
 * State of Hawaii's public ArcGIS MapServer endpoint.
 *
 * Covers: Hawaii County, Maui County, Kauai County, City & County of Honolulu
 *
 * Data source:
 *   - Statewide TMKs (Layer 25): Merged TMK parcels from all counties
 *   - Projected to UTM Zone 4, NAD 83 HARN; queries return WGS84 (outSR=4326)
 *
 * Portal:  https://geoportal.hawaii.gov/datasets/parcels-hawaii-statewide
 * Service: https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer
 * Layer:   25 (Statewide TMKs)
 *
 * Available fields:
 *   tmk, tmk_txt, county, division, island, zone, section, plat, plat1,
 *   parcel, parcel1, cty_tmk, gisacres, qpub_link,
 *   st_area(shape), st_perimeter(shape)
 *
 * No API key required — this is public open data.
 */

const DEFAULT_STATEWIDE_URL =
  "https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer/25";

// ── Response types ──────────────────────────────────────────────────────────

export interface StateParcel {
  tmk?: string;
  tmk_txt?: string;
  county?: string;
  division?: string;
  island?: string;
  zone?: string;
  section?: string;
  plat?: string;
  plat1?: string;
  parcel?: string;
  parcel1?: string;
  cty_tmk?: string;
  gisacres?: number;
  qpub_link?: string;
  st_area?: number;
  st_perimeter?: number;
  /** Additional fields the layer may include */
  [key: string]: unknown;
}

export interface StateParcelGeometry {
  rings?: number[][][];
  spatialReference?: { wkid: number; latestWkid: number };
}

export interface StateParcelFeature {
  attributes: StateParcel;
  geometry?: StateParcelGeometry;
}

interface ArcGISQueryResponse {
  features?: Array<{
    attributes: Record<string, unknown>;
    geometry?: StateParcelGeometry;
  }>;
  exceededTransferLimit?: boolean;
  error?: {
    code: number;
    message: string;
    details?: string[];
  };
}

// ── Client ──────────────────────────────────────────────────────────────────

export class HawaiiStatewideParcelClient {
  private serviceUrl: string;

  constructor(config?: { serviceUrl?: string }) {
    this.serviceUrl =
      config?.serviceUrl ||
      process.env.HAWAII_STATEWIDE_PARCELS_URL ||
      DEFAULT_STATEWIDE_URL;
  }

  /**
   * Query the ArcGIS MapServer layer
   */
  private async query(
    where: string,
    options?: {
      outFields?: string;
      resultRecordCount?: number;
      resultOffset?: number;
      orderByFields?: string;
      returnGeometry?: boolean;
      outSR?: number;
    }
  ): Promise<ArcGISQueryResponse> {
    const url = new URL(`${this.serviceUrl}/query`);
    url.searchParams.set("where", where);
    url.searchParams.set("outFields", options?.outFields || "*");
    url.searchParams.set("f", "json");
    url.searchParams.set("outSR", String(options?.outSR ?? 4326));
    url.searchParams.set(
      "returnGeometry",
      String(options?.returnGeometry ?? false)
    );

    if (options?.resultRecordCount) {
      url.searchParams.set(
        "resultRecordCount",
        String(options.resultRecordCount)
      );
    }
    if (options?.resultOffset) {
      url.searchParams.set("resultOffset", String(options.resultOffset));
    }
    if (options?.orderByFields) {
      url.searchParams.set("orderByFields", options.orderByFields);
    }

    console.log(`[HawaiiParcels] ArcGIS query: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[HawaiiParcels] Query FAILED (${response.status}):`,
        errorText
      );
      throw new Error(
        `ArcGIS query error: ${response.status} - ${errorText}`
      );
    }

    const data: ArcGISQueryResponse = await response.json();

    if (data.error) {
      console.error(`[HawaiiParcels] ArcGIS error:`, data.error);
      throw new Error(
        `ArcGIS error ${data.error.code}: ${data.error.message}`
      );
    }

    return data;
  }

  // ── TMK Lookup ──────────────────────────────────────────────────────────

  /**
   * Get a parcel by its TMK number.
   * TMK can be in any format — dashes, spaces, and dots are stripped.
   */
  async getParcelByTMK(tmk: string): Promise<StateParcel | null> {
    const cleanTmk = tmk.replace(/[-\s.]/g, "");

    // Try tmk field first, then cty_tmk
    const where =
      cleanTmk.length >= 9
        ? `tmk='${cleanTmk}' OR cty_tmk='${cleanTmk}'`
        : `tmk LIKE '%${cleanTmk}%' OR cty_tmk LIKE '%${cleanTmk}%'`;

    const result = await this.query(where, { resultRecordCount: 1 });

    if (!result.features?.length) return null;
    return this.normalizeAttributes(
      result.features[0].attributes
    ) as StateParcel;
  }

  /**
   * Get a parcel with geometry (polygon boundaries) by TMK
   */
  async getParcelWithGeometry(
    tmk: string
  ): Promise<StateParcelFeature | null> {
    const cleanTmk = tmk.replace(/[-\s.]/g, "");
    const where =
      cleanTmk.length >= 9
        ? `tmk='${cleanTmk}' OR cty_tmk='${cleanTmk}'`
        : `tmk LIKE '%${cleanTmk}%' OR cty_tmk LIKE '%${cleanTmk}%'`;

    const result = await this.query(where, {
      resultRecordCount: 1,
      returnGeometry: true,
    });

    if (!result.features?.length) return null;
    return {
      attributes: this.normalizeAttributes(
        result.features[0].attributes
      ) as StateParcel,
      geometry: result.features[0].geometry,
    };
  }

  // ── County / Island Lookup ────────────────────────────────────────────

  /**
   * Get parcels by county name.
   * County values: "HAWAII", "MAUI", "KAUAI", "HONOLULU"
   */
  async getParcelsByCounty(
    county: string,
    options?: { limit?: number; offset?: number }
  ): Promise<StateParcel[]> {
    const safeCounty = county.replace(/'/g, "''").toUpperCase();
    const where = `UPPER(county)='${safeCounty}'`;

    const result = await this.query(where, {
      resultRecordCount: options?.limit || 25,
      resultOffset: options?.offset,
      orderByFields: "tmk ASC",
    });

    return (result.features || []).map(
      (f) => this.normalizeAttributes(f.attributes) as StateParcel
    );
  }

  /**
   * Get parcels by island name.
   */
  async getParcelsByIsland(
    island: string,
    options?: { limit?: number; offset?: number }
  ): Promise<StateParcel[]> {
    const safeIsland = island.replace(/'/g, "''").toUpperCase();
    const where = `UPPER(island)='${safeIsland}'`;

    const result = await this.query(where, {
      resultRecordCount: options?.limit || 25,
      resultOffset: options?.offset,
      orderByFields: "tmk ASC",
    });

    return (result.features || []).map(
      (f) => this.normalizeAttributes(f.attributes) as StateParcel
    );
  }

  // ── Zone / Section Lookup ─────────────────────────────────────────────

  /**
   * Get parcels by zone (TMK zone component)
   */
  async getParcelsByZone(
    zone: string,
    options?: { limit?: number; offset?: number; county?: string }
  ): Promise<StateParcel[]> {
    const safeZone = zone.replace(/'/g, "''");
    let where = `zone='${safeZone}'`;
    if (options?.county) {
      const safeCounty = options.county.replace(/'/g, "''").toUpperCase();
      where += ` AND UPPER(county)='${safeCounty}'`;
    }

    const result = await this.query(where, {
      resultRecordCount: options?.limit || 25,
      resultOffset: options?.offset,
      orderByFields: "tmk ASC",
    });

    return (result.features || []).map(
      (f) => this.normalizeAttributes(f.attributes) as StateParcel
    );
  }

  /**
   * Get parcels by section within a zone
   */
  async getParcelsBySection(
    zone: string,
    section: string,
    options?: { limit?: number; offset?: number; county?: string }
  ): Promise<StateParcel[]> {
    const safeZone = zone.replace(/'/g, "''");
    const safeSection = section.replace(/'/g, "''");
    let where = `zone='${safeZone}' AND section='${safeSection}'`;
    if (options?.county) {
      const safeCounty = options.county.replace(/'/g, "''").toUpperCase();
      where += ` AND UPPER(county)='${safeCounty}'`;
    }

    const result = await this.query(where, {
      resultRecordCount: options?.limit || 25,
      resultOffset: options?.offset,
      orderByFields: "tmk ASC",
    });

    return (result.features || []).map(
      (f) => this.normalizeAttributes(f.attributes) as StateParcel
    );
  }

  // ── Acreage Lookup ────────────────────────────────────────────────────

  /**
   * Find parcels by minimum acreage, optionally filtered by county/island.
   */
  async getParcelsByMinAcreage(
    minAcres: number,
    options?: {
      limit?: number;
      offset?: number;
      county?: string;
      island?: string;
    }
  ): Promise<StateParcel[]> {
    let where = `gisacres >= ${minAcres}`;
    if (options?.county) {
      const safeCounty = options.county.replace(/'/g, "''").toUpperCase();
      where += ` AND UPPER(county)='${safeCounty}'`;
    }
    if (options?.island) {
      const safeIsland = options.island.replace(/'/g, "''").toUpperCase();
      where += ` AND UPPER(island)='${safeIsland}'`;
    }

    const result = await this.query(where, {
      resultRecordCount: options?.limit || 25,
      resultOffset: options?.offset,
      orderByFields: "gisacres DESC",
    });

    return (result.features || []).map(
      (f) => this.normalizeAttributes(f.attributes) as StateParcel
    );
  }

  // ── Spatial Query ─────────────────────────────────────────────────────

  /**
   * Find parcels that intersect a point (lat/lng).
   * Uses ArcGIS geometry query to identify which parcel a coordinate falls in.
   */
  async getParcelAtPoint(
    lat: number,
    lng: number
  ): Promise<StateParcel | null> {
    const url = new URL(`${this.serviceUrl}/query`);
    url.searchParams.set("geometry", `${lng},${lat}`);
    url.searchParams.set("geometryType", "esriGeometryPoint");
    url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    url.searchParams.set("inSR", "4326");
    url.searchParams.set("outSR", "4326");
    url.searchParams.set("outFields", "*");
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("f", "json");

    console.log(`[HawaiiParcels] Spatial query: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`ArcGIS spatial query error: ${response.status}`);
    }

    const data: ArcGISQueryResponse = await response.json();

    if (data.error) {
      throw new Error(
        `ArcGIS error ${data.error.code}: ${data.error.message}`
      );
    }

    if (!data.features?.length) return null;
    return this.normalizeAttributes(
      data.features[0].attributes
    ) as StateParcel;
  }

  // ── Utility ───────────────────────────────────────────────────────────

  /**
   * Normalize ArcGIS attribute keys to lowercase for consistent access.
   * Also maps st_area(shape) and st_perimeter(shape) to cleaner keys.
   */
  private normalizeAttributes(
    attrs: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attrs)) {
      const lowerKey = key.toLowerCase();
      // Map st_area(shape) → st_area, st_perimeter(shape) → st_perimeter
      if (lowerKey === "st_area(shape)") {
        result["st_area"] = value;
      } else if (lowerKey === "st_perimeter(shape)") {
        result["st_perimeter"] = value;
      } else {
        result[lowerKey] = value;
      }
    }
    return result;
  }

  /**
   * Test connectivity to the statewide parcels endpoint.
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    sampleFields?: string[];
    sampleRecord?: StateParcel;
  }> {
    try {
      const result = await this.query("1=1", { resultRecordCount: 1 });
      const fields = result.features?.[0]
        ? Object.keys(result.features[0].attributes)
        : [];
      const sample = result.features?.[0]
        ? (this.normalizeAttributes(
            result.features[0].attributes
          ) as StateParcel)
        : undefined;

      return {
        success: true,
        message: `Statewide TMKs: Connected (${result.features?.length || 0} sample records)`,
        sampleFields: fields,
        sampleRecord: sample,
      };
    } catch (error) {
      return {
        success: false,
        message: `Statewide TMKs: ${error instanceof Error ? error.message : "Connection failed"}`,
      };
    }
  }
}

/**
 * Create a Hawaii Statewide Parcel client using environment config (or defaults).
 * No API key needed — this is public open data from the State of Hawaii.
 */
export function createHawaiiStatewideParcelClient(): HawaiiStatewideParcelClient {
  return new HawaiiStatewideParcelClient();
}
