"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
    minProperties: number;
    zips?: string;
    propertyType?: string;
  };
};

const DEFAULT_FILTERS = {
  minScore: 40,
  absenteeOnly: false,
  minEquity: 0,
  minOwnership: 0,
  minProperties: 0,
  zips: "",
  propertyType: "",
};

export function SellerMapClient() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<ScoredProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<ScoredProperty | null>(null);
  const [filters, setFilters] = useState(() => {
    // Check URL params for auto-search (from Hoku navigation)
    const urlZip = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("zip") : null;
    const urlTmk = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tmk") : null;
    if (urlZip) return { ...DEFAULT_FILTERS, zips: urlZip };
    if (urlTmk) return { ...DEFAULT_FILTERS, zips: urlTmk };
    return DEFAULT_FILTERS;
  });
  const [showHeatMap, setShowHeatMap] = useState(true);
  const [showTMK, setShowTMK] = useState(false);
  const [showZipBoundaries, setShowZipBoundaries] = useState(true);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");
  const [tmkGeojson, setTmkGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [zipGeojson, setZipGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [mobileShowSidebar, setMobileShowSidebar] = useState(false);

  // Current map viewport (updated on pan/zoom, but does NOT trigger fetches)
  // Default to downtown Honolulu (96813) area
  const boundsRef = useRef({ lat: 21.3113, lng: -157.86, radius: 10 });
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

  // Fetch zip code boundaries on mount (Hawaii ZCTAs, cached for 24h server-side)
  useEffect(() => {
    fetch("/api/seller-map/zip-boundaries?state=15")
      .then((r) => r.json())
      .then((data) => {
        if (data.features?.length) setZipGeojson(data);
      })
      .catch(() => {});
  }, []);

  /**
   * Detect whether input looks like a TMK number rather than zip codes.
   * TMK patterns: "1-2-3-004-005", "12300040050", "(1)2-3-004:005", etc.
   * Zip codes: 5-digit numbers, possibly comma-separated.
   */
  const isTMKInput = useCallback((input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    // Contains dashes with digits on both sides (TMK-style) — but not a plain zip like "96825"
    if (/^\d[\d\-.:() ]{4,}\d$/.test(trimmed) && trimmed.includes("-")) return true;
    // All digits, 9+ chars (raw TMK number like "120030040050")
    const digitsOnly = trimmed.replace(/[-\s.:()]/g, "");
    if (/^\d{9,}$/.test(digitsOnly)) return true;
    return false;
  }, []);

  /**
   * Fetch TMK parcel overlay by TMK number and zoom map to it.
   */
  const fetchTMKOverlay = useCallback(async (tmkInput: string) => {
    try {
      const res = await fetch(`/api/seller-map/tmk-overlay?tmk=${encodeURIComponent(tmkInput)}&limit=50`);
      const geojson = await res.json();

      if (geojson.error || !geojson.features?.length) {
        console.warn("[SellerMap] No TMK parcels found for:", tmkInput);
        setTmkGeojson(null);
        return;
      }

      setTmkGeojson(geojson);
      setShowTMK(true);

      // Compute bounding box of returned features to zoom the map
      let minLat = 90,
        maxLat = -90,
        minLng = 180,
        maxLng = -180;
      for (const feature of geojson.features) {
        const coords =
          feature.geometry?.type === "Polygon"
            ? feature.geometry.coordinates[0]
            : feature.geometry?.type === "MultiPolygon"
              ? feature.geometry.coordinates.flat(1).flat(0)
              : [];
        for (const coord of coords) {
          const [lng, lat] = Array.isArray(coord[0]) ? coord[0] : coord;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
        }
      }

      if (minLat < maxLat && minLng < maxLng) {
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const latSpan = maxLat - minLat;
        const lngSpan = maxLng - minLng;
        const radiusMiles = (Math.max(latSpan, lngSpan) * 69) / 2;
        boundsRef.current = {
          lat: centerLat,
          lng: centerLng,
          radius: Math.max(radiusMiles, 0.5),
        };
      }
    } catch (err) {
      console.error("[SellerMap] TMK overlay fetch error:", err);
    }
  }, []);

  // Fetch properties — only called explicitly (button click, saved search, initial load)
  const fetchProperties = useCallback(
    async (bounds: { lat: number; lng: number; radius: number }) => {
      setIsLoading(true);
      try {
        const trimmedInput = filters.zips?.trim();

        // If input looks like a TMK, fetch parcel overlay instead of zip-based search
        if (trimmedInput && isTMKInput(trimmedInput)) {
          await fetchTMKOverlay(trimmedInput);
          // Still run the property search using the TMK parcel area
          // but don't pass it as a zip code
        }

        // If user specified zip codes, use a higher limit for island-wide coverage
        const isZipSearch = trimmedInput && !isTMKInput(trimmedInput);
        const searchLimit = isZipSearch ? "2000" : "500";

        const params = new URLSearchParams({
          lat: String(bounds.lat),
          lng: String(bounds.lng),
          radius: String(bounds.radius),
          minScore: String(filters.minScore),
          absenteeOnly: String(filters.absenteeOnly),
          limit: searchLimit,
        });

        // Ownership years filter
        if (filters.minOwnership > 0) {
          params.set("minOwnership", String(filters.minOwnership));
        }

        // Equity filter
        if (filters.minEquity > 0) {
          params.set("minEquity", String(filters.minEquity));
        }

        // Min properties owned (investor filter)
        if (filters.minProperties > 0) {
          params.set("minProperties", String(filters.minProperties));
        }

        // If user specified zip codes (not TMK), add them to query
        if (isZipSearch) {
          params.set("zips", trimmedInput);
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
    [
      filters.minScore,
      filters.absenteeOnly,
      filters.minOwnership,
      filters.minEquity,
      filters.minProperties,
      filters.zips,
      filters.propertyType,
      isTMKInput,
      fetchTMKOverlay,
    ],
  );

  // Initial load — fetch once on mount
  useEffect(() => {
    fetchProperties(boundsRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track viewport bounds (no auto-fetch)
  const handleBoundsChange = useCallback((bounds: { lat: number; lng: number; radius: number }) => {
    boundsRef.current = bounds;
  }, []);

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
    [filters],
  );

  const handleLoadSearch = useCallback(
    (search: SavedSearch) => {
      boundsRef.current = {
        lat: search.center_lat,
        lng: search.center_lng,
        radius: search.radius_miles,
      };
      if (search.filters) {
        setFilters({
          ...DEFAULT_FILTERS,
          ...search.filters,
          zips: search.filters.zips || "",
          propertyType: search.filters.propertyType || "",
        });
      }
      fetchProperties(boundsRef.current);
    },
    [fetchProperties],
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

  // Handle zip code click on the map — set the zip as search filter and trigger search
  const handleZipClick = useCallback((zipCode: string) => {
    setFilters((prev) => ({ ...prev, zips: zipCode }));
  }, []);

  // When filters.zips changes from a zip click, auto-fetch
  const prevZipsRef = useRef(filters.zips);
  useEffect(() => {
    if (filters.zips !== prevZipsRef.current) {
      prevZipsRef.current = filters.zips;
      // Only auto-fetch if the zip was set (not cleared)
      if (filters.zips && /^\d{5}$/.test(filters.zips.trim())) {
        fetchProperties(boundsRef.current);
      }
    }
  }, [filters.zips, fetchProperties]);

  // Derive searched zip codes from the zips filter input (only plain zip codes, not TMK)
  const searchedZips = useMemo(() => {
    const trimmed = filters.zips?.trim();
    if (!trimmed || isTMKInput(trimmed)) return [];
    return trimmed
      .split(/[,\s]+/)
      .map((z) => z.trim())
      .filter((z) => /^\d{5}$/.test(z));
  }, [filters.zips, isTMKInput]);

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
    showZipBoundaries,
    onToggleZipBoundaries: () => setShowZipBoundaries((v) => !v),
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
            showZipBoundaries={showZipBoundaries}
            zipGeojson={zipGeojson}
            searchedZips={searchedZips}
            mapStyle={mapStyle}
            isLoading={isLoading}
            onZipClick={handleZipClick}
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
              mobileView === "map" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setMobileView("list")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mobileView === "list" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500"
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
              showZipBoundaries={showZipBoundaries}
              zipGeojson={zipGeojson}
              searchedZips={searchedZips}
              mapStyle={mapStyle}
              isLoading={isLoading}
              onZipClick={handleZipClick}
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
