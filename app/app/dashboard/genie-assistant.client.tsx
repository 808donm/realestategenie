"use client";

import { useState, useEffect, useCallback } from "react";
import { QUICK_ACTIONS, type QuickActionDef } from "@/lib/genie/types";

interface ActionItem {
  id: string;
  type: string;
  priority: 1 | 2 | 3;
  title: string;
  description: string;
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  ghlContactId?: string;
  channels: ("email" | "sms")[];
  linkHref?: string;
  metadata?: Record<string, any>;
}

interface Draft {
  subject?: string;
  body: string;
}

const PRIORITY_COLORS = {
  1: { dot: "#ef4444", bg: "#fef2f2" },
  2: { dot: "#f59e0b", bg: "#fffbeb" },
  3: { dot: "#3b82f6", bg: "#eff6ff" },
};

export function GenieAssistant() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [ghlConnected, setGhlConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draft modal state
  const [draftingAction, setDraftingAction] = useState<ActionItem | null>(null);
  const [draftChannel, setDraftChannel] = useState<"email" | "sms">("email");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch action items on mount
  useEffect(() => {
    fetch("/api/genie/actions", { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (data.actions) setActions(data.actions);
        if (data.ghlConnected != null) setGhlConnected(data.ghlConnected);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Generate a draft
  const handleDraft = useCallback(async (action: ActionItem, channel: "email" | "sms") => {
    setDraftingAction(action);
    setDraftChannel(channel);
    setDraft(null);
    setDraftLoading(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/genie/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: action.type,
          channel,
          leadId: action.leadId,
          metadata: action.metadata,
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setDraft(data.draft);
      } else {
        setError(data.error || "Failed to generate draft");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDraftLoading(false);
    }

    // Log draft action
    fetch("/api/genie/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: action.leadId,
        actionType: `draft_${channel}`,
        actionDetail: { actionId: action.id, actionType: action.type },
        status: "draft_only",
      }),
    }).catch(() => {});
  }, []);

  // Send via CRM
  const handleSend = useCallback(async () => {
    if (!draftingAction || !draft) return;
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/genie/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: draftChannel,
          leadId: draftingAction.leadId,
          ghlContactId: draftingAction.ghlContactId,
          subject: draft.subject,
          body: draft.body,
          actionType: draftingAction.type,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendResult({ success: true, message: `${draftChannel === "email" ? "Email" : "SMS"} sent successfully!` });
        // Remove the completed action from the list
        setActions(prev => prev.filter(a => a.id !== draftingAction.id));
        setTimeout(() => {
          setDraftingAction(null);
          setDraft(null);
          setSendResult(null);
        }, 2000);
      } else {
        setSendResult({ success: false, message: data.error || "Send failed" });
      }
    } catch (e: any) {
      setSendResult({ success: false, message: e.message });
    } finally {
      setSending(false);
    }
  }, [draftingAction, draft, draftChannel]);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (!draft) return;
    const text = draft.subject ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body;
    navigator.clipboard.writeText(text).then(() => {
      setSendResult({ success: true, message: "Copied to clipboard!" });
      setTimeout(() => setSendResult(null), 2000);
    });
  }, [draft]);

  // Close modal
  const closeModal = () => {
    setDraftingAction(null);
    setDraft(null);
    setSendResult(null);
  };

  // Quick action state
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [quickActionResult, setQuickActionResult] = useState<{ type: string; message: string } | null>(null);

  // Inline search state
  const [activeSearch, setActiveSearch] = useState<string | null>(null); // which search panel is open
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMeta, setSearchMeta] = useState<any>(null);

  // Run inline search
  const runInlineSearch = useCallback(async (type: string, input: string) => {
    if (!input.trim()) return;
    setSearchLoading(true);
    setSearchResults(null);
    setSearchMeta(null);

    try {
      switch (type) {
        case "create_dom_search": {
          const zips = input.split(",").map(z => z.trim()).filter(Boolean);
          const res = await fetch("/api/dom-prospecting/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zipCodes: zips }),
          });
          const data = await res.json();
          setSearchResults(data.results || []);
          setSearchMeta({ summary: data.summary, total: data.total, dataSource: data.dataSource });
          break;
        }
        case "search_seller_map": {
          const zips = input.split(",").map(z => z.trim()).filter(Boolean);
          const params = new URLSearchParams({ zips: zips.join(","), minScore: "40", limit: "20" });
          const res = await fetch(`/api/seller-map?${params}`);
          const data = await res.json();
          setSearchResults(data.properties || []);
          setSearchMeta({ total: data.total });
          break;
        }
        case "search_mls": {
          const zips = input.split(",").map(z => z.trim()).filter(Boolean);
          const params = new URLSearchParams({
            searchType: "zip",
            postalCodes: zips.join(","),
            status: "Active",
            limit: "20",
          });
          const res = await fetch(`/api/mls/farm-search?${params}`);
          const data = await res.json();
          setSearchResults(data.properties || []);
          setSearchMeta({ totalCount: data.totalCount });
          break;
        }
        case "property_lookup": {
          const params = new URLSearchParams({ endpoint: "expanded" });
          const parts = input.split(",").map((s: string) => s.trim());
          if (parts.length >= 2) {
            params.set("address1", parts[0]);
            params.set("address2", parts.slice(1).join(", "));
          } else {
            params.set("postalcode", input.trim());
          }
          const res = await fetch(`/api/integrations/attom/property?${params}`);
          const data = await res.json();
          const props = data.property || (data.address ? [data] : []);
          setSearchResults(Array.isArray(props) ? props : [props]);
          setSearchMeta({ total: Array.isArray(props) ? props.length : 1 });
          break;
        }
      }
    } catch (err: any) {
      setSearchMeta({ error: err.message });
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Execute a quick action
  const executeQuickAction = useCallback(async (qa: QuickActionDef) => {
    // Inline search actions — open search panel instead of redirecting
    const inlineSearchActions = ["create_dom_search", "search_seller_map", "search_mls", "property_lookup"];
    if (inlineSearchActions.includes(qa.type)) {
      setActiveSearch(activeSearch === qa.type ? null : qa.type);
      setSearchResults(null);
      setSearchMeta(null);
      setSearchInput("");
      return;
    }

    // Actions that are just redirects — navigate directly
    const redirectActions = [
      "create_open_house", "generate_property_report",
      "run_calculator", "export_calculator_report",
      "create_farm_watchdog", "create_mls_search_profile",
      "attach_file_to_contact",
    ];

    if (redirectActions.includes(qa.type)) {
      setQuickActionLoading(qa.type);
      try {
        const res = await fetch("/api/genie/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: qa.type, params: {} }),
        });
        const data = await res.json();
        if (data.redirect) {
          window.location.href = data.redirect;
        } else {
          setQuickActionResult({ type: qa.type, message: data.message || "Action completed" });
          setTimeout(() => setQuickActionResult(null), 3000);
        }
      } catch {
        setQuickActionResult({ type: qa.type, message: "Action failed" });
      } finally {
        setQuickActionLoading(null);
      }
      return;
    }

    // Actions that need parameters — navigate to dedicated pages
    const pageRoutes: Record<string, string> = {
      advance_pipeline: "/app/pipeline",
      create_task: "/app/tasks",
      create_calendar_event: "/app/calendar",
      save_seller_search: "/app/seller-map",
      send_esign_document: "/app/contacts",
    };

    const route = pageRoutes[qa.type];
    if (route) {
      window.location.href = route;
    }
  }, [activeSearch]);

  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #e0e7ff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px", background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>&#10024;</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Genie Assistant</div>
          <div style={{ fontSize: 11, color: "#c7d2fe" }}>
            {loading ? "Analyzing..." : `${actions.length} action${actions.length !== 1 ? "s" : ""} recommended`}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "12px 16px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 20, color: "#9ca3af" }}>
            Analyzing your leads and pipeline...
          </div>
        )}

        {!loading && actions.length === 0 && (
          <div style={{ textAlign: "center", padding: 20, color: "#059669" }}>
            All caught up! No urgent actions right now.
          </div>
        )}

        {!loading && actions.map((action) => {
          const pc = PRIORITY_COLORS[action.priority];
          return (
            <div
              key={action.id}
              style={{
                padding: "10px 12px", marginBottom: 8, borderRadius: 8,
                background: pc.bg, border: "1px solid #f3f4f6",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: pc.dot, marginTop: 4, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                    {action.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {action.description}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {action.channels.includes("email") && (
                      <button
                        onClick={() => handleDraft(action, "email")}
                        style={{
                          padding: "4px 10px", fontSize: 11, fontWeight: 600,
                          borderRadius: 4, border: "1px solid #6366f1",
                          background: "#fff", color: "#4f46e5", cursor: "pointer",
                        }}
                      >
                        Draft Email
                      </button>
                    )}
                    {action.channels.includes("sms") && (
                      <button
                        onClick={() => handleDraft(action, "sms")}
                        style={{
                          padding: "4px 10px", fontSize: 11, fontWeight: 600,
                          borderRadius: 4, border: "1px solid #059669",
                          background: "#fff", color: "#059669", cursor: "pointer",
                        }}
                      >
                        Draft SMS
                      </button>
                    )}
                    {action.linkHref && (
                      <a
                        href={action.linkHref}
                        style={{
                          padding: "4px 10px", fontSize: 11, fontWeight: 600,
                          borderRadius: 4, border: "1px solid #6b7280",
                          background: "#fff", color: "#374151", cursor: "pointer",
                          textDecoration: "none",
                        }}
                      >
                        Go &rarr;
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && actions.length > 0 && (
          <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", marginTop: 4 }}>
            AI-generated recommendations. Review before acting.
          </div>
        )}

        {/* Quick Actions Toggle */}
        {!loading && (
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            style={{
              width: "100%", padding: "8px 0", marginTop: 8,
              fontSize: 12, fontWeight: 600, color: "#6366f1",
              background: "none", border: "1px solid #e0e7ff", borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {showQuickActions ? "Hide Quick Actions" : `Quick Actions (${QUICK_ACTIONS.length})`}
          </button>
        )}

        {/* Quick Actions Grid */}
        {showQuickActions && (
          <div style={{ marginTop: 10 }}>
            {quickActionResult && (
              <div style={{
                padding: 8, borderRadius: 6, marginBottom: 8,
                background: "#f0fdf4", color: "#065f46", fontSize: 12,
              }}>
                {quickActionResult.message}
              </div>
            )}

            {(["leads", "property", "prospecting", "documents"] as const).map(category => {
              const categoryActions = QUICK_ACTIONS.filter(a => a.category === category);
              const categoryLabels: Record<string, string> = {
                leads: "Leads & Pipeline",
                property: "Property Intelligence",
                prospecting: "Prospecting",
                documents: "Documents",
              };
              return (
                <div key={category} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                    {categoryLabels[category]}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
                    {categoryActions.map(qa => (
                      <button
                        key={qa.type}
                        onClick={() => executeQuickAction(qa)}
                        disabled={quickActionLoading === qa.type}
                        style={{
                          padding: "8px 10px", borderRadius: 6,
                          border: `1px solid ${qa.color}20`,
                          background: "#fff", cursor: "pointer",
                          textAlign: "left", opacity: quickActionLoading === qa.type ? 0.6 : 1,
                        }}
                      >
                        <div style={{ fontSize: 14, marginBottom: 2 }}>{qa.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: qa.color }}>{qa.label}</div>
                        <div style={{ fontSize: 9, color: "#9ca3af", lineHeight: 1.3, marginTop: 1 }}>{qa.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inline Search Panel */}
        {activeSearch && (
          <div style={{ marginTop: 10, padding: 12, background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {activeSearch === "create_dom_search" && "DOM Prospect Search"}
                {activeSearch === "search_seller_map" && "Seller Map Search"}
                {activeSearch === "search_mls" && "MLS Listing Search"}
                {activeSearch === "property_lookup" && "Property Lookup"}
              </div>
              <button onClick={() => { setActiveSearch(null); setSearchResults(null); }} style={{ background: "none", border: "none", fontSize: 16, color: "#9ca3af", cursor: "pointer" }}>&times;</button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runInlineSearch(activeSearch, searchInput)}
                placeholder={
                  activeSearch === "property_lookup"
                    ? "Enter address (123 Main St, Kailua, HI)"
                    : "Enter zip codes (96815, 96816)"
                }
                style={{ flex: 1, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12 }}
              />
              <button
                onClick={() => runInlineSearch(activeSearch, searchInput)}
                disabled={searchLoading}
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 600,
                  borderRadius: 6, border: "none", cursor: "pointer",
                  background: searchLoading ? "#9ca3af" : "#4f46e5", color: "#fff",
                }}
              >
                {searchLoading ? "..." : "Search"}
              </button>
            </div>

            {searchMeta?.error && (
              <div style={{ padding: 8, background: "#fef2f2", borderRadius: 6, color: "#991b1b", fontSize: 12 }}>
                {searchMeta.error}
              </div>
            )}

            {searchMeta && !searchMeta.error && (
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
                {searchMeta.total ?? searchMeta.totalCount ?? 0} results found
                {searchMeta.summary && ` (${searchMeta.summary.red || 0} red, ${searchMeta.summary.orange || 0} orange, ${searchMeta.summary.charcoal || 0} charcoal)`}
                {searchMeta.dataSource && ` — Source: ${searchMeta.dataSource}`}
              </div>
            )}

            {/* Results */}
            {searchResults && searchResults.length > 0 && (
              <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {searchResults.slice(0, 15).map((r: any, i: number) => {
                  // DOM results
                  if (activeSearch === "create_dom_search") {
                    const tierColors: Record<string, string> = { red: "#dc2626", orange: "#ea580c", charcoal: "#4b5563" };
                    return (
                      <div key={r.listingKey || i} style={{ padding: "8px 10px", borderRadius: 6, background: "#fff", border: `1px solid ${tierColors[r.tier] || "#e5e7eb"}`, fontSize: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 600, color: "#111827" }}>{r.address}</div>
                          <div style={{ fontWeight: 800, color: tierColors[r.tier] }}>{r.daysOnMarket}d</div>
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 11 }}>
                          {r.propertyType} | {r.listPrice ? `$${Number(r.listPrice).toLocaleString()}` : ""} | {r.domRatio}x avg ({r.avgDomForType}d)
                          {r.listingAgentName && ` | ${r.listingAgentName}`}
                        </div>
                      </div>
                    );
                  }
                  // Seller map results
                  if (activeSearch === "search_seller_map") {
                    const scoreColor = r.motivationScore >= 70 ? "#dc2626" : r.motivationScore >= 50 ? "#ea580c" : r.motivationScore >= 30 ? "#f59e0b" : "#3b82f6";
                    return (
                      <div key={r.identifier?.Id || i} style={{ padding: "8px 10px", borderRadius: 6, background: "#fff", border: "1px solid #e5e7eb", fontSize: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 600, color: "#111827" }}>{r.address?.oneLine || "Unknown"}</div>
                          <div style={{ fontWeight: 800, color: scoreColor }}>{r.motivationScore || 0}</div>
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 11 }}>
                          {r.sellerLevel} | {r.summary?.propType || ""} | {r.owner?.owner1?.fullName || ""}
                        </div>
                      </div>
                    );
                  }
                  // MLS listing results
                  if (activeSearch === "search_mls") {
                    return (
                      <div key={r.ListingKey || i} style={{ padding: "8px 10px", borderRadius: 6, background: "#fff", border: "1px solid #e5e7eb", fontSize: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 600, color: "#111827" }}>{r.UnparsedAddress || [r.StreetNumber, r.StreetName].filter(Boolean).join(" ")}</div>
                          <div style={{ fontWeight: 700, color: "#059669" }}>${Number(r.ListPrice || 0).toLocaleString()}</div>
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 11 }}>
                          {r.PropertyType} | {r.BedroomsTotal}bd {r.BathroomsTotalInteger}ba | {r.LivingArea?.toLocaleString()} sqft | {r.DaysOnMarket}d DOM
                          {r.ListAgentFullName && ` | ${r.ListAgentFullName}`}
                        </div>
                      </div>
                    );
                  }
                  // Property lookup results
                  return (
                    <div key={r.identifier?.Id || i} style={{ padding: "8px 10px", borderRadius: 6, background: "#fff", border: "1px solid #e5e7eb", fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{r.address?.oneLine || "Unknown"}</div>
                      <div style={{ color: "#6b7280", fontSize: 11 }}>
                        {r.summary?.propType || r.summary?.propertyType || ""} | {r.building?.rooms?.beds}bd {r.building?.rooms?.bathsFull}ba | {r.building?.size?.livingSize?.toLocaleString()} sqft
                        {r.avm?.amount?.value && ` | AVM: $${Number(r.avm.amount.value).toLocaleString()}`}
                        {r.owner?.owner1?.fullName && ` | ${r.owner.owner1.fullName}`}
                      </div>
                    </div>
                  );
                })}
                {searchResults.length > 15 && (
                  <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center", padding: 4 }}>
                    Showing 15 of {searchResults.length}. Open the full tool for more.
                  </div>
                )}
              </div>
            )}

            {searchResults && searchResults.length === 0 && !searchLoading && (
              <div style={{ textAlign: "center", padding: 12, color: "#9ca3af", fontSize: 12 }}>
                No results found for this search.
              </div>
            )}

            {/* Link to full tool */}
            {searchResults && searchResults.length > 0 && (
              <div style={{ marginTop: 8, textAlign: "right" }}>
                <a
                  href={
                    activeSearch === "create_dom_search" ? "/app/seller-map/dom-prospecting"
                    : activeSearch === "search_seller_map" ? "/app/seller-map"
                    : activeSearch === "search_mls" ? "/app/farm"
                    : "/app/property-data"
                  }
                  style={{ fontSize: 11, color: "#4f46e5", fontWeight: 600, textDecoration: "none" }}
                >
                  Open full tool &rarr;
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Draft Modal Overlay */}
      {draftingAction && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, width: "100%", maxWidth: 520,
            maxHeight: "80vh", overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
          }}>
            {/* Modal header */}
            <div style={{
              padding: "14px 18px", borderBottom: "1px solid #e5e7eb",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                  {draftChannel === "email" ? "Email Draft" : "SMS Draft"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  To: {draftingAction.leadName || "Lead"}
                  {draftingAction.leadEmail && draftChannel === "email" && ` (${draftingAction.leadEmail})`}
                  {draftingAction.leadPhone && draftChannel === "sms" && ` (${draftingAction.leadPhone})`}
                </div>
              </div>
              <button onClick={closeModal} style={{
                background: "none", border: "none", fontSize: 20, color: "#9ca3af",
                cursor: "pointer", padding: 4,
              }}>
                &times;
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: 18 }}>
              {draftLoading && (
                <div style={{ textAlign: "center", padding: 30, color: "#6b7280" }}>
                  Generating draft...
                </div>
              )}

              {draft && (
                <>
                  {draftChannel === "email" && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Subject</label>
                      <input
                        value={draft.subject || ""}
                        onChange={e => setDraft({ ...draft, subject: e.target.value })}
                        style={{
                          width: "100%", padding: "8px 10px", border: "1px solid #d1d5db",
                          borderRadius: 6, fontSize: 13,
                        }}
                      />
                    </div>
                  )}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                      {draftChannel === "email" ? "Body" : "Message"}
                      {draftChannel === "sms" && (
                        <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 8 }}>
                          {draft.body.length}/300
                        </span>
                      )}
                    </label>
                    <textarea
                      value={draft.body}
                      onChange={e => setDraft({ ...draft, body: e.target.value })}
                      rows={draftChannel === "email" ? 8 : 4}
                      style={{
                        width: "100%", padding: "8px 10px", border: "1px solid #d1d5db",
                        borderRadius: 6, fontSize: 13, resize: "vertical", fontFamily: "inherit",
                      }}
                    />
                  </div>

                  {sendResult && (
                    <div style={{
                      padding: 10, borderRadius: 6, marginBottom: 12,
                      background: sendResult.success ? "#f0fdf4" : "#fef2f2",
                      color: sendResult.success ? "#065f46" : "#991b1b",
                      fontSize: 13, fontWeight: 500,
                    }}>
                      {sendResult.message}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => handleDraft(draftingAction, draftChannel)}
                      style={{
                        padding: "8px 14px", fontSize: 12, fontWeight: 600,
                        borderRadius: 6, border: "1px solid #d1d5db",
                        background: "#fff", color: "#374151", cursor: "pointer",
                      }}
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={handleCopy}
                      style={{
                        padding: "8px 14px", fontSize: 12, fontWeight: 600,
                        borderRadius: 6, border: "1px solid #d1d5db",
                        background: "#fff", color: "#374151", cursor: "pointer",
                      }}
                    >
                      Copy
                    </button>
                    {ghlConnected && (
                      <button
                        onClick={handleSend}
                        disabled={sending}
                        style={{
                          padding: "8px 16px", fontSize: 12, fontWeight: 600,
                          borderRadius: 6, border: "none",
                          background: sending ? "#9ca3af" : "#4f46e5",
                          color: "#fff", cursor: sending ? "default" : "pointer",
                        }}
                      >
                        {sending ? "Sending..." : "Send via CRM"}
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", marginTop: 10 }}>
                    AI-generated content. Review before sending.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
