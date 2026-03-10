"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import type { MapRef, ViewStateChangeEvent } from "react-map-gl/mapbox";
import type { ScoredProperty } from "@/lib/scoring/seller-motivation-score";
import { getSellerColor } from "@/lib/scoring/seller-motivation-score";
import { PropertyCard } from "./property-card.client";
import "mapbox-gl/dist/mapbox-gl.css";

type Props = {
  properties: ScoredProperty[];
  selectedProperty: ScoredProperty | null;
  onSelectProperty: (p: ScoredProperty | null) => void;
  onBoundsChange: (bounds: {
    lat: number;
    lng: number;
    radius: number;
  }) => void;
  showHeatMap: boolean;
  showTMK: boolean;
  tmkGeojson: GeoJSON.FeatureCollection | null;
  mapStyle: "streets" | "satellite";
  isLoading: boolean;
};

// Default to Honolulu, Hawaii
const DEFAULT_VIEW = {
  latitude: 21.3069,
  longitude: -157.8583,
  zoom: 12,
};

export function SellerMapView({
  properties,
  selectedProperty,
  onSelectProperty,
  onBoundsChange,
  showHeatMap,
  showTMK,
  tmkGeojson,
  mapStyle,
  isLoading,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(DEFAULT_VIEW);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

  // Compute heatmap GeoJSON from scored properties
  const heatmapData: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: properties.map((p) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [p.lng, p.lat],
      },
      properties: {
        score: p.score,
      },
    })),
  };

  // Trigger bounds change after user stops moving the map
  const handleMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      setViewState(e.viewState);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const map = mapRef.current?.getMap();
        if (!map) return;

        const bounds = map.getBounds();
        if (!bounds) return;

        const center = bounds.getCenter();
        // Approximate radius from bounds
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const latDiff = ne.lat - sw.lat;
        const lngDiff = ne.lng - sw.lng;
        const avgDeg = (latDiff + lngDiff) / 4;
        const radiusMiles = avgDeg * 69; // ~69 miles per degree

        onBoundsChange({
          lat: center.lat,
          lng: center.lng,
          radius: Math.min(Math.max(radiusMiles, 0.5), 10),
        });
      }, 600);
    },
    [onBoundsChange]
  );

  // Fly to selected property
  useEffect(() => {
    if (selectedProperty && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedProperty.lng, selectedProperty.lat],
        zoom: Math.max(viewState.zoom, 15),
        duration: 800,
      });
    }
  }, [selectedProperty]);

  if (!token) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Mapbox Token Required
          </h3>
          <p className="text-sm text-gray-500 max-w-md">
            Add your Mapbox access token as{" "}
            <code className="bg-gray-100 px-1 rounded">
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>{" "}
            to your <code className="bg-gray-100 px-1 rounded">.env.local</code>{" "}
            file. Get one free at{" "}
            <a
              href="https://account.mapbox.com"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              mapbox.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/90 text-sm px-4 py-2 rounded-full shadow-md">
          Loading properties...
        </div>
      )}

      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onMoveEnd={handleMoveEnd}
        mapboxAccessToken={token}
        mapStyle={
          mapStyle === "satellite"
            ? "mapbox://styles/mapbox/satellite-streets-v12"
            : "mapbox://styles/mapbox/streets-v12"
        }
        style={{ width: "100%", height: "100%" }}
        onClick={() => onSelectProperty(null)}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        {/* Heatmap Layer */}
        {showHeatMap && properties.length > 0 && (
          <Source type="geojson" data={heatmapData}>
            <Layer
              id="seller-heatmap"
              type="heatmap"
              paint={{
                "heatmap-weight": [
                  "interpolate",
                  ["linear"],
                  ["get", "score"],
                  0, 0,
                  50, 0.5,
                  100, 1,
                ],
                "heatmap-intensity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0, 1,
                  15, 3,
                ],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(33,102,172,0)",
                  0.2, "rgb(103,169,207)",
                  0.4, "rgb(209,229,240)",
                  0.6, "rgb(253,219,199)",
                  0.8, "rgb(239,138,98)",
                  1, "rgb(178,24,43)",
                ],
                "heatmap-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0, 2,
                  15, 30,
                ],
                "heatmap-opacity": 0.7,
              }}
            />
          </Source>
        )}

        {/* TMK Parcel Boundaries (Hawaii) */}
        {showTMK && tmkGeojson && (
          <Source type="geojson" data={tmkGeojson}>
            <Layer
              id="tmk-parcels-fill"
              type="fill"
              paint={{
                "fill-color": "#6366f1",
                "fill-opacity": 0.08,
              }}
            />
            <Layer
              id="tmk-parcels-line"
              type="line"
              paint={{
                "line-color": "#6366f1",
                "line-width": 1,
                "line-opacity": 0.5,
              }}
            />
          </Source>
        )}

        {/* Property Markers */}
        {properties.map((p) => (
          <Marker
            key={p.id}
            latitude={p.lat}
            longitude={p.lng}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectProperty(p);
            }}
          >
            <div
              className="cursor-pointer transition-transform hover:scale-125"
              title={`${p.address} — Score: ${p.score}`}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: getSellerColor(p.level) }}
              />
            </div>
          </Marker>
        ))}

        {/* Selected Property Popup */}
        {selectedProperty && (
          <Popup
            latitude={selectedProperty.lat}
            longitude={selectedProperty.lng}
            anchor="bottom"
            offset={12}
            closeOnClick={false}
            onClose={() => onSelectProperty(null)}
            maxWidth="360px"
          >
            <PropertyCard property={selectedProperty} compact />
          </Popup>
        )}
      </Map>
    </div>
  );
}
