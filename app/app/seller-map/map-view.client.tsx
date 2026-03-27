"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import type { ScoredProperty } from "@/lib/scoring/seller-motivation-score";
import { getSellerColor } from "@/lib/scoring/seller-motivation-score";
import { PropertyCard } from "./property-card.client";

type Props = {
  properties: ScoredProperty[];
  selectedProperty: ScoredProperty | null;
  onSelectProperty: (p: ScoredProperty | null) => void;
  onBoundsChange: (bounds: { lat: number; lng: number; radius: number }) => void;
  showHeatMap: boolean;
  showTMK: boolean;
  tmkGeojson: GeoJSON.FeatureCollection | null;
  showZipBoundaries: boolean;
  zipGeojson: GeoJSON.FeatureCollection | null;
  searchedZips: string[];
  mapStyle: "streets" | "satellite";
  isLoading: boolean;
  onZipClick?: (zipCode: string) => void;
};

// Default to downtown Honolulu, Hawaii (96813)
const DEFAULT_CENTER = { lat: 21.3113, lng: -157.86 };
const DEFAULT_ZOOM = 12;

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// ── Inner map component (needs to be inside APIProvider) ──────────────────

function SellerMapInner({
  properties,
  selectedProperty,
  onSelectProperty,
  onBoundsChange,
  showHeatMap,
  showTMK,
  tmkGeojson,
  showZipBoundaries,
  zipGeojson,
  searchedZips,
  isLoading,
  onZipClick,
}: Props) {
  const map = useMap();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const zipLayerRef = useRef<google.maps.Data | null>(null);

  // Handle bounds change after user stops moving
  const handleIdle = useCallback(() => {
    if (!map) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const bounds = map.getBounds();
      if (!bounds) return;

      const center = bounds.getCenter();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      if (!center || !ne || !sw) return;

      const latDiff = ne.lat() - sw.lat();
      const lngDiff = ne.lng() - sw.lng();
      const avgDeg = (latDiff + lngDiff) / 4;
      const radiusMiles = avgDeg * 69;

      onBoundsChange({
        lat: center.lat(),
        lng: center.lng(),
        radius: Math.min(Math.max(radiusMiles, 0.5), 50),
      });
    }, 600);
  }, [map, onBoundsChange]);

  // Fly to selected property
  useEffect(() => {
    if (selectedProperty && map) {
      map.panTo({ lat: selectedProperty.lat, lng: selectedProperty.lng });
      const currentZoom = map.getZoom() || DEFAULT_ZOOM;
      if (currentZoom < 15) {
        map.setZoom(15);
      }
    }
  }, [selectedProperty, map]);

  // Heatmap layer
  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }

    if (showHeatMap && properties.length > 0) {
      const heatmapData = properties
        .filter((p) => p.level === "very-likely" || p.level === "likely")
        .map((p) => ({
          location: new google.maps.LatLng(p.lat, p.lng),
          weight: p.score / 100,
        }));

      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map,
        radius: 30,
        opacity: 0.7,
        gradient: [
          "rgba(33,102,172,0)",
          "rgb(103,169,207)",
          "rgb(209,229,240)",
          "rgb(253,219,199)",
          "rgb(239,138,98)",
          "rgb(178,24,43)",
        ],
      });
    }

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
      }
    };
  }, [map, showHeatMap, properties]);

  // TMK GeoJSON layer
  useEffect(() => {
    if (!map) return;

    if (dataLayerRef.current) {
      dataLayerRef.current.setMap(null);
      dataLayerRef.current = null;
    }

    if (showTMK && tmkGeojson) {
      const dataLayer = new google.maps.Data({ map });
      dataLayer.addGeoJson(tmkGeojson);
      dataLayer.setStyle({
        fillColor: "#6366f1",
        fillOpacity: 0.08,
        strokeColor: "#6366f1",
        strokeWeight: 1,
        strokeOpacity: 0.5,
      });
      dataLayerRef.current = dataLayer;

      // Fit map bounds to the TMK parcel geometry
      const bounds = new google.maps.LatLngBounds();
      dataLayer.forEach((feature) => {
        feature.getGeometry()?.forEachLatLng((latlng) => {
          bounds.extend(latlng);
        });
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      }
    }

    return () => {
      if (dataLayerRef.current) {
        dataLayerRef.current.setMap(null);
        dataLayerRef.current = null;
      }
    };
  }, [map, showTMK, tmkGeojson]);

  // Zip code boundary layer — only show searched zips + hover highlighting
  const hoveredFeatureRef = useRef<google.maps.Data.Feature | null>(null);

  useEffect(() => {
    if (!map) return;

    if (zipLayerRef.current) {
      zipLayerRef.current.setMap(null);
      zipLayerRef.current = null;
    }

    if (showZipBoundaries && zipGeojson) {
      const searchedSet = new Set(searchedZips);

      const zipLayer = new google.maps.Data({ map });
      zipLayer.addGeoJson(zipGeojson);

      // Style per feature: searched zips get a visible boundary, others are invisible
      zipLayer.setStyle((feature) => {
        const zipCode = feature.getProperty("ZCTA5") || feature.getProperty("BASENAME") || "";
        const isSearched = searchedSet.has(String(zipCode));
        const isHovered = feature === hoveredFeatureRef.current;

        if (isSearched) {
          return {
            fillColor: "#2563eb",
            fillOpacity: 0.06,
            strokeColor: "#2563eb",
            strokeWeight: 2.5,
            strokeOpacity: 0.85,
          };
        }
        if (isHovered) {
          return {
            fillColor: "#2563eb",
            fillOpacity: 0.04,
            strokeColor: "#2563eb",
            strokeWeight: 2,
            strokeOpacity: 0.6,
          };
        }
        // Invisible — but still interactive for hover detection
        return {
          fillColor: "transparent",
          fillOpacity: 0,
          strokeColor: "transparent",
          strokeWeight: 0,
          strokeOpacity: 0,
        };
      });

      // Show zip code bubble + boundary on hover
      const infoWindow = new google.maps.InfoWindow();
      zipLayer.addListener("mouseover", (event: google.maps.Data.MouseEvent) => {
        const zipCode = event.feature.getProperty("ZCTA5") || event.feature.getProperty("BASENAME") || "";
        hoveredFeatureRef.current = event.feature;
        // Trigger re-style so the hovered feature gets outlined
        zipLayer.overrideStyle(event.feature, {
          fillColor: "#2563eb",
          fillOpacity: 0.04,
          strokeColor: "#2563eb",
          strokeWeight: 2,
          strokeOpacity: 0.6,
        });

        if (zipCode && event.latLng) {
          infoWindow.setContent(
            `<div style="font-size:13px;font-weight:600;padding:2px 4px;cursor:pointer">${zipCode}<div style="font-size:10px;font-weight:400;color:#6b7280;margin-top:2px">Click to search</div></div>`,
          );
          infoWindow.setPosition(event.latLng);
          infoWindow.open(map);
        }
      });
      zipLayer.addListener("mouseout", (event: google.maps.Data.MouseEvent) => {
        hoveredFeatureRef.current = null;
        zipLayer.revertStyle(event.feature);
        infoWindow.close();
      });

      // Click on zip code boundary to search that zip
      zipLayer.addListener("click", (event: google.maps.Data.MouseEvent) => {
        const zipCode = event.feature.getProperty("ZCTA5") || event.feature.getProperty("BASENAME") || "";
        if (zipCode && onZipClick) {
          onZipClick(String(zipCode));
        }
      });

      zipLayerRef.current = zipLayer;

      // If there are searched zips, fit the map to show them
      if (searchedSet.size > 0) {
        const bounds = new google.maps.LatLngBounds();
        let hasMatchedFeature = false;
        zipLayer.forEach((feature) => {
          const zipCode = feature.getProperty("ZCTA5") || feature.getProperty("BASENAME") || "";
          if (searchedSet.has(String(zipCode))) {
            hasMatchedFeature = true;
            feature.getGeometry()?.forEachLatLng((latlng) => {
              bounds.extend(latlng);
            });
          }
        });
        if (hasMatchedFeature && !bounds.isEmpty()) {
          map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        }
      }
    }

    return () => {
      if (zipLayerRef.current) {
        zipLayerRef.current.setMap(null);
        zipLayerRef.current = null;
      }
    };
  }, [map, showZipBoundaries, zipGeojson, searchedZips, onZipClick]);

  // Listen for idle event
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", handleIdle);
    return () => google.maps.event.removeListener(listener);
  }, [map, handleIdle]);

  return (
    <>
      {/* Property Markers — only likely+ sellers shown on map */}
      {properties
        .filter((p) => p.level === "very-likely" || p.level === "likely")
        .map((p) => (
          <AdvancedMarker
            key={p.id}
            position={{ lat: p.lat, lng: p.lng }}
            title={`${p.address} — Score: ${p.score}`}
            onClick={() => onSelectProperty(p)}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125"
              style={{ backgroundColor: getSellerColor(p.level) }}
            />
          </AdvancedMarker>
        ))}

      {/* Selected Property Info Window */}
      {selectedProperty && (
        <InfoWindow
          position={{ lat: selectedProperty.lat, lng: selectedProperty.lng }}
          onCloseClick={() => onSelectProperty(null)}
          pixelOffset={[0, -12]}
          maxWidth={360}
        >
          <PropertyCard property={selectedProperty} compact />
        </InfoWindow>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/90 text-sm px-4 py-2 rounded-full shadow-md">
          Loading properties...
        </div>
      )}
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────

export function SellerMapView(props: Props) {
  if (!API_KEY) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Google Maps API Key Required</h3>
          <p className="text-sm text-gray-500 max-w-md">
            Add your Google Maps API key as{" "}
            <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your{" "}
            <code className="bg-gray-100 px-1 rounded">.env.local</code> file. Ensure the Maps JavaScript API and
            Visualization library are enabled in your{" "}
            <a
              href="https://console.cloud.google.com/apis/library"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Cloud Console
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const mapId = "9a0305a3faa90a39b0b7b9e3";

  return (
    <div className="relative h-full w-full">
      <APIProvider apiKey={API_KEY} libraries={["visualization"]}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId={mapId}
          mapTypeId={props.mapStyle === "satellite" ? "hybrid" : "roadmap"}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          style={{ width: "100%", height: "100%" }}
          onClick={() => props.onSelectProperty(null)}
        >
          <SellerMapInner {...props} />
        </Map>
      </APIProvider>
    </div>
  );
}
