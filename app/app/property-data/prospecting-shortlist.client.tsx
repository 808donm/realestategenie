"use client";

import { useEffect, useState, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ShortlistItem {
  id: string;
  attom_id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  property_type: string | null;
  owner_name: string | null;
  source_mode: string | null;
  lead_score: string | null;
  estimated_value: number | null;
  estimated_equity: number | null;
  years_owned: number | null;
  skip_traced_at: string | null;
  skip_trace_phones: any[] | null;
  skip_trace_emails: any[] | null;
  added_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Bumped when the shortlist changes outside the drawer (a new item was added).
   *  The drawer re-fetches when this changes. */
  refreshKey: number;
}

const fmt$ = (n: number | null | undefined) =>
  n != null ? `$${Math.round(n).toLocaleString()}` : "—";

export default function ProspectingShortlistDrawer({ open, onClose, refreshKey }: Props) {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [skipTracing, setSkipTracing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/prospecting/shortlist");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to load shortlist");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refreshKey, refresh]);

  const removeItem = useCallback(
    async (attomId: string) => {
      setItems((prev) => prev.filter((i) => i.attom_id !== attomId));
      await fetch(`/api/prospecting/shortlist?attomId=${attomId}`, { method: "DELETE" });
    },
    [],
  );

  const clearAll = useCallback(async () => {
    if (!confirm(`Clear all ${items.length} properties from the shortlist?`)) return;
    setItems([]);
    await fetch("/api/prospecting/shortlist?clear=1", { method: "DELETE" });
  }, [items.length]);

  const skipTraceAll = useCallback(async () => {
    const pending = items.filter((i) => !i.skip_traced_at);
    if (pending.length === 0) {
      alert("All properties have already been skip traced.");
      return;
    }
    const cost = (pending.length * 0.05).toFixed(2);
    if (!confirm(`Run skip trace on ${pending.length} properties? Approximate cost: $${cost}.`)) return;

    setSkipTracing(true);
    setError(null);
    setProgress({ done: 0, total: pending.length });
    try {
      const r = await fetch("/api/prospecting/shortlist/skip-trace-bulk", {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Skip trace failed");
      setProgress(null);
      refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSkipTracing(false);
      setProgress(null);
    }
  }, [items, refresh]);

  const exportXlsx = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const r = await fetch("/api/prospecting/shortlist/export");
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || "Export failed");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prospecting_shortlist_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }, []);

  if (!open) return null;

  const skipTracedCount = items.filter((i) => i.skip_traced_at).length;
  const pendingCount = items.length - skipTracedCount;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 40,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(720px, 100%)",
          background: "hsl(var(--card))",
          borderLeft: "1px solid hsl(var(--border))",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          boxShadow: "-12px 0 40px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--foreground))" }}>
              Prospecting Shortlist
            </div>
            <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
              {items.length} {items.length === 1 ? "property" : "properties"} ·{" "}
              {skipTracedCount} skip-traced · {pendingCount} pending
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              padding: "6px 12px",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        {/* Action bar */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={skipTraceAll}
            disabled={skipTracing || pendingCount === 0}
            style={{
              padding: "8px 16px",
              background: pendingCount === 0 ? "hsl(var(--muted))" : "#059669",
              color: pendingCount === 0 ? "hsl(var(--muted-foreground))" : "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: skipTracing || pendingCount === 0 ? "default" : "pointer",
            }}
          >
            {skipTracing
              ? progress
                ? `Skip tracing ${progress.done}/${progress.total}…`
                : "Skip tracing…"
              : `Skip Trace ${pendingCount > 0 ? `(${pendingCount})` : ""}`}
          </button>
          <button
            onClick={exportXlsx}
            disabled={exporting || items.length === 0}
            style={{
              padding: "8px 16px",
              background: items.length === 0 ? "hsl(var(--muted))" : "#2563eb",
              color: items.length === 0 ? "hsl(var(--muted-foreground))" : "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: exporting || items.length === 0 ? "default" : "pointer",
            }}
          >
            {exporting ? "Exporting…" : "Export XLSX"}
          </button>
          <div style={{ flex: 1 }} />
          {items.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                padding: "8px 14px",
                background: "transparent",
                color: "#dc2626",
                border: "1px solid #fca5a5",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: 12, background: "#fef2f2", color: "#991b1b", fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))" }}>
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: 6 }}>
                Shortlist is empty
              </div>
              <div style={{ fontSize: 12 }}>
                Run a search and check the box on properties you want to call. Build up the list across
                multiple searches, then skip trace and export when ready.
              </div>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid hsl(var(--border))",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {it.address || "Unknown address"}
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                    {[it.city, it.state, it.zip].filter(Boolean).join(", ")}
                    {it.property_type && ` · ${it.property_type}`}
                    {it.years_owned != null && ` · ${it.years_owned}y owned`}
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                    {it.owner_name && <span>Owner: {it.owner_name}</span>}
                    {it.estimated_value != null && <span> · Value {fmt$(it.estimated_value)}</span>}
                    {it.estimated_equity != null && <span> · Equity {fmt$(it.estimated_equity)}</span>}
                  </div>
                  {it.skip_traced_at && (
                    <div style={{ fontSize: 11, color: "#059669", marginTop: 4, fontWeight: 600 }}>
                      ✓ Skip traced ·{" "}
                      {it.skip_trace_phones?.length || 0} phone(s) ·{" "}
                      {it.skip_trace_emails?.length || 0} email(s)
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  {it.lead_score && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background:
                          it.lead_score === "hot"
                            ? "#dc2626"
                            : it.lead_score === "warm"
                              ? "#f59e0b"
                              : "#3b82f6",
                        color: "#fff",
                        textTransform: "uppercase",
                      }}
                    >
                      {it.lead_score}
                    </span>
                  )}
                  <button
                    onClick={() => removeItem(it.attom_id)}
                    title="Remove from shortlist"
                    style={{
                      padding: "2px 8px",
                      background: "transparent",
                      color: "hsl(var(--muted-foreground))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 4,
                      fontSize: 10,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
