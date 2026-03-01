/**
 * Hawaii Hazards & Environmental GIS Client
 *
 * Provides spatial queries against State of Hawaii public ArcGIS layers
 * to determine whether a property (lat/lng) falls within various hazard,
 * environmental, or regulatory zones.
 *
 * Data sources (all public, no API key required):
 *   - Hazards MapServer:       Tsunami, lava flow, flood, fire risk
 *   - Infrastructure MapServer: OSDS / cesspool priority areas
 *   - ParcelsZoning MapServer:  DHHL lands, SMA, state land use districts
 *   - Climate MapServer:        Sea level rise exposure areas
 *
 * Portal: https://geoportal.hawaii.gov/
 */

// ── Service URLs ─────────────────────────────────────────────────────────────

const HAZARDS = "https://geodata.hawaii.gov/arcgis/rest/services/Hazards/MapServer";
const INFRASTRUCTURE = "https://geodata.hawaii.gov/arcgis/rest/services/Infrastructure/MapServer";
const PARCELS_ZONING = "https://geodata.hawaii.gov/arcgis/rest/services/ParcelsZoning/MapServer";

// ── Layer IDs within each MapServer ──────────────────────────────────────────

const LAYERS = {
  // Hazards MapServer
  tsunamiAllZones: 11,
  tsunamiExtreme: 12,
  lavaFlowZones: 3,
  floodCoastalSLR_Statewide: 15,
  floodCoastalSLR_Oahu: 17,
  floodCoastalSLR_Maui: 20,
  floodCoastalSLR_Hawaii: 21,
  floodCoastalSLR_Kauai: 16,
  femaFloodHawaiiCounty: 14,

  // Infrastructure MapServer
  cesspoolPriority: 34,  // HCPT Priority Census Block Groups
  osdsKauai: 25,
  osdsHawaii: 26,

  // ParcelsZoning MapServer
  dhhlLands: 8,
  sma: 21,
  stateLandUse: 20,
} as const;

// ── Response types ───────────────────────────────────────────────────────────

export interface HazardZoneResult {
  found: boolean;
  layerName: string;
  attributes: Record<string, unknown>;
}

export interface PropertyHazardProfile {
  /** Coordinates queried */
  lat: number;
  lng: number;

  /** Tsunami evacuation zone info */
  tsunami: HazardZoneResult | null;

  /** Lava flow hazard zone (Big Island only) */
  lavaFlow: HazardZoneResult | null;

  /** Sea level rise / coastal flood zone with 3.2ft SLR */
  seaLevelRise: HazardZoneResult | null;

  /** DHHL (Department of Hawaiian Home Lands) parcel */
  dhhl: HazardZoneResult | null;

  /** Special Management Area (coastal zone) */
  sma: HazardZoneResult | null;

  /** State Land Use District */
  stateLandUse: HazardZoneResult | null;

  /** Cesspool / OSDS priority area */
  cesspoolPriority: HazardZoneResult | null;
}

interface ArcGISQueryResponse {
  features?: Array<{
    attributes: Record<string, unknown>;
    geometry?: unknown;
  }>;
  error?: {
    code: number;
    message: string;
    details?: string[];
  };
}

// ── Client ───────────────────────────────────────────────────────────────────

export class HawaiiHazardsClient {
  /**
   * Run a spatial point-in-polygon query against an ArcGIS MapServer layer.
   */
  private async spatialQuery(
    serviceUrl: string,
    layerId: number,
    lat: number,
    lng: number
  ): Promise<HazardZoneResult | null> {
    const url = new URL(`${serviceUrl}/${layerId}/query`);
    url.searchParams.set("geometry", `${lng},${lat}`);
    url.searchParams.set("geometryType", "esriGeometryPoint");
    url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    url.searchParams.set("inSR", "4326");
    url.searchParams.set("outSR", "4326");
    url.searchParams.set("outFields", "*");
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("f", "json");

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return null;

      const data: ArcGISQueryResponse = await response.json();
      if (data.error || !data.features?.length) return null;

      // Normalize attribute keys to lowercase
      const attrs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data.features[0].attributes)) {
        attrs[key.toLowerCase()] = value;
      }

      return {
        found: true,
        layerName: `${serviceUrl}/${layerId}`,
        attributes: attrs,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the full hazard/environmental profile for a property by lat/lng.
   * Runs all spatial queries in parallel for performance.
   */
  async getPropertyHazardProfile(
    lat: number,
    lng: number
  ): Promise<PropertyHazardProfile> {
    const [
      tsunami,
      lavaFlow,
      seaLevelRise,
      dhhl,
      sma,
      stateLandUse,
      cesspoolPriority,
    ] = await Promise.allSettled([
      this.spatialQuery(HAZARDS, LAYERS.tsunamiAllZones, lat, lng),
      this.spatialQuery(HAZARDS, LAYERS.lavaFlowZones, lat, lng),
      this.spatialQuery(HAZARDS, LAYERS.floodCoastalSLR_Statewide, lat, lng),
      this.spatialQuery(PARCELS_ZONING, LAYERS.dhhlLands, lat, lng),
      this.spatialQuery(PARCELS_ZONING, LAYERS.sma, lat, lng),
      this.spatialQuery(PARCELS_ZONING, LAYERS.stateLandUse, lat, lng),
      this.spatialQuery(INFRASTRUCTURE, LAYERS.cesspoolPriority, lat, lng),
    ]);

    return {
      lat,
      lng,
      tsunami: tsunami.status === "fulfilled" ? tsunami.value : null,
      lavaFlow: lavaFlow.status === "fulfilled" ? lavaFlow.value : null,
      seaLevelRise: seaLevelRise.status === "fulfilled" ? seaLevelRise.value : null,
      dhhl: dhhl.status === "fulfilled" ? dhhl.value : null,
      sma: sma.status === "fulfilled" ? sma.value : null,
      stateLandUse: stateLandUse.status === "fulfilled" ? stateLandUse.value : null,
      cesspoolPriority: cesspoolPriority.status === "fulfilled" ? cesspoolPriority.value : null,
    };
  }

  /**
   * Test connectivity to each service.
   */
  async testConnection(): Promise<Record<string, { success: boolean; message: string }>> {
    const endpoints = [
      { name: "Hazards MapServer", url: HAZARDS },
      { name: "Infrastructure MapServer", url: INFRASTRUCTURE },
      { name: "ParcelsZoning MapServer", url: PARCELS_ZONING },
    ];

    const results: Record<string, { success: boolean; message: string }> = {};

    await Promise.allSettled(
      endpoints.map(async (ep) => {
        try {
          const res = await fetch(`${ep.url}?f=json`, {
            headers: { Accept: "application/json" },
          });
          results[ep.name] = res.ok
            ? { success: true, message: `${ep.name}: Connected` }
            : { success: false, message: `${ep.name}: HTTP ${res.status}` };
        } catch (error) {
          results[ep.name] = {
            success: false,
            message: `${ep.name}: ${error instanceof Error ? error.message : "Failed"}`,
          };
        }
      })
    );

    return results;
  }
}

/**
 * Create a Hawaii Hazards client.
 * No API key needed — public open data from the State of Hawaii.
 */
export function createHawaiiHazardsClient(): HawaiiHazardsClient {
  return new HawaiiHazardsClient();
}
