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
  zips: string;
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
  mapStyle: "streets" | "satellite";
  onToggleMapStyle: () => void;
  savedSearches: SavedSearch[];
  onSaveSearch: (name: string) => void;
  onLoadSearch: (search: SavedSearch) => void;
  onDeleteSearch: (id: string) => void;
  onAddToCRM?: (property: ScoredProperty) => void;
  onGenerateReport?: (property: ScoredProperty) => void;
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
  mapStyle,
  onToggleMapStyle,
  savedSearches,
  onSaveSearch,
  onLoadSearch,
  onDeleteSearch,
  onAddToCRM,
  onGenerateReport,
  onSearchArea,
  isLoading,
  total,
}: Props) {
  const [tab, setTab] = useState<"results" | "filters" | "saved">("results");
  const [saveSearchName, setSaveSearchName] = useState("");

  // Show very-likely, likely, and possible sellers
  const qualifiedProperties = properties.filter(
    (p) => p.level === "very-likely" || p.level === "likely" || p.level === "possible"
  );

  // Score distribution summary
  const dist = {
    veryLikely: qualifiedProperties.filter((p) => p.level === "very-likely").length,
    likely: qualifiedProperties.filter((p) => p.level === "likely").length,
    possible: qualifiedProperties.filter((p) => p.level === "possible").length,
  };

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* Zip Code Search */}
      <div className="p-3 border-b bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search zip codes (e.g. 96825, 96826)"
            value={filters.zips || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, zips: e.target.value })
            }
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
        <p className="text-[10px] text-gray-400 mt-1">
          Comma-separated zips, or leave empty and use "Search This Area" on the map.
        </p>
      </div>

      {/* Header Stats */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Seller Opportunities</h2>
          <span className="text-xs text-gray-500">
            {qualifiedProperties.length} sellers
          </span>
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
              tab === t
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
            {t === "saved" && savedSearches.length > 0 && (
              <span className="ml-1 text-[10px] bg-gray-100 px-1 rounded">
                {savedSearches.length}
              </span>
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
              <div className="p-8 text-center text-sm text-gray-500">
                Searching properties...
              </div>
            ) : qualifiedProperties.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                {total > 0
                  ? `${total} properties found but none scored above 30. Try a different area or lower the minimum score filter.`
                  : "No properties found. Try panning the map to a different area and clicking \"Search This Area\"."}
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
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Minimum Score: {filters.minScore}
              </label>
              <input
                type="range"
                min={0}
                max={90}
                step={10}
                value={filters.minScore}
                onChange={(e) =>
                  onFiltersChange({ ...filters, minScore: Number(e.target.value) })
                }
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
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
                onChange={(e) =>
                  onFiltersChange({ ...filters, absenteeOnly: e.target.checked })
                }
                className="rounded accent-blue-600"
              />
              <label htmlFor="absenteeOnly" className="text-xs text-gray-700">
                Absentee owners only
              </label>
            </div>

            {/* Map Layers */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Map Layers</h4>
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
                    checked={showTMK}
                    onChange={onToggleTMK}
                    className="rounded accent-blue-600"
                  />
                  TMK parcel boundaries (Hawaii)
                </label>
              </div>
            </div>

            {/* Map Style */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Map Style</h4>
              <button
                onClick={onToggleMapStyle}
                className="text-xs border px-3 py-1.5 rounded hover:bg-gray-50"
              >
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
              <h4 className="text-xs font-medium text-gray-700 mb-2">Save Current View</h4>
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
                    className="flex items-center justify-between p-2 border rounded text-xs hover:bg-gray-50"
                  >
                    <button
                      onClick={() => onLoadSearch(s)}
                      className="text-left flex-1 font-medium text-gray-700 hover:text-blue-600"
                    >
                      {s.name}
                    </button>
                    <button
                      onClick={() => onDeleteSearch(s.id)}
                      className="text-gray-400 hover:text-red-500 ml-2"
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
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
        <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
          {p.estimatedValue && (
            <span>{fmtPrice(p.estimatedValue)}</span>
          )}
          {p.ownershipYears != null && <span>{p.ownershipYears}yr owned</span>}
          {p.absentee && (
            <span className="text-amber-600 font-medium">Absentee</span>
          )}
        </div>
      </div>
    </div>
  );
}
