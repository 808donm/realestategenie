"use client";

import { useState, useEffect } from "react";

const fmt = (n: number) => "$" + n.toLocaleString();

const SCORE_COLORS = {
  hot: { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", label: "HOT" },
  warm: { bg: "#fff7ed", border: "#fdba74", text: "#ea580c", label: "WARM" },
  cold: { bg: "#f3f4f6", border: "#d1d5db", text: "#6b7280", label: "NURTURE" },
};

interface Search {
  id: string;
  name: string;
  search_criteria: any;
  schedule: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_new_count: number;
  total_results: number;
  criteriaSummary: string;
  resultCounts: { hot: number; warm: number; cold: number; total: number };
}

interface Result {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  beds: number;
  baths: number;
  sqft: number;
  year_built: number;
  owner_name: string;
  owner_name_2: string;
  mailing_address: string;
  absentee_owner: boolean;
  out_of_state_absentee: boolean;
  estimated_value: number;
  estimated_equity: number;
  equity_percent: number;
  mortgage_balance: number;
  last_sale_date: string;
  last_sale_price: number;
  ownership_length: number;
  lead_score: "hot" | "warm" | "cold";
  lead_score_reasons: string[];
  lead_flags: any;
  is_new: boolean;
  is_starred: boolean;
  discovered_at: string;
  bird_dog_contacts?: Array<{ phones: any[]; emails: any[] }>;
}

export function BirdDogPage() {
  const [view, setView] = useState<"searches" | "results" | "create">("searches");
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSearch, setSelectedSearch] = useState<Search | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [runningId, setRunningId] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formZip, setFormZip] = useState("");
  const [formSchedule, setFormSchedule] = useState("weekly");
  const [formFlags, setFormFlags] = useState<Record<string, boolean>>({});
  const [formPropertyType, setFormPropertyType] = useState("");
  const [formEquityMin, setFormEquityMin] = useState("");
  const [creating, setCreating] = useState(false);

  // Load searches
  useEffect(() => {
    fetch("/api/bird-dog/searches")
      .then((r) => r.json())
      .then((data) => setSearches(data.searches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load results for selected search
  const loadResults = (search: Search) => {
    setSelectedSearch(search);
    setView("results");
    setResultsLoading(true);
    fetch(`/api/bird-dog/results?searchId=${search.id}&score=${scoreFilter === "all" ? "" : scoreFilter}`)
      .then((r) => r.json())
      .then((data) => setResults(data.results || []))
      .catch(() => {})
      .finally(() => setResultsLoading(false));
  };

  // Run a search immediately
  const runSearch = async (searchId: string) => {
    setRunningId(searchId);
    try {
      const res = await fetch("/api/bird-dog/searches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: searchId, action: "run" }),
      });
      const data = await res.json();
      if (data.summary) {
        alert(`Bird Dog found ${data.summary.newIds} new properties: ${data.summary.hot} HOT, ${data.summary.warm} WARM, ${data.summary.cold} COLD`);
        // Refresh searches
        fetch("/api/bird-dog/searches")
          .then((r) => r.json())
          .then((d) => setSearches(d.searches || []));
      }
    } catch { /* ignore */ }
    setRunningId(null);
  };

  // Create a new search
  const createSearch = async () => {
    if (!formName || !formZip) return;
    setCreating(true);
    const criteria: any = { zip: formZip, state: "HI" };
    if (formFlags.absentee_owner) criteria.absentee_owner = true;
    if (formFlags.high_equity) criteria.high_equity = true;
    if (formFlags.vacant) criteria.vacant = true;
    if (formFlags.pre_foreclosure) criteria.pre_foreclosure = true;
    if (formFlags.foreclosure) criteria.foreclosure = true;
    if (formFlags.investor) criteria.investor = true;
    if (formFlags.tax_delinquent) criteria.tax_delinquent = true;
    if (formPropertyType) criteria.property_type = formPropertyType;
    if (formEquityMin) criteria.equity_min = Number(formEquityMin);

    try {
      const res = await fetch("/api/bird-dog/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, criteria, schedule: formSchedule }),
      });
      const data = await res.json();
      if (data.search) {
        setSearches((prev) => [{ ...data.search, criteriaSummary: data.criteriaSummary, resultCounts: { hot: 0, warm: 0, cold: 0, total: 0 } }, ...prev]);
        setView("searches");
        setFormName("");
        setFormZip("");
        setFormFlags({});
      }
    } catch { /* ignore */ }
    setCreating(false);
  };

  // Export hot sheet
  const exportHotSheet = async () => {
    if (!selectedSearch) return;
    const res = await fetch("/api/bird-dog/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchId: selectedSearch.id, scoreFilter }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BirdDog_${selectedSearch.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Toggle flag in create form
  const toggleFlag = (flag: string) => {
    setFormFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Bird Dog Prospecting</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>Automated off-market lead hunting</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {view !== "searches" && (
            <button onClick={() => setView("searches")} style={{ padding: "8px 16px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
              Back to Searches
            </button>
          )}
          {view === "searches" && (
            <button onClick={() => setView("create")} style={{ padding: "8px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              + New Search
            </button>
          )}
        </div>
      </div>

      {/* ── CREATE SEARCH FORM ── */}
      {view === "create" && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Create Bird Dog Search</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Search Name</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Hawaii Kai Absentee Owners" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>ZIP Code</label>
              <input value={formZip} onChange={(e) => setFormZip(e.target.value)} placeholder="96825" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Lead Filters</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { key: "absentee_owner", label: "Absentee Owner" },
                { key: "high_equity", label: "High Equity" },
                { key: "vacant", label: "Vacant" },
                { key: "pre_foreclosure", label: "Pre-Foreclosure" },
                { key: "foreclosure", label: "Foreclosure" },
                { key: "investor", label: "Investor" },
                { key: "tax_delinquent", label: "Tax Delinquent" },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => toggleFlag(key)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: formFlags[key] ? "2px solid #2563eb" : "1px solid #d1d5db", background: formFlags[key] ? "#dbeafe" : "white", color: formFlags[key] ? "#1e40af" : "#6b7280", cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Schedule</label>
              <select value={formSchedule} onChange={(e) => setFormSchedule(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Property Type</label>
              <select value={formPropertyType} onChange={(e) => setFormPropertyType(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}>
                <option value="">All Types</option>
                <option value="SFR">Single Family</option>
                <option value="CONDO">Condo</option>
                <option value="MFR">Multi-Family</option>
                <option value="LAND">Land</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Min Equity %</label>
              <input value={formEquityMin} onChange={(e) => setFormEquityMin(e.target.value)} placeholder="e.g., 50" type="number" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }} />
            </div>
          </div>

          <button onClick={createSearch} disabled={creating || !formName || !formZip} style={{ padding: "10px 24px", background: creating ? "#9ca3af" : "#059669", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: creating ? "default" : "pointer" }}>
            {creating ? "Creating..." : "Create Search"}
          </button>
        </div>
      )}

      {/* ── SEARCHES LIST ── */}
      {view === "searches" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading searches...</div>
          ) : searches.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🐕</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No Bird Dog searches yet</div>
              <div style={{ fontSize: 13 }}>Create your first search to start hunting for off-market leads</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {searches.map((s) => (
                <div key={s.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.criteriaSummary}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: s.is_active ? "#d1fae5" : "#f3f4f6", color: s.is_active ? "#065f46" : "#6b7280", fontWeight: 600 }}>
                        {s.schedule} {s.is_active ? "" : "(paused)"}
                      </span>
                    </div>
                  </div>

                  {/* Score badges */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {s.resultCounts.hot > 0 && (
                      <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: SCORE_COLORS.hot.bg, color: SCORE_COLORS.hot.text, border: `1px solid ${SCORE_COLORS.hot.border}` }}>
                        {s.resultCounts.hot} HOT
                      </span>
                    )}
                    {s.resultCounts.warm > 0 && (
                      <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: SCORE_COLORS.warm.bg, color: SCORE_COLORS.warm.text, border: `1px solid ${SCORE_COLORS.warm.border}` }}>
                        {s.resultCounts.warm} WARM
                      </span>
                    )}
                    {s.resultCounts.cold > 0 && (
                      <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: SCORE_COLORS.cold.bg, color: SCORE_COLORS.cold.text, border: `1px solid ${SCORE_COLORS.cold.border}` }}>
                        {s.resultCounts.cold} NURTURE
                      </span>
                    )}
                    {s.resultCounts.total === 0 && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>No results yet</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <button onClick={() => loadResults(s)} style={{ padding: "6px 14px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>
                      View Results ({s.resultCounts.total})
                    </button>
                    <button onClick={() => runSearch(s.id)} disabled={runningId === s.id} style={{ padding: "6px 14px", background: runningId === s.id ? "#9ca3af" : "#059669", color: "white", border: "none", borderRadius: 6, fontWeight: 600, cursor: runningId === s.id ? "default" : "pointer" }}>
                      {runningId === s.id ? "Running..." : "Run Now"}
                    </button>
                    <button onClick={async () => {
                      if (!confirm("Reset this search? This clears all previous results and re-scans from scratch.")) return;
                      await fetch("/api/bird-dog/searches", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, action: "reset" }) });
                      fetch("/api/bird-dog/searches").then((r) => r.json()).then((d) => setSearches(d.searches || []));
                    }} style={{ padding: "6px 14px", background: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
                      Reset
                    </button>
                    <button onClick={async () => {
                      if (!confirm("Delete this search and all its results?")) return;
                      await fetch(`/api/bird-dog/searches?id=${s.id}`, { method: "DELETE" });
                      setSearches((prev) => prev.filter((x) => x.id !== s.id));
                    }} style={{ padding: "6px 14px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
                      Delete
                    </button>
                    {s.last_run_at && (
                      <span style={{ padding: "6px 0", color: "#9ca3af", fontSize: 11 }}>
                        Last run: {new Date(s.last_run_at).toLocaleDateString()} ({s.last_run_new_count} new)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── RESULTS VIEW ── */}
      {view === "results" && selectedSearch && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedSearch.name}</h2>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{selectedSearch.criteriaSummary}</div>
            </div>
            <button onClick={exportHotSheet} style={{ padding: "8px 16px", background: "#059669", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Export Hot Sheet
            </button>
          </div>

          {/* Score filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["all", "hot", "warm", "cold"].map((s) => (
              <button key={s} onClick={() => { setScoreFilter(s); loadResults(selectedSearch); }} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: scoreFilter === s ? "2px solid #2563eb" : "1px solid #d1d5db", background: scoreFilter === s ? "#dbeafe" : "white", color: scoreFilter === s ? "#1e40af" : "#6b7280", cursor: "pointer" }}>
                {s === "all" ? "All" : s === "cold" ? "Nurture" : s.toUpperCase()}
              </button>
            ))}
          </div>

          {resultsLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading results...</div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>No results found. Click "Run Now" to search.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map((r) => {
                const sc = SCORE_COLORS[r.lead_score];
                return (
                  <div key={r.id} style={{ background: "white", border: `1px solid ${sc.border}`, borderLeft: `4px solid ${sc.text}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{r.address}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{r.city}, {r.state} {r.zip}</div>
                      </div>
                      <span style={{ padding: "3px 12px", borderRadius: 6, fontSize: 12, fontWeight: 800, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                        {sc.label}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6b7280", flexWrap: "wrap", marginBottom: 6 }}>
                      {r.estimated_value > 0 && <span style={{ fontWeight: 600, color: "#059669" }}>Value: {fmt(r.estimated_value)}</span>}
                      {r.estimated_equity > 0 && <span>Equity: {fmt(r.estimated_equity)} ({r.equity_percent}%)</span>}
                      {r.beds && <span>{r.beds} bed</span>}
                      {r.baths && <span>{r.baths} bath</span>}
                      {r.sqft && <span>{r.sqft.toLocaleString()} sqft</span>}
                      {r.year_built && <span>Built {r.year_built}</span>}
                      {r.property_type && <span>{r.property_type}</span>}
                    </div>

                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>Owner:</span> {r.owner_name || "Unknown"}
                      {r.owner_name_2 && ` & ${r.owner_name_2}`}
                      {r.mailing_address && <span style={{ color: "#9ca3af", marginLeft: 8 }}>| {r.mailing_address}</span>}
                    </div>

                    {/* Score reasons */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      {r.lead_score_reasons?.map((reason, i) => (
                        <span key={i} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: sc.bg, color: sc.text }}>
                          {reason}
                        </span>
                      ))}
                    </div>

                    {/* Contact info if skip traced */}
                    {r.bird_dog_contacts && r.bird_dog_contacts.length > 0 && (
                      <div style={{ fontSize: 11, color: "#2563eb", marginTop: 4 }}>
                        {r.bird_dog_contacts[0].phones?.map((p: any, i: number) => (
                          <span key={i} style={{ marginRight: 8 }}>
                            <a href={`tel:${p.number}`} style={{ color: "#2563eb" }}>{p.number}</a>
                          </span>
                        ))}
                        {r.bird_dog_contacts[0].emails?.map((e: any, i: number) => (
                          <span key={i} style={{ marginRight: 8 }}>
                            <a href={`mailto:${e.address}`} style={{ color: "#2563eb" }}>{e.address}</a>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
