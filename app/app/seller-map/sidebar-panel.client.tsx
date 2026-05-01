"use client";

import { useState } from "react";
import type { ScoredProperty } from "@/lib/scoring/seller-motivation-score";
import { getSellerColor, getSellerLabel } from "@/lib/scoring/seller-motivation-score";
import { fmtPrice } from "@/lib/utils";
import { PropertyCard } from "./property-card.client";

type Filters = {
  minScore: number;
  absenteeOnly: boolean;
  minEquity: number;
  minOwnership: number;
  minProperties: number;
  zips: string;
  propertyType: string;
};

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
  };
};

type Props = {
  properties: ScoredProperty[];
  selectedProperty: ScoredProperty | null;
  onSelectProperty: (p: ScoredProperty) => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  showHeatMap: boolean;
  onToggleHeatMap: () => void;
  showTMK: boolean;
  onToggleTMK: () => void;
  showZipBoundaries: boolean;
  onToggleZipBoundaries: () => void;
  mapStyle: "streets" | "satellite";
  onToggleMapStyle: () => void;
  savedSearches: SavedSearch[];
  onSaveSearch: (name: string) => void;
  onLoadSearch: (search: SavedSearch) => void;
  onDeleteSearch: (id: string) => void;
  onAddToCRM?: (property: ScoredProperty) => void;
  onGenerateReport?: (property: ScoredProperty) => void;
  onDraftOutreach?: (property: ScoredProperty) => void;
  onSearchArea: () => void;
  isLoading: boolean;
  total: number;
};

export function SidebarPanel({
  properties,
  selectedProperty,
  onSelectProperty,
  filters,
  onFiltersChange,
  showHeatMap,
  onToggleHeatMap,
  showTMK,
  onToggleTMK,
  showZipBoundaries,
  onToggleZipBoundaries,
  mapStyle,
  onToggleMapStyle,
  savedSearches,
  onSaveSearch,
  onLoadSearch,
  onDeleteSearch,
  onAddToCRM,
  onGenerateReport,
  onDraftOutreach,
  onSearchArea,
  isLoading,
  total,
}: Props) {
  const [tab, setTab] = useState<"results" | "filters" | "saved">("results");
  const [saveSearchName, setSaveSearchName] = useState("");

  // Show very-likely, likely, and possible sellers
  const qualifiedProperties = properties.filter(
    (p) => p.level === "very-likely" || p.level === "likely" || p.level === "possible",
  );

  // Score distribution summary
  const dist = {
    veryLikely: qualifiedProperties.filter((p) => p.level === "very-likely").length,
    likely: qualifiedProperties.filter((p) => p.level === "likely").length,
    possible: qualifiedProperties.filter((p) => p.level === "possible").length,
  };

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Zip Code / TMK Search */}
      <div className="p-3 border-b bg-card">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Zip code or TMK (e.g. 96825 or 1-2-3-004-005)"
            value={filters.zips || ""}
            onChange={(e) => onFiltersChange({ ...filters, zips: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filters.zips?.trim()) onSearchArea();
            }}
            className="flex-1 text-xs border rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={onSearchArea}
            disabled={isLoading}
            className="text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0"
          >
            {isLoading ? "..." : "Search"}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Zip codes (comma-separated), TMK number, or use &quot;Search This Area&quot; on the map.
        </p>
      </div>

      {/* Header Stats */}
      <div className="p-4 border-b bg-muted">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Seller Opportunities</h2>
          <span className="text-xs text-muted-foreground">{qualifiedProperties.length} sellers</span>
        </div>

        {/* Score Distribution Bar */}
        {qualifiedProperties.length > 0 && (
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-2">
            {dist.veryLikely > 0 && (
              <div
                className="bg-red-500"
                style={{ width: `${(dist.veryLikely / qualifiedProperties.length) * 100}%` }}
                title={`Very Likely: ${dist.veryLikely}`}
              />
            )}
            {dist.likely > 0 && (
              <div
                className="bg-orange-500"
                style={{ width: `${(dist.likely / qualifiedProperties.length) * 100}%` }}
                title={`Likely: ${dist.likely}`}
              />
            )}
            {dist.possible > 0 && (
              <div
                className="bg-yellow-500"
                style={{ width: `${(dist.possible / qualifiedProperties.length) * 100}%` }}
                title={`Possible: ${dist.possible}`}
              />
            )}
          </div>
        )}

        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Very Likely ({dist.veryLikely})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Likely ({dist.likely})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Possible ({dist.possible})
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b text-xs">
        {(["results", "filters", "saved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 font-medium capitalize transition-colors ${
              tab === t ? "text-blue-600 border-b-2 border-blue-600" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {t === "saved" && savedSearches.length > 0 && (
              <span className="ml-1 text-[10px] bg-muted px-1 rounded">{savedSearches.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Results Tab */}
        {tab === "results" && (
          <div className="divide-y">
            {isLoading && qualifiedProperties.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Searching properties...</div>
            ) : qualifiedProperties.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {total > 0
                  ? `${total} properties found but none scored above ${filters.minScore || 30}. Try lowering the minimum score filter.`
                  : 'No properties found. Enter a zip code above or pan the map and click "Search This Area".'}
              </div>
            ) : (
              qualifiedProperties.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 cursor-pointer transition-colors hover:bg-blue-50 ${
                    selectedProperty?.id === p.id ? "bg-blue-50 border-l-2 border-blue-600" : ""
                  }`}
                  onClick={() => onSelectProperty(p)}
                >
                  {selectedProperty?.id === p.id ? (
                    <PropertyCard
                      property={p}
                      onAddToCRM={onAddToCRM}
                      onGenerateReport={onGenerateReport}
                      onDraftOutreach={onDraftOutreach}
                    />
                  ) : (
                    <PropertyListItem property={p} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Filters Tab */}
        {tab === "filters" && (
          <div className="p-4 space-y-5">
            {/* Min Score */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Minimum Score: {filters.minScore}
              </label>
              <input
                type="range"
                min={0}
                max={90}
                step={10}
                value={filters.minScore}
                onChange={(e) => onFiltersChange({ ...filters, minScore: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>All</span>
                <span>30+</span>
                <span>50+</span>
                <span>70+</span>
                <span>90+</span>
              </div>
            </div>

            {/* Absentee Only */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="absenteeOnly"
                checked={filters.absenteeOnly}
                onChange={(e) => onFiltersChange({ ...filters, absenteeOnly: e.target.checked })}
                className="rounded accent-blue-600"
              />
              <label htmlFor="absenteeOnly" className="text-xs text-foreground">
                Absentee owners only
              </label>
            </div>

            {/* Min Ownership Years (Time at Residence) */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Min Years of Ownership: {filters.minOwnership || "Any"}
              </label>
              <input
                type="range"
                min={0}
                max={40}
                step={5}
                value={filters.minOwnership}
                onChange={(e) => onFiltersChange({ ...filters, minOwnership: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Any</span>
                <span>10yr</span>
                <span>20yr</span>
                <span>30yr</span>
                <span>40yr</span>
              </div>
            </div>

            {/* Min Equity */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Min Equity: {filters.minEquity ? `${filters.minEquity}%` : "Any"}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={filters.minEquity}
                onChange={(e) => onFiltersChange({ ...filters, minEquity: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Any</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Min Properties Owned (Investor Filter) */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Min Properties Owned: {filters.minProperties || "Any"}
              </label>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={filters.minProperties}
                onChange={(e) => onFiltersChange({ ...filters, minProperties: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Any</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20+</span>
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Property Type</label>
              <select
                value={filters.propertyType || ""}
                onChange={(e) => onFiltersChange({ ...filters, propertyType: e.target.value })}
                className="w-full text-xs border rounded px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-card"
              >
                <option value="">All Types</option>
                <option value="Single Family">Single Family</option>
                <option value="Condo">Condo</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Land">Vacant Land</option>
                <option value="Multi-Family">Multi-Family</option>
                <option value="Manufactured">Manufactured</option>
              </select>
            </div>

            {/* Map Layers */}
            <div>
              <h4 className="text-xs font-medium text-foreground mb-2">Map Layers</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={showHeatMap}
                    onChange={onToggleHeatMap}
                    className="rounded accent-blue-600"
                  />
                  Heat map overlay
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={showZipBoundaries}
                    onChange={onToggleZipBoundaries}
                    className="rounded accent-blue-600"
                  />
                  Zip code boundaries
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={showTMK} onChange={onToggleTMK} className="rounded accent-blue-600" />
                  TMK parcel boundaries
                </label>
              </div>
            </div>

            {/* GIS Overlay Layers */}
            <GISLayerToggles />

            {/* Map Style */}
            <div>
              <h4 className="text-xs font-medium text-foreground mb-2">Map Style</h4>
              <button onClick={onToggleMapStyle} className="text-xs border px-3 py-1.5 rounded hover:bg-muted">
                Switch to {mapStyle === "streets" ? "Satellite" : "Streets"}
              </button>
            </div>
          </div>
        )}

        {/* Saved Searches Tab */}
        {tab === "saved" && (
          <div className="p-4 space-y-4">
            {/* Save current search */}
            <div>
              <h4 className="text-xs font-medium text-foreground mb-2">Save Current View</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search name..."
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  className="flex-1 text-xs border rounded px-2 py-1.5"
                />
                <button
                  onClick={() => {
                    if (saveSearchName.trim()) {
                      onSaveSearch(saveSearchName.trim());
                      setSaveSearchName("");
                    }
                  }}
                  disabled={!saveSearchName.trim()}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Saved searches list */}
            {savedSearches.length > 0 ? (
              <div className="space-y-2">
                {savedSearches.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 border rounded text-xs hover:bg-muted"
                  >
                    <button
                      onClick={() => onLoadSearch(s)}
                      className="text-left flex-1 font-medium text-foreground hover:text-blue-600"
                    >
                      {s.name}
                    </button>
                    <button
                      onClick={() => onDeleteSearch(s.id)}
                      className="text-muted-foreground hover:text-red-500 ml-2"
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No saved searches yet. Pan the map to an area and save it for quick access.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyListItem({ property: p }: { property: ScoredProperty }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: getSellerColor(p.level) }}
      >
        {p.score}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-800 truncate">{p.address}</p>
        <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
          {p.estimatedValue && <span>{fmtPrice(p.estimatedValue)}</span>}
          {p.ownershipYears != null && <span>{p.ownershipYears}yr owned</span>}
          {!p.ownershipYears && p.lastSaleDate && <span>Sold {new Date(p.lastSaleDate).toLocaleDateString()}</span>}
          {!p.ownershipYears && !p.lastSaleDate && <span className="text-orange-400">No sale date</span>}
          {p.absentee && <span className="text-amber-600 font-medium">Absentee</span>}
        </div>
      </div>
    </div>
  );
}

// ── GIS Layer Toggle Controls ────────────────────────────────────────────

const GIS_LAYER_GROUPS = [
  {
    label: "Hazards",
    color: "#dc2626",
    layers: [
      { key: "flood-zones", label: "FEMA Flood Zones", color: "#2563eb" },
      { key: "tsunami-zones", label: "Tsunami Evacuation", color: "#0891b2" },
      { key: "lava-flow", label: "Lava Flow Zones", color: "#dc2626" },
      { key: "fire-risk", label: "Fire Risk Areas", color: "#ea580c" },
      { key: "slr-32ft", label: "Sea Level Rise (3.2ft)", color: "#0d9488" },
    ],
  },
  {
    label: "Schools",
    color: "#7c3aed",
    layers: [
      { key: "school-elementary", label: "Elementary Zones", color: "#22c55e" },
      { key: "school-middle", label: "Middle School Zones", color: "#3b82f6" },
      { key: "school-high", label: "High School Zones", color: "#8b5cf6" },
    ],
  },
  {
    label: "Economy",
    color: "#059669",
    layers: [
      { key: "opportunity-zones", label: "Opportunity Zones", color: "#059669" },
      { key: "enterprise-zones", label: "Enterprise Zones", color: "#0891b2" },
    ],
  },
  {
    label: "Services",
    color: "#2563eb",
    layers: [
      { key: "hospitals", label: "Hospitals", color: "#dc2626" },
      { key: "fire-stations", label: "Fire Stations", color: "#ea580c" },
      { key: "police-stations", label: "Police Stations", color: "#1d4ed8" },
      { key: "parks", label: "Parks", color: "#16a34a" },
    ],
  },
];

function GISLayerToggles() {
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());

  const toggleLayer = async (layerKey: string) => {
    const newActive = new Set(activeLayers);
    if (newActive.has(layerKey)) {
      newActive.delete(layerKey);
      setActiveLayers(newActive);
      // Dispatch event to map to remove layer
      window.dispatchEvent(new CustomEvent("gis-layer-toggle", { detail: { key: layerKey, active: false } }));
    } else {
      newActive.add(layerKey);
      setActiveLayers(newActive);
      setLoadingLayers((prev) => new Set(prev).add(layerKey));

      // Fetch the GIS data and dispatch to map
      try {
        // Get current map bounds from the map view
        const bounds = (window as any).__sellerMapBounds;
        const bbox = bounds
          ? `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
          : "";
        const bboxParam = bbox ? `&bbox=${bbox}` : "";
        const res = await fetch(`/api/seller-map/gis-overlay?overlay=${layerKey}&limit=500${bboxParam}`);
        const geojson = await res.json();

        if (geojson.features?.length > 0) {
          const layerConfig = GIS_LAYER_GROUPS.flatMap((g) => g.layers).find((l) => l.key === layerKey);
          window.dispatchEvent(
            new CustomEvent("gis-layer-toggle", {
              detail: { key: layerKey, active: true, geojson, color: layerConfig?.color || "#3b82f6" },
            }),
          );
        }
      } catch (err) {
        console.error(`[GIS] Failed to load layer ${layerKey}:`, err);
        newActive.delete(layerKey);
        setActiveLayers(newActive);
      } finally {
        setLoadingLayers((prev) => {
          const next = new Set(prev);
          next.delete(layerKey);
          return next;
        });
      }
    }
  };

  return (
    <div>
      <h4 className="text-xs font-medium text-foreground mb-2">GIS Layers (Hawaii)</h4>
      <div className="space-y-1">
        {GIS_LAYER_GROUPS.map((group) => (
          <div key={group.label}>
            <button
              onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}
              className="flex items-center justify-between w-full text-xs font-medium py-1 text-gray-600 hover:text-gray-800"
            >
              <span style={{ borderLeft: `3px solid ${group.color}`, paddingLeft: 6 }}>{group.label}</span>
              <span className="text-muted-foreground">{expandedGroup === group.label ? "▾" : "▸"}</span>
            </button>
            {expandedGroup === group.label && (
              <div className="pl-3 space-y-1.5 pb-2">
                {group.layers.map((layer) => (
                  <label key={layer.key} className="flex items-center gap-2 text-[11px] text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeLayers.has(layer.key)}
                      onChange={() => toggleLayer(layer.key)}
                      disabled={loadingLayers.has(layer.key)}
                      className="rounded accent-blue-600"
                      style={{ accentColor: layer.color }}
                    />
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: layer.color }}
                    />
                    {layer.label}
                    {loadingLayers.has(layer.key) && <span className="text-muted-foreground ml-1">...</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
