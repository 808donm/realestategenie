"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { APIProvider, Map as GoogleMap, useMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { HAZARD_LAYERS, HAZARD_GROUPS, getLayersForMarket, isHawaiiViewport, type HazardLayer } from "./hazard-layer-config";

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

// Default center: Honolulu
const DEFAULT_CENTER = { lat: 21.3069, lng: -157.8583 };
const DEFAULT_ZOOM = 12;

export default function HazardMapClient() {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [searchInput, setSearchInput] = useState("");
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [visibleLayers, setVisibleLayers] = useState<HazardLayer[]>(() =>
    getLayersForMarket(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
  );
  const [propertyPin, setPropertyPin] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Parse URL params for deep linking from Property Detail Modal
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const lat = params.get("lat");
    const lng = params.get("lng");
    const layers = params.get("layers");
    const addr = params.get("address");

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      setCenter({ lat: latNum, lng: lngNum });
      setZoom(15);
      setPropertyPin({ lat: latNum, lng: lngNum, address: addr || undefined });
      setVisibleLayers(getLayersForMarket(latNum, lngNum));

      // Activate specified layers or defaults for the market
      if (layers) {
        setActiveLayers(new Set(layers.split(",")));
      }
    }
  }, []);

  const mapRef = useRef<google.maps.Map | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) return;
    setLoading(true);
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchInput)}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(geoUrl);
      const data = await res.json();
      if (data.results?.[0]?.geometry?.location) {
        const { lat, lng } = data.results[0].geometry.location;
        setCenter({ lat, lng });
        setZoom(15);
        setVisibleLayers(getLayersForMarket(lat, lng));
        setPropertyPin({ lat, lng, address: data.results[0].formatted_address });
        // Pan the map to the new location
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }
      }
    } catch {}
    setLoading(false);
  }, [searchInput]);

  const toggleLayer = (key: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group visible layers by category
  const groupedLayers: Record<string, HazardLayer[]> = {};
  for (const layer of visibleLayers) {
    if (!groupedLayers[layer.group]) groupedLayers[layer.group] = [];
    groupedLayers[layer.group].push(layer);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 280,
          minWidth: 280,
          borderRight: "1px solid #e5e7eb",
          overflowY: "auto",
          padding: 16,
          backgroundColor: "#f9fafb",
        }}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>Hazard Map</h2>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
            Address or ZIP
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter address or ZIP..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#2563eb",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go
            </button>
          </div>
        </div>

        {/* Layer Toggles */}
        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Hazard Layers</div>
        {Object.entries(groupedLayers).map(([group, layers]) => {
          const groupInfo = HAZARD_GROUPS[group];
          return (
            <div key={group} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {groupInfo?.label || group}
              </div>
              {layers.map((layer) => {
                const isActive = activeLayers.has(layer.key);
                return (
                  <div
                    key={layer.key}
                    onClick={() => toggleLayer(layer.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 8px",
                      marginBottom: 2,
                      borderRadius: 6,
                      cursor: "pointer",
                      backgroundColor: isActive ? `${layer.fillColor}15` : "transparent",
                      border: `1px solid ${isActive ? layer.fillColor : "#e5e7eb"}`,
                      opacity: isActive ? 1 : 0.6,
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        backgroundColor: isActive ? layer.fillColor : "transparent",
                        border: `2px solid ${layer.strokeColor}`,
                        opacity: isActive ? layer.fillOpacity * 3 : 0.4,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{layer.label}</span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Legend */}
        <div style={{ marginTop: 16, padding: 12, backgroundColor: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Legend</div>
          <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.6 }}>
            <div><span style={{ display: "inline-block", width: 10, height: 10, backgroundColor: "#2563eb", opacity: 0.4, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> FEMA Flood Zones (AE, VE, X)</div>
            <div><span style={{ display: "inline-block", width: 10, height: 10, backgroundColor: "#0891b2", opacity: 0.5, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> Tsunami Evacuation Zones</div>
            <div><span style={{ display: "inline-block", width: 10, height: 10, backgroundColor: "#14b8a6", opacity: 0.5, borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} /> Sea Level Rise Exposure</div>
          </div>
          <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 8 }}>
            Data: FEMA, Hawaii State GIS. Boundaries are approximate.
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        {!GOOGLE_MAPS_KEY && (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            Google Maps API key not configured
          </div>
        )}
        {GOOGLE_MAPS_KEY && (
          <APIProvider apiKey={GOOGLE_MAPS_KEY}>
            <GoogleMap
              defaultCenter={center}
              defaultZoom={zoom}
              mapId={GOOGLE_MAPS_ID}
              style={{ width: "100%", height: "100%" }}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapTypeControl
              fullscreenControl
            >
              <MapRefCapture mapRef={mapRef} />
              <HazardOverlays activeLayers={activeLayers} center={center} />
              {propertyPin && (
                <AdvancedMarker position={propertyPin}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: "#dc2626",
                      border: "3px solid #fff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    }}
                  />
                </AdvancedMarker>
              )}
            </GoogleMap>
          </APIProvider>
        )}
      </div>
    </div>
  );
}

// ── Map Ref Capture ──
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<google.maps.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    if (map) mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

// ── Hazard Overlay Manager ──
// Fetches and renders GeoJSON hazard zone polygons on the map

function HazardOverlays({ activeLayers, center }: { activeLayers: Set<string>; center: { lat: number; lng: number } }) {
  const map = useMap();
  const dataLayersRef = useRef<Map<string, google.maps.Data>>(new Map());
  const cacheRef = useRef<Map<string, any>>(new Map());
  const fetchingRef = useRef<Set<string>>(new Set());
  const lastBboxRef = useRef<string>("");

  // Fetch and render layers when active layers or map viewport changes
  useEffect(() => {
    if (!map) return;

    const handleIdle = () => {
      const bounds = map.getBounds();
      if (!bounds) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const bbox = `${sw.lng().toFixed(3)},${sw.lat().toFixed(3)},${ne.lng().toFixed(3)},${ne.lat().toFixed(3)}`;

      // Skip if bbox hasn't changed significantly
      if (bbox === lastBboxRef.current) return;
      lastBboxRef.current = bbox;

      // Add new layers
      for (const key of activeLayers) {
        const layerConfig = HAZARD_LAYERS.find((l) => l.key === key);
        if (!layerConfig) continue;

        const cacheKey = `${key}:${bbox}`;
        if (cacheRef.current.has(cacheKey)) {
          renderLayer(key, cacheRef.current.get(cacheKey), layerConfig);
          continue;
        }

        if (fetchingRef.current.has(cacheKey)) continue;
        fetchingRef.current.add(cacheKey);

        fetch(`/api/seller-map/gis-overlay?overlay=${layerConfig.overlay}&bbox=${bbox}&limit=500`)
          .then((r) => r.ok ? r.json() : null)
          .then((geojson) => {
            fetchingRef.current.delete(cacheKey);
            if (!geojson?.features?.length) return;
            cacheRef.current.set(cacheKey, geojson);
            renderLayer(key, geojson, layerConfig);
          })
          .catch(() => fetchingRef.current.delete(cacheKey));
      }
    };

    const renderLayer = (key: string, geojson: any, config: HazardLayer) => {
      if (!map) return;

      // Remove existing layer if any
      const existing = dataLayersRef.current.get(key);
      if (existing) {
        existing.setMap(null);
        dataLayersRef.current.delete(key);
      }

      const dataLayer = new google.maps.Data({ map });
      try {
        dataLayer.addGeoJson(geojson);
      } catch {
        dataLayer.setMap(null);
        return;
      }

      dataLayer.setStyle((feature) => {
        // Differentiate flood zone types by opacity
        const fldZone = feature.getProperty("FLD_ZONE") as string;
        let fillOpacity = config.fillOpacity;
        let fillColor = config.fillColor;

        if (fldZone) {
          // High-risk zones (A, V) get stronger opacity
          if (fldZone.startsWith("A") || fldZone.startsWith("V")) {
            fillOpacity = Math.min(config.fillOpacity * 1.5, 0.35);
          }
          // Minimal risk (X) gets lighter
          if (fldZone === "X" || fldZone === "AREA NOT INCLUDED") {
            fillOpacity = config.fillOpacity * 0.3;
            fillColor = "#93c5fd";
          }
        }

        return {
          fillColor,
          fillOpacity,
          strokeColor: config.strokeColor,
          strokeWeight: config.strokeWeight,
          strokeOpacity: 0.7,
        };
      });

      dataLayersRef.current.set(key, dataLayer);
    };

    // Initial load
    handleIdle();

    // Re-fetch on viewport change (debounced via idle event)
    const listener = map.addListener("idle", handleIdle);

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, activeLayers]);

  // Remove layers that are no longer active
  useEffect(() => {
    for (const [key, layer] of dataLayersRef.current) {
      if (!activeLayers.has(key)) {
        layer.setMap(null);
        dataLayersRef.current.delete(key);
      }
    }
  }, [activeLayers]);

  // Cleanup all layers on unmount
  useEffect(() => {
    return () => {
      for (const [, layer] of dataLayersRef.current) {
        layer.setMap(null);
      }
      dataLayersRef.current.clear();
    };
  }, []);

  return null;
}
