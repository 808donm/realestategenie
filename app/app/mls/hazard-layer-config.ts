/**
 * Hazard Map Layer Configuration
 *
 * Defines all available hazard overlay layers with their ArcGIS sources,
 * display colors, and market scope (Hawaii vs national).
 */

export interface HazardLayer {
  key: string;
  label: string;
  group: "flood" | "tsunami" | "slr" | "fire" | "lava";
  /** Overlay key matching OVERLAY_CONFIGS in gis-overlay/route.ts */
  overlay: string;
  /** Market scope: "hawaii" = Hawaii only, "national" = mainland US, "all" = everywhere */
  market: "hawaii" | "national" | "all";
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWeight: number;
  /** Whether this layer is enabled by default */
  defaultOn?: boolean;
}

/** All available hazard layers, grouped by category */
export const HAZARD_LAYERS: HazardLayer[] = [
  // ── Flood Zones ──
  {
    key: "flood-zones",
    label: "FEMA Flood Zones (DFIRM)",
    group: "flood",
    overlay: "flood-zones",
    market: "hawaii",
    fillColor: "#1e40af",
    fillOpacity: 0.25,
    strokeColor: "#1e3a8a",
    strokeWeight: 2.5,
  },
  {
    key: "flood-zones-oahu",
    label: "Oahu Flood Zones",
    group: "flood",
    overlay: "flood-zones-oahu",
    market: "hawaii",
    fillColor: "#3b82f6",
    fillOpacity: 0.20,
    strokeColor: "#2563eb",
    strokeWeight: 2,
  },
  {
    key: "fema-nfhl",
    label: "FEMA National Flood Hazard",
    group: "flood",
    overlay: "fema-nfhl",
    market: "national",
    fillColor: "#1e40af",
    fillOpacity: 0.25,
    strokeColor: "#1e3a8a",
    strokeWeight: 2.5,
  },

  // ── Tsunami Zones ──
  {
    key: "tsunami-zones",
    label: "Tsunami Evacuation Zones",
    group: "tsunami",
    overlay: "tsunami-zones",
    market: "hawaii",
    fillColor: "#0e7490",
    fillOpacity: 0.28,
    strokeColor: "#164e63",
    strokeWeight: 2.5,
  },
  {
    key: "tsunami-all",
    label: "All Tsunami Zones",
    group: "tsunami",
    overlay: "tsunami-all",
    market: "hawaii",
    fillColor: "#0891b2",
    fillOpacity: 0.20,
    strokeColor: "#0e7490",
    strokeWeight: 2,
  },

  // ── Sea Level Rise ──
  {
    key: "slr-05ft",
    label: "Sea Level Rise 0.5ft",
    group: "slr",
    overlay: "slr-exposure-05",
    market: "hawaii",
    fillColor: "#5eead4",
    fillOpacity: 0.22,
    strokeColor: "#0d9488",
    strokeWeight: 1.5,
  },
  {
    key: "slr-11ft",
    label: "Sea Level Rise 1.1ft",
    group: "slr",
    overlay: "slr-exposure-11",
    market: "hawaii",
    fillColor: "#2dd4bf",
    fillOpacity: 0.25,
    strokeColor: "#0f766e",
    strokeWeight: 2,
  },
  {
    key: "slr-20ft",
    label: "Sea Level Rise 2.0ft",
    group: "slr",
    overlay: "slr-exposure-20",
    market: "hawaii",
    fillColor: "#14b8a6",
    fillOpacity: 0.28,
    strokeColor: "#115e59",
    strokeWeight: 2,
  },
  {
    key: "slr-32ft",
    label: "Sea Level Rise 3.2ft",
    group: "slr",
    overlay: "slr-32ft",
    market: "hawaii",
    fillColor: "#0d9488",
    fillOpacity: 0.30,
    strokeColor: "#134e4a",
    strokeWeight: 2.5,
  },
];

/** Group labels for the layer toggle panel */
export const HAZARD_GROUPS: Record<string, { label: string; icon: string }> = {
  flood: { label: "Flood Zones", icon: "droplets" },
  tsunami: { label: "Tsunami Zones", icon: "waves" },
  slr: { label: "Sea Level Rise", icon: "arrow-up-from-line" },
  fire: { label: "Fire Risk", icon: "flame" },
  lava: { label: "Lava Flow", icon: "mountain" },
};

/** Check if coordinates are in Hawaii */
export function isHawaiiViewport(lat: number, lng: number): boolean {
  return lat >= 18.5 && lat <= 22.5 && lng >= -161 && lng <= -154;
}

/** Get layers visible for the current market */
export function getLayersForMarket(lat: number, lng: number): HazardLayer[] {
  const isHawaii = isHawaiiViewport(lat, lng);
  return HAZARD_LAYERS.filter(
    (l) => l.market === "all" || (isHawaii && l.market === "hawaii") || (!isHawaii && l.market === "national"),
  );
}
