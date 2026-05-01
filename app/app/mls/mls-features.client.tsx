"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { calculateCMAAnalysis, type CMAAnalysis } from "@/lib/mls/cma-adjustments";

const CMAReportView = lazy(() => import("@/components/reports/cma-report-view"));

// ─── Type definitions ────────────────────────────────────────────────

interface CMAComp {
  listingKey: string;
  listingId: string;
  address: string;
  city: string;
  postalCode: string;
  status: string;
  listPrice: number;
  closePrice: number;
  pricePerSqft: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  yearBuilt: number;
  dom: number;
  onMarketDate: string;
  closeDate: string;
  photoUrl: string;
}

interface CMAStats {
  totalComps: number;
  activeComps: number;
  pendingComps: number;
  soldComps: number;
  avgListPrice: number;
  medianListPrice: number;
  avgClosePrice: number;
  medianClosePrice: number;
  avgPricePerSqft: number;
  medianPricePerSqft: number;
  avgDOM: number;
  medianDOM: number;
  suggestedPriceLow: number;
  suggestedPriceHigh: number;
  listToSaleRatio: number;
}

interface CMAReport {
  id?: string;
  subjectAddress: string;
  subjectCity: string;
  subjectPostalCode: string;
  subjectListPrice: number;
  subjectBeds: number;
  subjectBaths: number;
  subjectSqft: number;
  subjectYearBuilt: number;
  comps: CMAComp[];
  stats: CMAStats;
  generatedAt: string;
}

interface ListingMatch {
  leadId: string;
  leadName: string;
  listingKey: string;
  listingId: string;
  address: string;
  city: string;
  postalCode: string;
  listPrice: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  propertyType: string;
  photoUrl: string;
  matchScore: number;
  matchReasons: string[];
}

interface LeadMatchGroup {
  leadId: string;
  leadName: string;
  matches: ListingMatch[];
}

interface OpenHouseEvent {
  id: string;
  listingKey?: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  syncStatus: "synced" | "local" | "mls_import";
  source?: string;
}

interface SyncStatus {
  totalUpcoming: number;
  syncedFromMLS: number;
  localOnly: number;
  lastSyncTime?: string;
  events: OpenHouseEvent[];
}

interface SyncResult {
  pull?: {
    imported: number;
    updated: number;
    skipped: number;
    errors: number;
    details: string[];
  };
  push?: {
    unsyncedCount: number;
    events: OpenHouseEvent[];
  };
}

interface PropertyUnit {
  type: string;
  beds: number;
  baths: number;
  actualRent: number;
  proFormaRent: number;
  totalRent: number;
  garageSpaces: number;
  description: string;
}

interface InvestmentProperty {
  listingKey: string;
  listingId: string;
  address: string;
  listPrice: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  yearBuilt: number;
}

interface InvestmentData {
  property: InvestmentProperty;
  units: PropertyUnit[];
  totals: {
    unitCount: number;
    totalActualRent: number;
    totalProFormaRent: number;
    avgRentPerUnit: number;
  };
  brrrAutoFill: {
    name: string;
    address: string;
    numberOfUnits: number;
    purchasePrice: number;
    monthlyRent: number;
    afterRepairValue: number;
  };
  flipAutoFill: {
    name: string;
    address: string;
    purchasePrice: number;
    afterRepairValue: number;
  };
}

// ─── Tabs ────────────────────────────────────────────────────────────

type TabKey = "cma" | "lead-matches" | "open-house" | "investment";

const TABS: { key: TabKey; label: string }[] = [
  { key: "cma", label: "CMA Generator" },
  { key: "lead-matches", label: "Lead Matches" },
  { key: "open-house", label: "Open House Sync" },
  { key: "investment", label: "Investment Analyzer" },
];

const PROPERTY_TYPES = [
  "Single Family",
  "Condominium",
  "Townhouse",
  "Residential Income",
  "Multi-Family",
  "Commercial",
  "Land",
  "Farm",
];

// ─── Helpers ─────────────────────────────────────────────────────────

const formatPrice = (price: number | undefined | null): string => {
  if (price == null || isNaN(price)) return "--";
  return "$" + price.toLocaleString();
};

const formatPriceShort = (price: number | undefined | null): string => {
  if (price == null || isNaN(price)) return "--";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`;
  return "$" + price.toLocaleString();
};

const formatPercent = (value: number | undefined | null): string => {
  if (value == null || isNaN(value)) return "--";
  return (value * 100).toFixed(1) + "%";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return { bg: "#dcfce7", text: "#16a34a" };
    case "Pending":
      return { bg: "#fef3c7", text: "#d97706" };
    case "Closed":
    case "Sold":
      return { bg: "#e0e7ff", text: "#4f46e5" };
    default:
      return { bg: "#f3f4f6", text: "#6b7280" };
  }
};

const getMatchScoreColor = (score: number) => {
  if (score >= 70) return { bg: "#dcfce7", text: "#16a34a" };
  if (score >= 40) return { bg: "#fef3c7", text: "#d97706" };
  return { bg: "#ffedd5", text: "#ea580c" };
};

const getSyncBadge = (status: string) => {
  switch (status) {
    case "synced":
      return { bg: "#dcfce7", text: "#16a34a", label: "Synced" };
    case "local":
      return { bg: "#fef3c7", text: "#d97706", label: "Local Only" };
    case "mls_import":
      return { bg: "#e0e7ff", text: "#4f46e5", label: "MLS Import" };
    default:
      return { bg: "#f3f4f6", text: "#6b7280", label: status };
  }
};

// ─── Component ───────────────────────────────────────────────────────

export default function MLSFeaturesClient({ initialTab }: { initialTab?: string }) {
  const resolveTab = (t?: string): TabKey => {
    if (t === "matches" || t === "lead-matches") return "lead-matches";
    if (t === "sync" || t === "open-house") return "open-house";
    if (t === "investment") return "investment";
    return "cma";
  };
  const [activeTab, setActiveTab] = useState<TabKey>(resolveTab(initialTab));

  useEffect(() => {
    setActiveTab(resolveTab(initialTab));
  }, [initialTab]);

  // ═══ CMA Generator State ═══
  const [cmaForm, setCmaForm] = useState({
    postalCode: "",
    city: "",
    address: "",
    listPrice: "",
    beds: "",
    baths: "",
    sqft: "",
    yearBuilt: "",
    propertyType: "",
  });
  const [cmaReport, setCmaReport] = useState<CMAReport | null>(null);
  const [cmaLoading, setCmaLoading] = useState(false);
  const [cmaError, setCmaError] = useState("");
  const [cmaSaving, setCmaSaving] = useState(false);
  const [cmaSaveSuccess, setCmaSaveSuccess] = useState(false);
  const [savedCMAs, setSavedCMAs] = useState<CMAReport[]>([]);
  const [savedCMAsLoading, setSavedCMAsLoading] = useState(false);
  const [savedCMAsError, setSavedCMAsError] = useState("");

  // ═══ Lead Matches State ═══
  const [leadMatches, setLeadMatches] = useState<LeadMatchGroup[]>([]);
  const [leadMatchStats, setLeadMatchStats] = useState({
    totalLeads: 0,
    totalListings: 0,
    matchCount: 0,
  });
  const [leadMatchLoading, setLeadMatchLoading] = useState(false);
  const [leadMatchError, setLeadMatchError] = useState("");
  const [hasRunMatching, setHasRunMatching] = useState(false);

  // ═══ Open House Sync State ═══
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);
  const [syncStatusError, setSyncStatusError] = useState("");
  const [syncActionLoading, setSyncActionLoading] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncActionError, setSyncActionError] = useState("");

  // ═══ Investment Analyzer State ═══
  const [investmentQuery, setInvestmentQuery] = useState("");
  const [investmentData, setInvestmentData] = useState<InvestmentData | null>(null);
  const [investmentLoading, setInvestmentLoading] = useState(false);
  const [investmentError, setInvestmentError] = useState("");

  // ═══ CMA: Fetch saved CMAs on mount ═══
  const fetchSavedCMAs = useCallback(async () => {
    setSavedCMAsLoading(true);
    setSavedCMAsError("");
    try {
      const response = await fetch("/api/mls/cma");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load saved CMAs");
      }
      setSavedCMAs(data.reports || data || []);
    } catch (err) {
      setSavedCMAsError(err instanceof Error ? err.message : "Failed to load saved CMAs");
    } finally {
      setSavedCMAsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "cma") {
      fetchSavedCMAs();
    }
  }, [activeTab, fetchSavedCMAs]);

  // ═══ CMA: Generate report ═══
  const generateCMA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmaForm.postalCode.trim()) {
      setCmaError("Postal code is required.");
      return;
    }

    setCmaLoading(true);
    setCmaError("");
    setCmaReport(null);
    setCmaSaveSuccess(false);

    try {
      const body: Record<string, unknown> = {
        postalCode: cmaForm.postalCode.trim(),
      };
      if (cmaForm.city.trim()) body.city = cmaForm.city.trim();
      if (cmaForm.address.trim()) body.address = cmaForm.address.trim();
      if (cmaForm.listPrice) body.listPrice = parseFloat(cmaForm.listPrice);
      if (cmaForm.beds) body.beds = parseInt(cmaForm.beds);
      if (cmaForm.baths) body.baths = parseInt(cmaForm.baths);
      if (cmaForm.sqft) body.sqft = parseInt(cmaForm.sqft);
      if (cmaForm.yearBuilt) body.yearBuilt = parseInt(cmaForm.yearBuilt);
      if (cmaForm.propertyType) body.propertyType = cmaForm.propertyType;

      const response = await fetch("/api/mls/cma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate CMA");
      }

      setCmaReport(data.report || data);
    } catch (err) {
      setCmaError(err instanceof Error ? err.message : "Failed to generate CMA");
    } finally {
      setCmaLoading(false);
    }
  };

  // ═══ CMA: Save report ═══
  const saveCMAReport = async () => {
    if (!cmaReport) return;
    setCmaSaving(true);
    setCmaSaveSuccess(false);

    try {
      const body: Record<string, unknown> = {
        postalCode: cmaReport.subjectPostalCode || cmaForm.postalCode.trim(),
        save: true,
      };
      if (cmaReport.subjectCity || cmaForm.city.trim()) body.city = cmaReport.subjectCity || cmaForm.city.trim();
      if (cmaReport.subjectAddress || cmaForm.address.trim())
        body.address = cmaReport.subjectAddress || cmaForm.address.trim();
      if (cmaReport.subjectListPrice || cmaForm.listPrice)
        body.listPrice = cmaReport.subjectListPrice || parseFloat(cmaForm.listPrice);
      if (cmaReport.subjectBeds || cmaForm.beds) body.beds = cmaReport.subjectBeds || parseInt(cmaForm.beds);
      if (cmaReport.subjectBaths || cmaForm.baths) body.baths = cmaReport.subjectBaths || parseInt(cmaForm.baths);
      if (cmaReport.subjectSqft || cmaForm.sqft) body.sqft = cmaReport.subjectSqft || parseInt(cmaForm.sqft);
      if (cmaReport.subjectYearBuilt || cmaForm.yearBuilt)
        body.yearBuilt = cmaReport.subjectYearBuilt || parseInt(cmaForm.yearBuilt);
      if (cmaForm.propertyType) body.propertyType = cmaForm.propertyType;

      const response = await fetch("/api/mls/cma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save CMA");
      }

      setCmaSaveSuccess(true);
      fetchSavedCMAs();
    } catch (err) {
      setCmaError(err instanceof Error ? err.message : "Failed to save CMA report");
    } finally {
      setCmaSaving(false);
    }
  };

  // ═══ Lead Matches: Run matching ═══
  const runLeadMatching = async () => {
    setLeadMatchLoading(true);
    setLeadMatchError("");
    setLeadMatches([]);
    setHasRunMatching(true);

    try {
      const response = await fetch("/api/mls/lead-matches?save=true");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run lead matching");
      }

      const allMatches: ListingMatch[] = data.matches || [];
      setLeadMatchStats({
        totalLeads: data.totalLeads || 0,
        totalListings: data.totalListings || 0,
        matchCount: data.matchCount || allMatches.length,
      });

      // Group matches by lead
      const grouped: Record<string, LeadMatchGroup> = {};
      allMatches.forEach((m) => {
        if (!grouped[m.leadId]) {
          grouped[m.leadId] = {
            leadId: m.leadId,
            leadName: m.leadName,
            matches: [],
          };
        }
        grouped[m.leadId].matches.push(m);
      });

      setLeadMatches(Object.values(grouped));
    } catch (err) {
      setLeadMatchError(err instanceof Error ? err.message : "Failed to run lead matching");
    } finally {
      setLeadMatchLoading(false);
    }
  };

  // ═══ Open House: Fetch sync status ═══
  const fetchSyncStatus = useCallback(async () => {
    setSyncStatusLoading(true);
    setSyncStatusError("");

    try {
      const response = await fetch("/api/mls/sync-open-houses");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load sync status");
      }

      setSyncStatus({
        totalUpcoming: data.totalUpcoming || 0,
        syncedFromMLS: data.syncedFromMLS || 0,
        localOnly: data.localOnly || 0,
        lastSyncTime: data.lastSyncTime,
        events: data.events || [],
      });
    } catch (err) {
      setSyncStatusError(err instanceof Error ? err.message : "Failed to load sync status");
    } finally {
      setSyncStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "open-house") {
      fetchSyncStatus();
    }
  }, [activeTab, fetchSyncStatus]);

  // ═══ Open House: Perform sync ═══
  const performSync = async (direction: "pull" | "push" | "both") => {
    setSyncActionLoading(direction);
    setSyncActionError("");
    setSyncResult(null);

    try {
      const response = await fetch("/api/mls/sync-open-houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      setSyncResult(data);
      fetchSyncStatus();
    } catch (err) {
      setSyncActionError(err instanceof Error ? err.message : "Sync operation failed");
    } finally {
      setSyncActionLoading("");
    }
  };

  // ═══ Investment: Fetch property data ═══
  const fetchPropertyUnits = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = investmentQuery.trim();
    if (!q) {
      setInvestmentError("Please enter an MLS number.");
      return;
    }

    setInvestmentLoading(true);
    setInvestmentError("");
    setInvestmentData(null);

    try {
      // Try listingId first, fall back to listingKey
      const params = new URLSearchParams();
      params.append("listingId", q);

      const response = await fetch(`/api/mls/property-units?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch property data");
      }

      setInvestmentData(data);
    } catch (err) {
      setInvestmentError(err instanceof Error ? err.message : "Failed to fetch property data");
    } finally {
      setInvestmentLoading(false);
    }
  };

  // ═══ Investment: Build analyzer links ═══
  const getBrrrLink = (): string => {
    if (!investmentData) return "/app/analyzers/brrr";
    const p = investmentData.brrrAutoFill;
    const params = new URLSearchParams();
    if (p.name) params.append("name", p.name);
    if (p.address) params.append("address", p.address);
    if (p.numberOfUnits) params.append("numberOfUnits", String(p.numberOfUnits));
    if (p.purchasePrice) params.append("purchasePrice", String(p.purchasePrice));
    if (p.monthlyRent) params.append("monthlyRent", String(p.monthlyRent));
    if (p.afterRepairValue) params.append("afterRepairValue", String(p.afterRepairValue));
    return `/app/analyzers/brrr?${params.toString()}`;
  };

  const getFlipLink = (): string => {
    if (!investmentData) return "/app/analyzers/flip";
    const p = investmentData.flipAutoFill;
    const params = new URLSearchParams();
    if (p.name) params.append("name", p.name);
    if (p.address) params.append("address", p.address);
    if (p.purchasePrice) params.append("purchasePrice", String(p.purchasePrice));
    if (p.afterRepairValue) params.append("afterRepairValue", String(p.afterRepairValue));
    return `/app/analyzers/flip?${params.toString()}`;
  };

  // ─── Shared style objects ──────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
    color: "hsl(var(--foreground))",
  };

  const primaryBtnStyle: React.CSSProperties = {
    padding: "10px 20px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  };

  const successBtnStyle: React.CSSProperties = {
    padding: "10px 20px",
    background: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  };

  const cardStyle: React.CSSProperties = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    padding: 20,
  };

  const statCardStyle: React.CSSProperties = {
    background: "hsl(var(--muted))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    padding: 16,
    textAlign: "center" as const,
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div>
      {/* ════════════════════════════════════════════════════════════════
          TAB 1: CMA Generator
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "cma" && (
        <div>
          {/* CMA Form */}
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}>
              Comparative Market Analysis
            </h3>
            <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", marginBottom: 16 }}>
              Enter subject property details to find comparable listings and generate a CMA report.
            </p>

            <form onSubmit={generateCMA}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Postal Code <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 90210"
                    value={cmaForm.postalCode}
                    onChange={(e) => setCmaForm({ ...cmaForm, postalCode: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input
                    type="text"
                    placeholder="e.g. Beverly Hills"
                    value={cmaForm.city}
                    onChange={(e) => setCmaForm({ ...cmaForm, city: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Address</label>
                  <input
                    type="text"
                    placeholder="Subject property address"
                    value={cmaForm.address}
                    onChange={(e) => setCmaForm({ ...cmaForm, address: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>List Price</label>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={cmaForm.listPrice}
                    onChange={(e) => setCmaForm({ ...cmaForm, listPrice: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Beds</label>
                  <input
                    type="number"
                    placeholder="e.g. 3"
                    value={cmaForm.beds}
                    onChange={(e) => setCmaForm({ ...cmaForm, beds: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Baths</label>
                  <input
                    type="number"
                    placeholder="e.g. 2"
                    value={cmaForm.baths}
                    onChange={(e) => setCmaForm({ ...cmaForm, baths: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sqft</label>
                  <input
                    type="number"
                    placeholder="e.g. 1800"
                    value={cmaForm.sqft}
                    onChange={(e) => setCmaForm({ ...cmaForm, sqft: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Year Built</label>
                  <input
                    type="number"
                    placeholder="e.g. 1990"
                    value={cmaForm.yearBuilt}
                    onChange={(e) => setCmaForm({ ...cmaForm, yearBuilt: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Property Type</label>
                  <select
                    value={cmaForm.propertyType}
                    onChange={(e) => setCmaForm({ ...cmaForm, propertyType: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Any</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={cmaLoading}
                style={{
                  ...primaryBtnStyle,
                  opacity: cmaLoading ? 0.7 : 1,
                  cursor: cmaLoading ? "wait" : "pointer",
                }}
              >
                {cmaLoading ? "Generating CMA..." : "Generate CMA"}
              </button>
            </form>
          </div>

          {/* CMA Error */}
          {cmaError && (
            <div
              style={{
                padding: 16,
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              {cmaError}
            </div>
          )}

          {/* CMA Loading */}
          {cmaLoading && (
            <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))" }}>
              Generating CMA report... Searching for comparable properties.
            </div>
          )}

          {/* CMA Results -- Full Report View */}
          {cmaReport && !cmaLoading && (
            <div style={{ marginBottom: 24 }}>
              {/* Action Bar */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <button
                  onClick={saveCMAReport}
                  disabled={cmaSaving || cmaSaveSuccess}
                  style={{
                    ...successBtnStyle,
                    opacity: cmaSaving ? 0.7 : 1,
                    cursor: cmaSaving ? "wait" : cmaSaveSuccess ? "default" : "pointer",
                    background: cmaSaveSuccess ? "#16a34a" : "#10b981",
                  }}
                >
                  {cmaSaving ? "Saving..." : cmaSaveSuccess ? "Saved!" : "Save Report"}
                </button>
                <button
                  onClick={() => window.print()}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", cursor: "pointer" }}
                >
                  Print Report
                </button>
              </div>

              {/* Full CMA Report */}
              {(() => {
                // Build CMA analysis with adjustments from comps
                const subject = {
                  address: cmaReport.subjectAddress || "",
                  beds: cmaReport.subjectBeds || 0,
                  baths: cmaReport.subjectBaths || 0,
                  sqft: cmaReport.subjectSqft || 0,
                  yearBuilt: cmaReport.subjectYearBuilt || undefined,
                  propertyType: (cmaReport as any).subjectPropertyType || undefined,
                };
                const compProps = (cmaReport.comps || []).map((c: CMAComp) => ({
                  address: c.address,
                  city: c.city,
                  status: c.status,
                  listPrice: c.listPrice,
                  closePrice: c.closePrice,
                  beds: c.bedrooms,
                  baths: c.bathrooms,
                  sqft: c.livingArea,
                  yearBuilt: c.yearBuilt,
                  dom: c.dom,
                  closeDate: c.closeDate,
                  photoUrl: c.photoUrl,
                }));
                const analysis = compProps.length > 0 ? calculateCMAAnalysis(subject, compProps) : null;

                return analysis ? (
                  <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Loading report...</div>}>
                    <div style={{ background: "hsl(var(--card))", borderRadius: 12, overflow: "hidden", border: "1px solid hsl(var(--border))" }}>
                      <CMAReportView
                        analysis={analysis}
                        branding={{ displayName: "Agent", email: "" }}
                        avmValue={cmaReport.subjectListPrice || undefined}
                      />
                    </div>
                  </Suspense>
                ) : (
                  <div style={{ padding: 20, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>No comps available for analysis.</div>
                );
              })()}
            </div>
          )}

          {/* Saved CMAs */}
          <div style={{ ...cardStyle, marginTop: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 12 }}>Saved CMA Reports</h3>

            {savedCMAsLoading && (
              <div style={{ textAlign: "center", padding: 20, color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
                Loading saved reports...
              </div>
            )}

            {savedCMAsError && (
              <div
                style={{
                  padding: 12,
                  background: "#fee2e2",
                  color: "#dc2626",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                {savedCMAsError}
              </div>
            )}

            {!savedCMAsLoading && !savedCMAsError && savedCMAs.length === 0 && (
              <div style={{ textAlign: "center", padding: 24, color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
                No saved CMA reports yet. Generate a CMA above and save it.
              </div>
            )}

            {!savedCMAsLoading && savedCMAs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {savedCMAs.map((report, idx) => (
                  <div
                    key={report.id || idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "hsl(var(--muted))",
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onClick={() => {
                      setCmaReport(report);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--foreground))" }}>
                        {report.subjectAddress || report.subjectPostalCode}
                      </div>
                      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                        {[report.subjectCity, report.subjectPostalCode].filter(Boolean).join(", ")}
                        {report.stats ? ` | ${report.stats.totalComps} comps` : ""}
                        {report.subjectListPrice ? ` | ${formatPriceShort(report.subjectListPrice)}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                      {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2: Lead Matches
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "lead-matches" && (
        <div>
          {/* Header + Run Button */}
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}>
                  Lead-to-Listing Matching
                </h3>
                <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>
                  Match your leads to active MLS listings based on their preferences and criteria.
                </p>
              </div>
              <button
                onClick={runLeadMatching}
                disabled={leadMatchLoading}
                style={{
                  ...primaryBtnStyle,
                  opacity: leadMatchLoading ? 0.7 : 1,
                  cursor: leadMatchLoading ? "wait" : "pointer",
                }}
              >
                {leadMatchLoading ? "Running..." : "Run Matching"}
              </button>
            </div>
          </div>

          {/* Error */}
          {leadMatchError && (
            <div
              style={{
                padding: 16,
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              {leadMatchError}
            </div>
          )}

          {/* Loading */}
          {leadMatchLoading && (
            <div style={{ textAlign: "center", padding: 48, color: "hsl(var(--muted-foreground))" }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Scanning MLS listings...</div>
              <div style={{ fontSize: 14 }}>
                Comparing lead preferences against active listings. This may take a moment.
              </div>
            </div>
          )}

          {/* No results */}
          {!leadMatchLoading && hasRunMatching && leadMatches.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 48,
                background: "hsl(var(--muted))",
                borderRadius: 12,
                color: "hsl(var(--muted-foreground))",
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "hsl(var(--foreground))" }}>No Matches Found</p>
              <p style={{ fontSize: 14 }}>
                No leads matched any active MLS listings. Ensure your leads have preferences set (location, price range,
                beds/baths).
              </p>
            </div>
          )}

          {/* Stats bar */}
          {!leadMatchLoading && hasRunMatching && leadMatches.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 16,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              <div style={statCardStyle}>
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Total Leads</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "hsl(var(--foreground))" }}>{leadMatchStats.totalLeads}</div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Listings Scanned</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "hsl(var(--foreground))" }}>{leadMatchStats.totalListings}</div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Matches Found</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#3b82f6" }}>{leadMatchStats.matchCount}</div>
              </div>
            </div>
          )}

          {/* Match groups */}
          {!leadMatchLoading && leadMatches.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {leadMatches.map((group) => (
                <div key={group.leadId} style={cardStyle}>
                  {/* Lead header */}
                  <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#3b82f6",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {group.leadName
                          ? group.leadName
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)
                          : "?"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "hsl(var(--foreground))" }}>
                          {group.leadName || "Unknown Lead"}
                        </div>
                        <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                          {group.matches.length} matching listing{group.matches.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Matched listings */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                      gap: 14,
                    }}
                  >
                    {group.matches.map((match) => {
                      const scoreColor = getMatchScoreColor(match.matchScore);
                      return (
                        <div
                          key={`${match.leadId}-${match.listingKey}`}
                          style={{
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 10,
                            overflow: "hidden",
                            background: "hsl(var(--card))",
                          }}
                        >
                          {/* Photo */}
                          <div
                            style={{
                              height: 140,
                              background: match.photoUrl ? `url(${match.photoUrl}) center/cover` : "#e5e7eb",
                              position: "relative",
                            }}
                          >
                            {!match.photoUrl && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  height: "100%",
                                  color: "hsl(var(--muted-foreground))",
                                  fontSize: 13,
                                }}
                              >
                                No Photo
                              </div>
                            )}
                            {/* Match score badge */}
                            <span
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                padding: "4px 10px",
                                background: scoreColor.bg,
                                color: scoreColor.text,
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {match.matchScore}% match
                            </span>
                          </div>

                          <div style={{ padding: 14 }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 2 }}>
                              {formatPrice(match.listPrice)}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))", marginBottom: 2 }}>
                              {match.address}
                            </div>
                            <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 8 }}>
                              {match.city}, {match.postalCode}
                            </div>

                            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 10 }}>
                              {match.bedrooms != null && (
                                <span>
                                  <strong>{match.bedrooms}</strong> bed
                                </span>
                              )}
                              {match.bathrooms != null && (
                                <span>
                                  <strong>{match.bathrooms}</strong> bath
                                </span>
                              )}
                              {match.livingArea != null && (
                                <span>
                                  <strong>{match.livingArea.toLocaleString()}</strong> sqft
                                </span>
                              )}
                              {match.propertyType && <span>{match.propertyType}</span>}
                            </div>

                            {/* Match reasons */}
                            {match.matchReasons && match.matchReasons.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {match.matchReasons.map((reason, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      padding: "2px 8px",
                                      background: "#eff6ff",
                                      color: "#3b82f6",
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div style={{ marginTop: 8, fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                              MLS# {match.listingId || match.listingKey}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Initial state - not yet run */}
          {!leadMatchLoading && !hasRunMatching && (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                background: "hsl(var(--muted))",
                borderRadius: 12,
                color: "hsl(var(--muted-foreground))",
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "hsl(var(--foreground))" }}>
                Match Leads to Listings
              </p>
              <p style={{ fontSize: 14, maxWidth: 440, margin: "0 auto" }}>
                Click &quot;Run Matching&quot; to scan active MLS listings and match them to your leads based on their
                preferences, location, price range, and property criteria.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 3: Open House Sync
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "open-house" && (
        <div>
          {/* Sync Status Dashboard */}
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}>Open House Sync</h3>
                <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>
                  Bi-directional sync between your local open house events and MLS open house data.
                </p>
              </div>
            </div>

            {syncStatusLoading && (
              <div style={{ textAlign: "center", padding: 20, color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
                Loading sync status...
              </div>
            )}

            {syncStatusError && (
              <div
                style={{
                  padding: 12,
                  background: "#fee2e2",
                  color: "#dc2626",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                {syncStatusError}
              </div>
            )}

            {!syncStatusLoading && syncStatus && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 12,
                }}
              >
                <div style={statCardStyle}>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Total Upcoming</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "hsl(var(--foreground))" }}>{syncStatus.totalUpcoming}</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Synced from MLS</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a" }}>{syncStatus.syncedFromMLS}</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Local Only</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#d97706" }}>{syncStatus.localOnly}</div>
                </div>
                <div style={statCardStyle}>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Last Sync</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                    {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : "Never"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sync Actions */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <button
              onClick={() => performSync("pull")}
              disabled={!!syncActionLoading}
              style={{
                ...primaryBtnStyle,
                opacity: syncActionLoading ? 0.7 : 1,
                cursor: syncActionLoading ? "wait" : "pointer",
              }}
            >
              {syncActionLoading === "pull" ? "Pulling..." : "Pull from MLS"}
            </button>
            <button
              onClick={() => performSync("push")}
              disabled={!!syncActionLoading}
              style={{
                ...successBtnStyle,
                opacity: syncActionLoading ? 0.7 : 1,
                cursor: syncActionLoading ? "wait" : "pointer",
              }}
            >
              {syncActionLoading === "push" ? "Pushing..." : "Push to MLS"}
            </button>
            <button
              onClick={() => performSync("both")}
              disabled={!!syncActionLoading}
              style={{
                padding: "10px 20px",
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: syncActionLoading ? "wait" : "pointer",
                fontSize: 14,
                opacity: syncActionLoading ? 0.7 : 1,
              }}
            >
              {syncActionLoading === "both" ? "Syncing..." : "Sync Both Ways"}
            </button>
          </div>

          {/* Sync Action Error */}
          {syncActionError && (
            <div
              style={{
                padding: 16,
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              {syncActionError}
            </div>
          )}

          {/* Sync Result Summary */}
          {syncResult && (
            <div style={{ ...cardStyle, marginBottom: 20, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "#16a34a", marginBottom: 12 }}>Sync Complete</h4>

              {syncResult.pull && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--foreground))", marginBottom: 6 }}>Pull Results</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "hsl(var(--foreground))" }}>
                    <span>
                      <strong style={{ color: "#16a34a" }}>{syncResult.pull.imported}</strong> imported
                    </span>
                    <span>
                      <strong style={{ color: "#3b82f6" }}>{syncResult.pull.updated}</strong> updated
                    </span>
                    <span>
                      <strong style={{ color: "hsl(var(--muted-foreground))" }}>{syncResult.pull.skipped}</strong> skipped
                    </span>
                    {syncResult.pull.errors > 0 && (
                      <span>
                        <strong style={{ color: "#dc2626" }}>{syncResult.pull.errors}</strong> errors
                      </span>
                    )}
                  </div>
                  {syncResult.pull.details && syncResult.pull.details.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                      {syncResult.pull.details.map((d, i) => (
                        <div key={i}>{d}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {syncResult.push && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--foreground))", marginBottom: 6 }}>Push Results</div>
                  <div style={{ fontSize: 13, color: "hsl(var(--foreground))" }}>
                    <strong>{syncResult.push.unsyncedCount}</strong> local event
                    {syncResult.push.unsyncedCount !== 1 ? "s" : ""} available for push
                  </div>
                  {syncResult.push.events && syncResult.push.events.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {syncResult.push.events.map((ev, i) => (
                        <div key={i} style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                          {ev.address} - {new Date(ev.date).toLocaleDateString()} {ev.startTime} - {ev.endTime}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Event List */}
          {!syncStatusLoading && syncStatus && syncStatus.events.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 14 }}>
                Upcoming Open Houses
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {syncStatus.events.map((event) => {
                  const badge = getSyncBadge(event.syncStatus);
                  return (
                    <div
                      key={event.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 16px",
                        background: "hsl(var(--muted))",
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--foreground))" }}>{event.address}</div>
                        <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                          {new Date(event.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          {event.startTime} - {event.endTime}
                        </div>
                        {event.listingKey && (
                          <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>MLS# {event.listingKey}</div>
                        )}
                      </div>
                      <span
                        style={{
                          padding: "4px 10px",
                          background: badge.bg,
                          color: badge.text,
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!syncStatusLoading && syncStatus && syncStatus.events.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 48,
                background: "hsl(var(--muted))",
                borderRadius: 12,
                color: "hsl(var(--muted-foreground))",
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "hsl(var(--foreground))" }}>
                No Upcoming Open Houses
              </p>
              <p style={{ fontSize: 14 }}>Pull from MLS to import open house events, or create local events first.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 4: Investment Analyzer
         ════════════════════════════════════════════════════════════════ */}
      {activeTab === "investment" && (
        <div>
          {/* Search Card */}
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}>Investment Analyzer</h3>
            <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", marginBottom: 16 }}>
              Fetch MLS property and unit data, then import it into the BRRR or Flip analyzer with one click.
            </p>

            <form onSubmit={fetchPropertyUnits} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <input
                  type="text"
                  placeholder="Enter MLS number (Listing ID or Key)..."
                  value={investmentQuery}
                  onChange={(e) => setInvestmentQuery(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={investmentLoading}
                style={{
                  ...primaryBtnStyle,
                  opacity: investmentLoading ? 0.7 : 1,
                  cursor: investmentLoading ? "wait" : "pointer",
                }}
              >
                {investmentLoading ? "Fetching..." : "Fetch Property Data"}
              </button>
            </form>
          </div>

          {/* Error */}
          {investmentError && (
            <div
              style={{
                padding: 16,
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              {investmentError}
            </div>
          )}

          {/* Loading */}
          {investmentLoading && (
            <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))" }}>
              Fetching property and unit data from MLS...
            </div>
          )}

          {/* Property Data */}
          {investmentData && !investmentLoading && (
            <div>
              {/* Property Summary */}
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 12 }}>Property Summary</h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>Address</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                      {investmentData.property.address}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>List Price</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--foreground))" }}>
                      {formatPrice(investmentData.property.listPrice)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>Type</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                      {investmentData.property.propertyType}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>Beds / Baths</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                      {investmentData.property.bedrooms ?? "--"} / {investmentData.property.bathrooms ?? "--"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>Sqft</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                      {investmentData.property.livingArea ? investmentData.property.livingArea.toLocaleString() : "--"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>Year Built</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
                      {investmentData.property.yearBuilt ?? "--"}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                  MLS# {investmentData.property.listingId || investmentData.property.listingKey}
                </div>
              </div>

              {/* Unit Breakdown */}
              {investmentData.units && investmentData.units.length > 0 && (
                <div style={{ ...cardStyle, marginBottom: 20, padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px 0" }}>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}>Unit Breakdown</h4>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <thead>
                        <tr style={{ background: "hsl(var(--muted))" }}>
                          <th
                            style={{
                              padding: "12px 14px",
                              textAlign: "left",
                              fontWeight: 600,
                              color: "hsl(var(--foreground))",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Unit
                          </th>
                          <th
                            style={{
                              padding: "12px 14px",
                              textAlign: "center",
                              fontWeight: 600,
                              color: "hsl(var(--foreground))",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Beds
                          </th>
                          <th
                            style={{
                              padding: "12px 14px",
                              textAlign: "center",
                              fontWeight: 600,
                              color: "hsl(var(--foreground))",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Baths
                          </th>
                          <th
                            style={{
                              padding: "12px 14px",
                              textAlign: "right",
                              fontWeight: 600,
                              color: "hsl(var(--foreground))",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Actual Rent
                          </th>
                          <th
                            style={{
                              padding: "12px 14px",
                              textAlign: "right",
                              fontWeight: 600,
                              color: "hsl(var(--foreground))",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Pro Forma Rent
                          </th>
                          <th
                            style={{
                              padding: "12px 14px",
                              textAlign: "left",
                              fontWeight: 600,
                              color: "hsl(var(--foreground))",
                              borderBottom: "1px solid #e5e7eb",
                            }}
                          >
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {investmentData.units.map((unit, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 500, color: "hsl(var(--foreground))" }}>
                              {unit.type || `Unit ${idx + 1}`}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center", color: "hsl(var(--foreground))" }}>
                              {unit.beds ?? "--"}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "center", color: "hsl(var(--foreground))" }}>
                              {unit.baths ?? "--"}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "right", color: "hsl(var(--foreground))", fontWeight: 500 }}>
                              {formatPrice(unit.actualRent)}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "right", color: "hsl(var(--foreground))" }}>
                              {formatPrice(unit.proFormaRent)}
                            </td>
                            <td style={{ padding: "10px 14px", color: "hsl(var(--muted-foreground))", fontSize: 12 }}>
                              {unit.description || "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals Summary */}
              {investmentData.totals && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div style={statCardStyle}>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Total Units</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "hsl(var(--foreground))" }}>
                      {investmentData.totals.unitCount}
                    </div>
                  </div>
                  <div style={statCardStyle}>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Total Actual Rent</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>
                      {formatPrice(investmentData.totals.totalActualRent)}
                    </div>
                    <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>per month</div>
                  </div>
                  <div style={statCardStyle}>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Total Pro Forma</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>
                      {formatPrice(investmentData.totals.totalProFormaRent)}
                    </div>
                    <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>per month</div>
                  </div>
                  <div style={statCardStyle}>
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 4 }}>Avg Rent / Unit</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "hsl(var(--foreground))" }}>
                      {formatPrice(investmentData.totals.avgRentPerUnit)}
                    </div>
                    <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>per month</div>
                  </div>
                </div>
              )}

              {/* Analyzer Action Buttons */}
              <div style={{ ...cardStyle, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 4 }}>
                    Import into Analyzer
                  </h4>
                  <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                    Property data will be auto-filled into the selected analyzer.
                  </p>
                </div>
                <a
                  href={getBrrrLink()}
                  style={{
                    ...primaryBtnStyle,
                    textDecoration: "none",
                    display: "inline-block",
                    textAlign: "center" as const,
                  }}
                >
                  Open in BRRR Analyzer
                </a>
                <a
                  href={getFlipLink()}
                  style={{
                    ...successBtnStyle,
                    textDecoration: "none",
                    display: "inline-block",
                    textAlign: "center" as const,
                  }}
                >
                  Open in Flip Analyzer
                </a>
              </div>
            </div>
          )}

          {/* Initial empty state */}
          {!investmentData && !investmentLoading && !investmentError && (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                background: "hsl(var(--muted))",
                borderRadius: 12,
                color: "hsl(var(--muted-foreground))",
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "hsl(var(--foreground))" }}>
                Analyze Investment Properties
              </p>
              <p style={{ fontSize: 14, maxWidth: 440, margin: "0 auto" }}>
                Enter an MLS number above to fetch property details and unit data. You can then import the data directly
                into the BRRR or Flip analyzer for a full deal breakdown.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
