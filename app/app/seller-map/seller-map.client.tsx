"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ScoredProperty } from "@/lib/scoring/seller-motivation-score";
import { SellerMapView } from "./map-view.client";
import { SidebarPanel } from "./sidebar-panel.client";
import { PropertyDetailPanel } from "./property-detail-panel.client";

type SavedSearch = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_miles: number;
  filters: {
    minScore: number;
    absenteeOnly: boolean;
    minEquity: number;
    minOwnership: number;
  };
};

const DEFAULT_FILTERS = {
  minScore: 0,
  absenteeOnly: false,
  minEquity: 0,
  minOwnership: 0,
};

export function SellerMapClient() {
  const [properties, setProperties] = useState<ScoredProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<ScoredProperty | null>(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [showTMK, setShowTMK] = useState(false);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");
  const [tmkGeojson, setTmkGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [mobileShowSidebar, setMobileShowSidebar] = useState(false);

  // Current map bounds and last-fetched bounds
  const boundsRef = useRef({ lat: 21.3069, lng: -157.8583, radius: 2 });
  const lastFetchRef = useRef<{ lat: number; lng: number; radius: number } | null>(null);

  // Load saved searches on mount
  useEffect(() => {
    fetch("/api/seller-map/saved-searches")
      .then((r) => r.json())
      .then((data) => {
        if (data.searches) setSavedSearches(data.searches);
      })
      .catch(() => {});
  }, []);

  // Fetch properties when bounds or filters change
  const fetchProperties = useCallback(
    async (bounds: { lat: number; lng: number; radius: number }) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          lat: String(bounds.lat),
          lng: String(bounds.lng),
          radius: String(bounds.radius),
          minScore: String(filters.minScore),
          absenteeOnly: String(filters.absenteeOnly),
          limit: "200",
        });

        const res = await fetch(`/api/seller-map?${params}`);
        const data = await res.json();

        if (data.error) {
          console.error("[SellerMap]", data.error);
          return;
        }

        setProperties(data.properties || []);
        setTotal(data.total || 0);
        lastFetchRef.current = { ...bounds };
      } catch (err) {
        console.error("[SellerMap] Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [filters.minScore, filters.absenteeOnly]
  );

  // Initial load
  useEffect(() => {
    fetchProperties(boundsRef.current);
  }, [fetchProperties]);

  const handleBoundsChange = useCallback(
    (bounds: { lat: number; lng: number; radius: number }) => {
      boundsRef.current = bounds;

      // Skip re-fetch when zooming into an area we already have data for.
      // Only re-fetch if the new viewport extends beyond the previous search area.
      const prev = lastFetchRef.current;
      if (prev && properties.length > 0) {
        const distMiles =
          Math.sqrt(
            Math.pow((bounds.lat - prev.lat) * 69, 2) +
            Math.pow((bounds.lng - prev.lng) * 54.6, 2)
          );
        // New viewport center + radius fits inside previous fetch circle
        if (distMiles + bounds.radius < prev.radius * 0.9) {
          return; // existing data covers this view
        }
      }

      fetchProperties(bounds);
    },
    [fetchProperties, properties.length]
  );

  const handleSaveSearch = useCallback(
    async (name: string) => {
      const bounds = boundsRef.current;
      const res = await fetch("/api/seller-map/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          center_lat: bounds.lat,
          center_lng: bounds.lng,
          radius_miles: bounds.radius,
          filters,
        }),
      });
      const data = await res.json();
      if (data.search) {
        setSavedSearches((prev) => [data.search, ...prev]);
      }
    },
    [filters]
  );

  const handleLoadSearch = useCallback(
    (search: SavedSearch) => {
      boundsRef.current = {
        lat: search.center_lat,
        lng: search.center_lng,
        radius: search.radius_miles,
      };
      if (search.filters) {
        setFilters(search.filters);
      }
      fetchProperties(boundsRef.current);
    },
    [fetchProperties]
  );

  const handleDeleteSearch = useCallback(async (id: string) => {
    await fetch(`/api/seller-map/saved-searches?id=${id}`, { method: "DELETE" });
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleAddToCRM = useCallback((property: ScoredProperty) => {
    // Navigate to pipeline with pre-filled data
    const params = new URLSearchParams({
      name: property.owner || "Property Owner",
      address: property.address,
      source: "seller-map",
      score: String(property.score),
    });
    window.open(`/app/pipeline?addLead=true&${params}`, "_blank");
  }, []);

  const handleGenerateReport = useCallback((property: ScoredProperty) => {
    const params = new URLSearchParams({
      address: property.address,
    });
    window.open(`/app/property-data?${params}`, "_blank");
  }, []);

  return (
    <div className="flex h-[calc(100vh-180px)] rounded-lg overflow-hidden border bg-white shadow-sm">
      {/* Sidebar — Desktop */}
      <div className="hidden md:block w-[340px] shrink-0">
        {selectedProperty ? (
          <PropertyDetailPanel
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
            onAddToCRM={handleAddToCRM}
          />
        ) : (
          <SidebarPanel
            properties={properties}
            selectedProperty={selectedProperty}
            onSelectProperty={setSelectedProperty}
            filters={filters}
            onFiltersChange={setFilters}
            showHeatMap={showHeatMap}
            onToggleHeatMap={() => setShowHeatMap((v) => !v)}
            showTMK={showTMK}
            onToggleTMK={() => setShowTMK((v) => !v)}
            mapStyle={mapStyle}
            onToggleMapStyle={() =>
              setMapStyle((v) => (v === "streets" ? "satellite" : "streets"))
            }
            savedSearches={savedSearches}
            onSaveSearch={handleSaveSearch}
            onLoadSearch={handleLoadSearch}
            onDeleteSearch={handleDeleteSearch}
            onAddToCRM={handleAddToCRM}
            onGenerateReport={handleGenerateReport}
            isLoading={isLoading}
            total={total}
          />
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <SellerMapView
          properties={properties}
          selectedProperty={selectedProperty}
          onSelectProperty={setSelectedProperty}
          onBoundsChange={handleBoundsChange}
          showHeatMap={showHeatMap}
          showTMK={showTMK}
          tmkGeojson={tmkGeojson}
          mapStyle={mapStyle}
          isLoading={isLoading}
        />

        {/* Mobile toggle for sidebar */}
        <button
          onClick={() => setMobileShowSidebar((v) => !v)}
          className="md:hidden absolute bottom-4 left-4 z-10 bg-white shadow-lg rounded-full px-4 py-2 text-xs font-medium"
        >
          {mobileShowSidebar ? "Hide List" : `${total} Properties`}
        </button>
      </div>

      {/* Sidebar — Mobile (Bottom Sheet) */}
      {mobileShowSidebar && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-50 h-[60vh] bg-white rounded-t-2xl shadow-2xl">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-1" />
          {selectedProperty ? (
            <PropertyDetailPanel
              property={selectedProperty}
              onClose={() => {
                setSelectedProperty(null);
                setMobileShowSidebar(false);
              }}
              onAddToCRM={handleAddToCRM}
            />
          ) : (
            <SidebarPanel
              properties={properties}
              selectedProperty={selectedProperty}
              onSelectProperty={(p) => {
                setSelectedProperty(p);
              }}
              filters={filters}
              onFiltersChange={setFilters}
              showHeatMap={showHeatMap}
              onToggleHeatMap={() => setShowHeatMap((v) => !v)}
              showTMK={showTMK}
              onToggleTMK={() => setShowTMK((v) => !v)}
              mapStyle={mapStyle}
              onToggleMapStyle={() =>
                setMapStyle((v) => (v === "streets" ? "satellite" : "streets"))
              }
              savedSearches={savedSearches}
              onSaveSearch={handleSaveSearch}
              onLoadSearch={handleLoadSearch}
              onDeleteSearch={handleDeleteSearch}
              onAddToCRM={handleAddToCRM}
              onGenerateReport={handleGenerateReport}
              isLoading={isLoading}
              total={total}
            />
          )}
        </div>
      )}
    </div>
  );
}
