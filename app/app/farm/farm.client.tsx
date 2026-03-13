"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FarmArea {
  id: string;
  name: string;
  search_type: "zip" | "radius" | "tmk";
  postal_codes: string[] | null;
  center_lat: number | null;
  center_lng: number | null;
  radius_miles: number;
  tmk_prefix: string | null;
  property_types: string[];
  min_price: number | null;
  max_price: number | null;
  min_beds: number | null;
  min_baths: number | null;
  statuses: string[];
  is_active: boolean;
  mls_watch_rules: WatchRule[];
  unread_alerts: number;
}

interface WatchRule {
  id: string;
  trigger_type: string;
  threshold_value: number | null;
  status_triggers: string[];
  notify_push: boolean;
  notify_email: boolean;
  notify_sms: boolean;
  is_active: boolean;
}

interface MlsListing {
  ListingKey: string;
  ListingId: string;
  StandardStatus: string;
  ListPrice: number;
  OriginalListPrice?: number;
  UnparsedAddress?: string;
  StreetNumber?: string;
  StreetName?: string;
  StreetSuffix?: string;
  City: string;
  PostalCode: string;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  DaysOnMarket?: number;
  PropertyType: string;
  ListAgentFullName?: string;
  ListOfficeName?: string;
  Media?: { MediaURL: string }[];
  _priceDrop: number;
  _priceDropPct: number;
  _originalListPrice: number;
}

interface WatchdogAlert {
  id: string;
  listing_key: string;
  address: string;
  city: string;
  postal_code: string;
  alert_type: string;
  alert_title: string;
  alert_details: Record<string, any>;
  status: string;
  created_at: string;
  farm_area_id: string;
}

type Tab = "search" | "farms" | "alerts";

// ─── Component ──────────────────────────────────────────────────────────────

export default function FarmClient({ trestleConnected }: { trestleConnected: boolean }) {
  const [tab, setTab] = useState<Tab>("search");
  const [farmAreas, setFarmAreas] = useState<FarmArea[]>([]);
  const [alerts, setAlerts] = useState<WatchdogAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [listings, setListings] = useState<MlsListing[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Search form state
  const [searchType, setSearchType] = useState<"zip" | "radius" | "tmk">("zip");
  const [postalCodes, setPostalCodes] = useState("");
  const [tmkPrefix, setTmkPrefix] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [minDOM, setMinDOM] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [sortBy, setSortBy] = useState<"dom" | "priceAsc" | "priceDesc" | "priceDrop">("dom");

  // Farm create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [saving, setSaving] = useState(false);

  // Watch rule form
  const [newRules, setNewRules] = useState<{
    trigger_type: string;
    threshold_value: string;
    status_triggers: string[];
    notify_push: boolean;
    notify_email: boolean;
    notify_sms: boolean;
  }[]>([]);

  const loadFarmAreas = useCallback(async () => {
    const res = await fetch("/api/mls/farm-areas");
    if (res.ok) {
      const data = await res.json();
      setFarmAreas(data.farmAreas);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    const res = await fetch("/api/mls/watchdog-alerts?limit=50");
    if (res.ok) {
      const data = await res.json();
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    }
  }, []);

  useEffect(() => {
    if (trestleConnected) {
      loadFarmAreas();
      loadAlerts();
    }
  }, [trestleConnected, loadFarmAreas, loadAlerts]);

  const searchFarm = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearching(true);
    try {
      const params = new URLSearchParams();
      params.set("searchType", searchType);
      if (searchType === "zip" && postalCodes) params.set("postalCodes", postalCodes);
      if (searchType === "tmk" && tmkPrefix) params.set("tmkPrefix", tmkPrefix);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (minBeds) params.set("minBeds", minBeds);
      if (minDOM) params.set("minDOM", minDOM);
      if (propertyType) params.set("propertyType", propertyType);
      params.set("limit", "200");

      const res = await fetch(`/api/mls/farm-search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.properties);
        setTotalCount(data.totalCount);
      }
    } finally {
      setSearching(false);
    }
  };

  const searchFromFarmArea = async (farm: FarmArea) => {
    setTab("search");
    setSearching(true);
    try {
      const res = await fetch(`/api/mls/farm-search?farmAreaId=${farm.id}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.properties);
        setTotalCount(data.totalCount);
      }
    } finally {
      setSearching(false);
    }
  };

  const saveFarmArea = async () => {
    if (!farmName) return;
    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: farmName,
        search_type: searchType,
        watch_rules: newRules.map((r) => ({
          ...r,
          threshold_value: r.threshold_value ? parseFloat(r.threshold_value) : null,
        })),
      };

      if (searchType === "zip") body.postal_codes = postalCodes.split(",").map((z) => z.trim());
      if (searchType === "tmk") body.tmk_prefix = tmkPrefix;
      if (minPrice) body.min_price = parseInt(minPrice);
      if (maxPrice) body.max_price = parseInt(maxPrice);
      if (minBeds) body.min_beds = parseInt(minBeds);
      if (propertyType) body.property_types = [propertyType];

      const res = await fetch("/api/mls/farm-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowCreateForm(false);
        setFarmName("");
        setNewRules([]);
        loadFarmAreas();
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteFarmArea = async (id: string) => {
    if (!confirm("Delete this farm area and all its watch rules?")) return;
    await fetch("/api/mls/farm-areas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadFarmAreas();
  };

  const updateAlertStatus = async (ids: string[], status: string) => {
    await fetch("/api/mls/watchdog-alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    });
    loadAlerts();
  };

  const addRule = () => {
    setNewRules([
      ...newRules,
      {
        trigger_type: "dom_threshold",
        threshold_value: "75",
        status_triggers: [],
        notify_push: true,
        notify_email: true,
        notify_sms: false,
      },
    ]);
  };

  const removeRule = (idx: number) => {
    setNewRules(newRules.filter((_, i) => i !== idx));
  };

  const updateRule = (idx: number, field: string, value: any) => {
    const updated = [...newRules];
    (updated[idx] as any)[field] = value;
    setNewRules(updated);
  };

  // Sort listings
  const sortedListings = [...listings].sort((a, b) => {
    switch (sortBy) {
      case "dom": return (b.DaysOnMarket || 0) - (a.DaysOnMarket || 0);
      case "priceAsc": return a.ListPrice - b.ListPrice;
      case "priceDesc": return b.ListPrice - a.ListPrice;
      case "priceDrop": return b._priceDropPct - a._priceDropPct;
      default: return 0;
    }
  });

  if (!trestleConnected) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Farm Area Search & MLS Watchdog</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">Trestle MLS is not connected</p>
          <p className="text-yellow-700 text-sm mb-4">
            Connect your Trestle MLS integration to search farm areas and set up watchdog alerts.
          </p>
          <Link
            href="/app/integrations"
            className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium no-underline hover:bg-indigo-700"
          >
            Go to Integrations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Farm Area Search & MLS Watchdog</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["search", "farms", "alerts"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "search" ? "Search" : t === "farms" ? "My Farm Areas" : "Alerts"}
            {t === "alerts" && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SEARCH TAB ─────────────────────────────────────────────── */}
      {tab === "search" && (
        <div>
          <form onSubmit={searchFarm} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* Search Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Search By</label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="zip">Zip Code</option>
                  <option value="tmk">TMK Area</option>
                </select>
              </div>

              {/* Location input */}
              {searchType === "zip" ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Zip Codes</label>
                  <input
                    type="text"
                    value={postalCodes}
                    onChange={(e) => setPostalCodes(e.target.value)}
                    placeholder="96815, 96816"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">TMK Prefix</label>
                  <input
                    type="text"
                    value={tmkPrefix}
                    onChange={(e) => setTmkPrefix(e.target.value)}
                    placeholder="1-5-3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* Price Range */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price Range</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="w-1/2 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-1/2 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Property Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="Residential">Residential</option>
                  <option value="Condominium">Condominium</option>
                  <option value="Land">Land</option>
                  <option value="Commercial">Commercial</option>
                  <option value="MultiFamily">Multi-Family</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Min Beds</label>
                <input
                  type="number"
                  value={minBeds}
                  onChange={(e) => setMinBeds(e.target.value)}
                  placeholder="Any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Min Days on Market</label>
                <input
                  type="number"
                  value={minDOM}
                  onChange={(e) => setMinDOM(e.target.value)}
                  placeholder="Any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="dom">Days on Market (High to Low)</option>
                  <option value="priceDrop">Price Drop % (High to Low)</option>
                  <option value="priceAsc">Price (Low to High)</option>
                  <option value="priceDesc">Price (High to Low)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={searching}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {searching ? "Searching..." : "Search Farm Area"}
                </button>
              </div>
            </div>
          </form>

          {/* Results */}
          {listings.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {totalCount} listing{totalCount !== 1 ? "s" : ""} found
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700"
              >
                Save as Farm Area + Set Alerts
              </button>
            </div>
          )}

          {/* Listing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedListings.map((listing) => (
              <ListingCard key={listing.ListingKey} listing={listing} />
            ))}
          </div>

          {listings.length === 0 && !searching && (
            <div className="text-center py-12 text-gray-400">
              Search a farm area to see active MLS listings
            </div>
          )}

          {/* Save Farm Area Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
                <h2 className="text-lg font-bold mb-4">Save Farm Area & Configure Alerts</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Farm Area Name</label>
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g. Kailua Beachside"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Watch Rules</label>
                    <button
                      onClick={addRule}
                      className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
                    >
                      + Add Rule
                    </button>
                  </div>

                  {newRules.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No watch rules — add rules to get alerts when listings change.</p>
                  )}

                  {newRules.map((rule, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 mb-2">
                      <div className="flex justify-between items-start mb-2">
                        <select
                          value={rule.trigger_type}
                          onChange={(e) => updateRule(idx, "trigger_type", e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="dom_threshold">Days on Market Threshold</option>
                          <option value="price_drop_amount">Price Drop ($ Amount)</option>
                          <option value="price_drop_pct">Price Drop (% from Original)</option>
                          <option value="status_change">Status Change</option>
                          <option value="new_listing">New Listing</option>
                        </select>
                        <button onClick={() => removeRule(idx)} className="text-red-400 text-xs hover:text-red-600">Remove</button>
                      </div>

                      {rule.trigger_type !== "new_listing" && rule.trigger_type !== "status_change" && (
                        <div className="mb-2">
                          <label className="block text-xs text-gray-500 mb-1">
                            {rule.trigger_type === "dom_threshold" ? "Days" :
                             rule.trigger_type === "price_drop_amount" ? "Dollar amount ($)" :
                             "Percentage (%)"}
                          </label>
                          <input
                            type="number"
                            value={rule.threshold_value}
                            onChange={(e) => updateRule(idx, "threshold_value", e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      )}

                      {rule.trigger_type === "status_change" && (
                        <div className="mb-2">
                          <label className="block text-xs text-gray-500 mb-1">Trigger on</label>
                          <div className="flex flex-wrap gap-2">
                            {["Expired", "Withdrawn", "Canceled", "Active"].map((s) => (
                              <label key={s} className="flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={rule.status_triggers.includes(s)}
                                  onChange={(e) => {
                                    const triggers = e.target.checked
                                      ? [...rule.status_triggers, s]
                                      : rule.status_triggers.filter((t) => t !== s);
                                    updateRule(idx, "status_triggers", triggers);
                                  }}
                                />
                                {s === "Active" ? "Back on Market" : s}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 text-xs">
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={rule.notify_push} onChange={(e) => updateRule(idx, "notify_push", e.target.checked)} />
                          Push
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={rule.notify_email} onChange={(e) => updateRule(idx, "notify_email", e.target.checked)} />
                          Email
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={rule.notify_sms} onChange={(e) => updateRule(idx, "notify_sms", e.target.checked)} />
                          SMS
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowCreateForm(false); setNewRules([]); }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveFarmArea}
                    disabled={saving || !farmName}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Farm Area"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FARMS TAB ──────────────────────────────────────────────── */}
      {tab === "farms" && (
        <div>
          {farmAreas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="mb-2">No farm areas saved yet</p>
              <p className="text-sm">Search for listings and save the area to create your first farm.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {farmAreas.map((farm) => (
                <div key={farm.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{farm.name}</h3>
                      <p className="text-sm text-gray-500">
                        {farm.search_type === "zip" && `Zip: ${farm.postal_codes?.join(", ")}`}
                        {farm.search_type === "tmk" && `TMK: ${farm.tmk_prefix}`}
                        {farm.search_type === "radius" && `Radius: ${farm.radius_miles} mi`}
                      </p>
                    </div>
                    {farm.unread_alerts > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {farm.unread_alerts} alert{farm.unread_alerts !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Watch Rules Summary */}
                  {farm.mls_watch_rules.length > 0 ? (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Watch Rules:</p>
                      <div className="flex flex-wrap gap-1">
                        {farm.mls_watch_rules.map((rule) => (
                          <span
                            key={rule.id}
                            className="inline-block px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full"
                          >
                            {formatRuleLabel(rule)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mb-3 italic">No watch rules configured</p>
                  )}

                  {/* Filters Summary */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {farm.min_price && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">${(farm.min_price / 1000).toFixed(0)}k+</span>}
                    {farm.max_price && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">${(farm.max_price / 1000).toFixed(0)}k max</span>}
                    {farm.min_beds && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{farm.min_beds}+ beds</span>}
                    {farm.property_types?.length > 0 && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{farm.property_types[0]}</span>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => searchFromFarmArea(farm)}
                      className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700"
                    >
                      View Listings
                    </button>
                    <button
                      onClick={() => deleteFarmArea(farm.id)}
                      className="text-sm text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ALERTS TAB ─────────────────────────────────────────────── */}
      {tab === "alerts" && (
        <div>
          {alerts.length > 0 && unreadCount > 0 && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => {
                  const newIds = alerts.filter((a) => a.status === "new").map((a) => a.id);
                  if (newIds.length > 0) updateAlertStatus(newIds, "viewed");
                }}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
              >
                Mark all as read
              </button>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="mb-2">No alerts yet</p>
              <p className="text-sm">Set up watch rules on your farm areas to receive alerts when listings change.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${
                    alert.status === "new" ? "border-indigo-300 bg-indigo-50/30" : "border-gray-200"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertIcon type={alert.alert_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${alert.status === "new" ? "text-gray-900" : "text-gray-600"}`}>
                      {alert.alert_title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(alert.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                      {alert.postal_code && ` · ${alert.postal_code}`}
                    </p>
                    {alert.alert_details && (
                      <AlertDetails type={alert.alert_type} details={alert.alert_details} />
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {alert.status === "new" && (
                      <button
                        onClick={() => updateAlertStatus([alert.id], "viewed")}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                        title="Mark as read"
                      >
                        Read
                      </button>
                    )}
                    <button
                      onClick={() => updateAlertStatus([alert.id], "dismissed")}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
                      title="Dismiss"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ListingCard({ listing }: { listing: MlsListing }) {
  const address =
    listing.UnparsedAddress ||
    [listing.StreetNumber, listing.StreetName, listing.StreetSuffix].filter(Boolean).join(" ") ||
    "Unknown";

  const photoUrl = listing.Media?.[0]?.MediaURL;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {photoUrl && (
        <div className="h-40 bg-gray-100 overflow-hidden">
          <img src={photoUrl} alt={address} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <p className="font-bold text-lg">${listing.ListPrice.toLocaleString()}</p>
          {listing._priceDropPct > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              -{listing._priceDropPct}%
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-1">{address}</p>
        <p className="text-xs text-gray-400">{listing.City}, {listing.PostalCode}</p>

        <div className="flex gap-3 mt-2 text-xs text-gray-500">
          {listing.BedroomsTotal && <span>{listing.BedroomsTotal} bd</span>}
          {listing.BathroomsTotalInteger && <span>{listing.BathroomsTotalInteger} ba</span>}
          {listing.LivingArea && <span>{listing.LivingArea.toLocaleString()} sqft</span>}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex gap-2">
            {listing.DaysOnMarket != null && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                listing.DaysOnMarket > 90 ? "bg-red-100 text-red-700" :
                listing.DaysOnMarket > 60 ? "bg-orange-100 text-orange-700" :
                listing.DaysOnMarket > 30 ? "bg-yellow-100 text-yellow-700" :
                "bg-green-100 text-green-700"
              }`}>
                {listing.DaysOnMarket} DOM
              </span>
            )}
            {listing._priceDrop > 0 && (
              <span className="text-xs text-red-600">
                -${listing._priceDrop.toLocaleString()} from ${listing._originalListPrice.toLocaleString()}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">{listing.PropertyType}</span>
        </div>

        {listing.ListAgentFullName && (
          <p className="text-xs text-gray-400 mt-2">
            {listing.ListAgentFullName}{listing.ListOfficeName ? ` · ${listing.ListOfficeName}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function AlertIcon({ type }: { type: string }) {
  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    dom_threshold: { bg: "bg-orange-100", text: "text-orange-600", icon: "clock" },
    price_drop_amount: { bg: "bg-red-100", text: "text-red-600", icon: "arrow-down" },
    price_drop_pct: { bg: "bg-red-100", text: "text-red-600", icon: "percent" },
    status_change: { bg: "bg-blue-100", text: "text-blue-600", icon: "refresh" },
    new_listing: { bg: "bg-green-100", text: "text-green-600", icon: "plus" },
  };

  const s = styles[type] || styles.new_listing;
  const icons: Record<string, string> = {
    clock: "\u23F0",
    "arrow-down": "\u2193",
    percent: "%",
    refresh: "\u21BB",
    plus: "+",
  };

  return (
    <div className={`w-8 h-8 rounded-full ${s.bg} ${s.text} flex items-center justify-center text-sm font-bold`}>
      {icons[s.icon] || "!"}
    </div>
  );
}

function AlertDetails({ type, details }: { type: string; details: Record<string, any> }) {
  if (type === "price_drop_amount" || type === "price_drop_pct") {
    return (
      <div className="flex gap-3 mt-1 text-xs text-gray-500">
        <span>Was ${details.previousPrice?.toLocaleString()}</span>
        <span>Now ${details.currentPrice?.toLocaleString()}</span>
        {details.totalDropPct && <span>Total drop: {details.totalDropPct}%</span>}
      </div>
    );
  }
  if (type === "dom_threshold") {
    return (
      <p className="text-xs text-gray-500 mt-1">
        {details.daysOnMarket} days on market (threshold: {details.threshold})
        {details.listPrice && ` · $${details.listPrice.toLocaleString()}`}
      </p>
    );
  }
  if (type === "status_change") {
    return (
      <p className="text-xs text-gray-500 mt-1">
        {details.previousStatus} &rarr; {details.newStatus}
        {details.listPrice && ` · $${details.listPrice.toLocaleString()}`}
      </p>
    );
  }
  if (type === "new_listing") {
    return (
      <p className="text-xs text-gray-500 mt-1">
        ${details.listPrice?.toLocaleString()}
        {details.beds && ` · ${details.beds} bd`}
        {details.baths && ` ${details.baths} ba`}
        {details.propertyType && ` · ${details.propertyType}`}
      </p>
    );
  }
  return null;
}

function formatRuleLabel(rule: WatchRule): string {
  switch (rule.trigger_type) {
    case "dom_threshold": return `DOM > ${rule.threshold_value}`;
    case "price_drop_amount": return `Drop > $${rule.threshold_value?.toLocaleString()}`;
    case "price_drop_pct": return `Drop > ${rule.threshold_value}%`;
    case "status_change": return `Status: ${rule.status_triggers.join(", ")}`;
    case "new_listing": return "New listings";
    default: return rule.trigger_type;
  }
}
