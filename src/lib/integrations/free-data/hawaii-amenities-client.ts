/**
 * Hawaii Amenities Client - Points of interest from Hawaii State GIS
 *
 * Replaces unreliable OSM Overpass API for Hawaii properties.
 * Uses ArcGIS MapServer layers from geodata.hawaii.gov (free, no key required).
 *
 * Infrastructure layers: Hospitals, Schools, Golf Courses, Parks, Libraries
 * BusinessEconomy layers: Hotels
 */

import type { POIResult, POISearchResult } from "./osm-poi-client";

const INFRASTRUCTURE_URL = "https://geodata.hawaii.gov/arcgis/rest/services/Infrastructure/MapServer";
const BUSINESS_ECONOMY_URL = "https://geodata.hawaii.gov/arcgis/rest/services/BusinessEconomy/MapServer";

interface LayerConfig {
  baseUrl: string;
  layerId: number;
  category: string;
  nameField: string;
  latField?: string;
  lngField?: string;
}

const LAYERS: LayerConfig[] = [
  { baseUrl: INFRASTRUCTURE_URL, layerId: 5, category: "Hospital", nameField: "name" },
  { baseUrl: INFRASTRUCTURE_URL, layerId: 3, category: "Fire Station", nameField: "name" },
  { baseUrl: INFRASTRUCTURE_URL, layerId: 4, category: "Police Station", nameField: "name" },
  { baseUrl: INFRASTRUCTURE_URL, layerId: 7, category: "Public School", nameField: "name" },
  { baseUrl: INFRASTRUCTURE_URL, layerId: 8, category: "Private School", nameField: "name" },
  { baseUrl: INFRASTRUCTURE_URL, layerId: 14, category: "Golf Course", nameField: "name" },
  { baseUrl: INFRASTRUCTURE_URL, layerId: 30, category: "County Park", nameField: "name" },
  { baseUrl: INFRASTRUCTURE_URL, layerId: 16, category: "State Park", nameField: "name" },
  { baseUrl: INFRASTRUCTURE_URL, layerId: 28, category: "Library", nameField: "name" },
  { baseUrl: BUSINESS_ECONOMY_URL, layerId: 2, category: "Hotel", nameField: "name" },
];

/** Degrees per mile at typical Hawaii latitude (~21N) */
const DEG_LAT_PER_MILE = 1 / 69.0;
const DEG_LNG_PER_MILE = 1 / (69.0 * Math.cos((21 * Math.PI) / 180));

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildBbox(latitude: number, longitude: number, radiusMiles: number) {
  const dLat = radiusMiles * DEG_LAT_PER_MILE;
  const dLng = radiusMiles * DEG_LNG_PER_MILE;
  return {
    minLng: longitude - dLng,
    minLat: latitude - dLat,
    maxLng: longitude + dLng,
    maxLat: latitude + dLat,
  };
}

async function queryLayer(
  layer: LayerConfig,
  latitude: number,
  longitude: number,
  radiusMiles: number,
): Promise<POIResult[]> {
  const bbox = buildBbox(latitude, longitude, radiusMiles);
  const geometry = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;

  const url =
    `${layer.baseUrl}/${layer.layerId}/query` +
    `?geometry=${encodeURIComponent(geometry)}` +
    `&geometryType=esriGeometryEnvelope` +
    `&inSR=4326` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&outFields=*` +
    `&returnGeometry=true` +
    `&f=json` +
    `&resultRecordCount=10`;

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!response.ok) {
    console.warn(`[HI-GIS] Layer ${layer.layerId} (${layer.category}) returned ${response.status}`);
    return [];
  }

  const data = await response.json();
  const features = data.features || [];

  return features
    .map((f: any) => {
      const attrs = f.attributes || {};
      const geom = f.geometry || {};

      // Try common name field patterns (case-insensitive search through attributes)
      let name = "";
      for (const key of Object.keys(attrs)) {
        const lower = key.toLowerCase();
        if (lower === "name" || lower === "facility" || lower === "facname" || lower === "park_name") {
          name = attrs[key];
          if (name) break;
        }
      }
      if (!name) {
        // Fallback: try any field containing "name"
        for (const key of Object.keys(attrs)) {
          if (key.toLowerCase().includes("name") && attrs[key] && typeof attrs[key] === "string") {
            name = attrs[key];
            break;
          }
        }
      }
      if (!name) return null;

      // Geometry: point (x,y) or centroid from polygon rings
      let poiLat: number | undefined;
      let poiLng: number | undefined;
      if (geom.y != null && geom.x != null) {
        poiLat = geom.y;
        poiLng = geom.x;
      } else if (geom.rings) {
        // Approximate centroid of polygon
        let sumX = 0,
          sumY = 0,
          count = 0;
        for (const ring of geom.rings) {
          for (const pt of ring) {
            sumX += pt[0];
            sumY += pt[1];
            count++;
          }
        }
        if (count > 0) {
          poiLng = sumX / count;
          poiLat = sumY / count;
        }
      }

      const distanceMiles =
        poiLat != null && poiLng != null
          ? Math.round(haversineDistance(latitude, longitude, poiLat, poiLng) * 100) / 100
          : undefined;

      return {
        name,
        category: layer.category,
        latitude: poiLat,
        longitude: poiLng,
        distanceMiles,
      } as POIResult;
    })
    .filter(Boolean) as POIResult[];
}

/**
 * Search for amenities near a Hawaii property using State GIS data.
 * Queries multiple infrastructure layers in parallel.
 */
export async function searchHawaiiAmenities(
  latitude: number,
  longitude: number,
  radiusMiles: number = 2,
  maxResults: number = 30,
): Promise<POISearchResult> {
  try {
    console.log(`[HI-GIS] Searching amenities: lat=${latitude}, lng=${longitude}, radius=${radiusMiles}mi`);

    const results = await Promise.allSettled(LAYERS.map((layer) => queryLayer(layer, latitude, longitude, radiusMiles)));

    const allPois: POIResult[] = [];
    const categorySet = new Set<string>();

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        for (const poi of result.value) {
          allPois.push(poi);
          categorySet.add(poi.category);
        }
      } else {
        console.warn(`[HI-GIS] Layer ${LAYERS[i].category} failed: ${result.reason?.message || result.reason}`);
      }
    }

    // Sort by distance and limit
    allPois.sort((a, b) => (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99));
    const pois = allPois.slice(0, maxResults);

    console.log(`[HI-GIS] Found ${allPois.length} amenities across ${categorySet.size} categories, returning ${pois.length}`);

    return {
      pois,
      totalCount: pois.length,
      categories: Array.from(categorySet).sort(),
    };
  } catch (err) {
    console.error("[HI-GIS] Amenities search failed:", err);
    return { pois: [], totalCount: 0, categories: [] };
  }
}
