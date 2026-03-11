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
    zips?: string;
    propertyType?: string;
  };
};

const DEFAULT_FILTERS = {
  minScore: 40,
  absenteeOnly: false,
  minEquity: 0,
  minOwnership: 0,
  zips: "",
  propertyType: "",
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

  // Current map viewport (updated on pan/zoom, but does NOT trigger fetches)
  const boundsRef = useRef({ lat: 21.3069, lng: -157.8583, radius: 10 });
  const [hasFetched, setHasFetched] = useState(false);

  // Load saved searches on mount
  useEffect(() => {
    fetch("/api/seller-map/saved-searches")
      .then((r) => r.json())
      .then((data) => {
        if (data.searches) setSavedSearches(data.searches);
      })
      .catch(() => {});
  }, []);

  // Fetch properties — only called explicitly (button click, saved search, initial load)
  const fetchProperties = useCallback(
    async (bounds: { lat: number; lng: number; radius: number }) => {
      setIsLoading(true);
      try {
        // If user specified zip codes, use a higher limit for island-wide coverage
        const trimmedZips = filters.zips?.trim();
        const searchLimit = trimmedZips ? "2000" : "500";

        const params = new URLSearchParams({
          lat: String(bounds.lat),
          lng: String(bounds.lng),
          radius: String(bounds.radius),
          minScore: String(filters.minScore),
          absenteeOnly: String(filters.absenteeOnly),
          limit: searchLimit,
        });

        // If user specified zip codes, add them to query (overrides lat/lng search)
        if (trimmedZips) {
          params.set("zips", trimmedZips);
        }

        // Property type filter
        if (filters.propertyType) {
          params.set("propertyType", filters.propertyType);
        }

        const res = await fetch(`/api/seller-map?${params}`);
        const data = await res.json();

        if (data.error) {
          console.error("[SellerMap]", data.error);
          return;
        }

        setProperties(data.properties || []);
        setTotal(data.total || 0);
        setHasFetched(true);
      } catch (err) {
        console.error("[SellerMap] Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [filters.minScore, filters.absenteeOnly, filters.zips, filters.propertyType]
  );

  // Initial load — fetch once on mount
  useEffect(() => {
    fetchProperties(boundsRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track viewport bounds (no auto-fetch)
  const handleBoundsChange = useCallback(
    (bounds: { lat: number; lng: number; radius: number }) => {
      boundsRef.current = bounds;
    },
    []
  );

  // Manual search — user clicks "Search This Area"
  const handleSearchThisArea = useCallback(() => {
    fetchProperties(boundsRef.current);
  }, [fetchProperties]);

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
        setFilters({ ...search.filters, zips: search.filters.zips || "", propertyType: search.filters.propertyType || "" });
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

  const handleDraftOutreach = useCallback((property: ScoredProperty) => {
    // Select the property to open its detail panel (outreach tab is available there)
    setSelectedProperty(property);
  }, []);

  // Mobile tab state: "map" or "list"
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const sidebarProps = {
    properties,
    selectedProperty,
    onSelectProperty: setSelectedProperty,
    filters,
    onFiltersChange: setFilters,
    showHeatMap,
    onToggleHeatMap: () => setShowHeatMap((v) => !v),
    showTMK,
    onToggleTMK: () => setShowTMK((v) => !v),
    mapStyle,
    onToggleMapStyle: () => setMapStyle((v) => (v === "streets" ? "satellite" : "streets")),
    savedSearches,
    onSaveSearch: handleSaveSearch,
    onLoadSearch: handleLoadSearch,
    onDeleteSearch: handleDeleteSearch,
    onAddToCRM: handleAddToCRM,
    onGenerateReport: handleGenerateReport,
    onDraftOutreach: handleDraftOutreach,
    onSearchArea: handleSearchThisArea,
    isLoading,
    total,
  } as const;

  return (
    <>
      {/* ── Desktop Layout (side-by-side) ── */}
      <div className="hidden md:flex h-[calc(100vh-180px)] rounded-lg overflow-hidden border bg-white shadow-sm">
        {/* Sidebar — Desktop */}
        <div className="w-[340px] shrink-0">
          {selectedProperty ? (
            <PropertyDetailPanel
              property={selectedProperty}
              onClose={() => setSelectedProperty(null)}
              onAddToCRM={handleAddToCRM}
            />
          ) : (
            <SidebarPanel {...sidebarProps} />
          )}
        </div>

        {/* Map — Desktop */}
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
          {hasFetched && (
            <button
              onClick={handleSearchThisArea}
              disabled={isLoading}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white shadow-lg rounded-full px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isLoading ? "Searching..." : "Search This Area"}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Layout (tabbed: Map / List) ── */}
      <div className="md:hidden flex flex-col" style={{ height: "calc(100dvh - 260px)", minHeight: 400 }}>
        {/* Mobile tab bar */}
        <div className="flex border-b bg-white shrink-0 rounded-t-lg overflow-hidden border-x border-t">
          <button
            onClick={() => setMobileView("map")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mobileView === "map"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-gray-500"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setMobileView("list")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mobileView === "list"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-gray-500"
            }`}
          >
            List {total > 0 && `(${total})`}
          </button>
        </div>

        {/* Mobile content area */}
        <div className="flex-1 relative overflow-hidden rounded-b-lg border-x border-b bg-white">
          {/* Map view */}
          <div className={mobileView === "map" ? "absolute inset-0" : "hidden"}>
            <SellerMapView
              properties={properties}
              selectedProperty={selectedProperty}
              onSelectProperty={(p) => {
                setSelectedProperty(p);
                if (p) setMobileShowSidebar(true);
              }}
              onBoundsChange={handleBoundsChange}
              showHeatMap={showHeatMap}
              showTMK={showTMK}
              tmkGeojson={tmkGeojson}
              mapStyle={mapStyle}
              isLoading={isLoading}
            />
            {hasFetched && (
              <button
                onClick={handleSearchThisArea}
                disabled={isLoading}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white shadow-lg rounded-full px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                {isLoading ? "Searching..." : "Search This Area"}
              </button>
            )}
          </div>

          {/* List view */}
          <div className={mobileView === "list" ? "absolute inset-0 overflow-y-auto" : "hidden"}>
            <SidebarPanel
              {...sidebarProps}
              onSelectProperty={(p) => {
                setSelectedProperty(p);
                setMobileShowSidebar(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile Property Detail Overlay ── */}
      {mobileShowSidebar && selectedProperty && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-white">
          {/* Close bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 shrink-0">
            <span className="text-xs font-medium text-gray-500">Property Detail</span>
            <button
              onClick={() => {
                setSelectedProperty(null);
                setMobileShowSidebar(false);
              }}
              className="text-sm font-medium text-blue-600 px-2 py-1"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PropertyDetailPanel
              property={selectedProperty}
              onClose={() => {
                setSelectedProperty(null);
                setMobileShowSidebar(false);
              }}
              onAddToCRM={handleAddToCRM}
            />
          </div>
        </div>
      )}
    </>
  );
}
