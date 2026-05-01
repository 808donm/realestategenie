"use client";

import { useState } from "react";

interface ReportConfig {
  id: string;
  mls_id: string;
  mls_name: string;
  state: string;
  report_slug: string;
  report_title: string;
  report_description: string | null;
  report_category: string;
  display_order: number;
  is_active: boolean;
}

const CATEGORIES = ["market_stats", "monthly", "statewide", "leaderboard"];

export default function MarketReportsManager({ initialConfigs }: { initialConfigs: ReportConfig[] }) {
  const [configs, setConfigs] = useState<ReportConfig[]>(initialConfigs);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [formMlsId, setFormMlsId] = useState("");
  const [formMlsName, setFormMlsName] = useState("");
  const [formState, setFormState] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("market_stats");
  const [formOrder, setFormOrder] = useState(0);

  // Group configs by MLS
  const mlsGroups = new Map<string, ReportConfig[]>();
  for (const c of configs) {
    const list = mlsGroups.get(c.mls_id) || [];
    list.push(c);
    mlsGroups.set(c.mls_id, list);
  }

  const handleAdd = async () => {
    if (!formMlsId || !formSlug || !formTitle) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/market-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mls_id: formMlsId,
          mls_name: formMlsName,
          state: formState,
          report_slug: formSlug,
          report_title: formTitle,
          report_description: formDesc || null,
          report_category: formCategory,
          display_order: formOrder,
        }),
      });
      if (res.ok) {
        const { config } = await res.json();
        setConfigs([...configs, config]);
        resetForm();
        setShowAdd(false);
      }
    } catch { /* empty */ }
    setSaving(false);
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/market-reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    setConfigs(configs.map((c) => c.id === id ? { ...c, is_active: !isActive } : c));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this report config?")) return;
    await fetch(`/api/admin/market-reports?id=${id}`, { method: "DELETE" });
    setConfigs(configs.filter((c) => c.id !== id));
  };

  const handleSetMlsId = async (agentEmail: string, mlsId: string) => {
    setSaving(true);
    try {
      await fetch("/api/admin/market-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_agent_mls", agentEmail, mls_id: mlsId }),
      });
      alert(`MLS ID "${mlsId}" set for ${agentEmail}`);
    } catch { /* empty */ }
    setSaving(false);
  };

  const resetForm = () => {
    setFormMlsId(""); setFormMlsName(""); setFormState(""); setFormSlug("");
    setFormTitle(""); setFormDesc(""); setFormCategory("market_stats"); setFormOrder(0);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 6,
    border: "1px solid hsl(var(--border))", fontSize: 13,
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Market Reports</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "hsl(var(--muted-foreground))" }}>
            Manage which market reports are visible to agents based on their MLS connection
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAdd(true); }}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "#2563eb", color: "#fff", fontWeight: 600,
            cursor: "pointer", fontSize: 14,
          }}
        >
          + Add Report
        </button>
      </div>

      {/* Set Agent MLS ID */}
      <div style={{ padding: 16, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Set Agent MLS ID</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Agent Email</label>
            <input id="agentEmail" style={{ ...inputStyle, width: 250 }} placeholder="agent@email.com" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>MLS ID</label>
            <select id="agentMlsId" style={{ ...inputStyle, width: 180 }}>
              {Array.from(mlsGroups.keys()).map((mlsId) => (
                <option key={mlsId} value={mlsId}>{mlsId} ({mlsGroups.get(mlsId)?.[0]?.mls_name})</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              const email = (document.getElementById("agentEmail") as HTMLInputElement)?.value;
              const mlsId = (document.getElementById("agentMlsId") as HTMLSelectElement)?.value;
              if (email && mlsId) handleSetMlsId(email, mlsId);
            }}
            disabled={saving}
            style={{
              padding: "8px 16px", borderRadius: 6, border: "none",
              background: "#d97706", color: "#fff", fontWeight: 600,
              cursor: "pointer", fontSize: 13,
            }}
          >
            Set MLS ID
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div style={{ padding: 20, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add Report Config</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>MLS ID *</label>
              <input style={inputStyle} value={formMlsId} onChange={(e) => setFormMlsId(e.target.value)} placeholder="hicentral" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>MLS Name *</label>
              <input style={inputStyle} value={formMlsName} onChange={(e) => setFormMlsName(e.target.value)} placeholder="HiCentral MLS" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>State *</label>
              <input style={inputStyle} value={formState} onChange={(e) => setFormState(e.target.value)} placeholder="HI" maxLength={2} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Report Slug *</label>
              <input style={inputStyle} value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="monthly-statistics" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Report Title *</label>
              <input style={inputStyle} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Oahu Monthly Report" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Category</label>
              <select style={inputStyle} value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Description</label>
              <input style={inputStyle} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Short description for the report card" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Display Order</label>
              <input style={inputStyle} type="number" value={formOrder} onChange={(e) => setFormOrder(Number(e.target.value))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={handleAdd} disabled={saving || !formMlsId || !formSlug || !formTitle} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              {saving ? "Saving..." : "Add"}
            </button>
            <button onClick={() => setShowAdd(false)} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report Configs by MLS */}
      {Array.from(mlsGroups.entries()).map(([mlsId, reports]) => (
        <div key={mlsId} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{reports[0].mls_name}</h2>
            <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: "#e0e7ff", color: "#3730a3", fontWeight: 600 }}>{mlsId}</span>
            <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>{reports[0].state}</span>
            <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{reports.length} reports</span>
          </div>
          <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "hsl(var(--muted))" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Title</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Slug</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>Order</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>Active</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{r.report_title}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))", fontFamily: "monospace", fontSize: 12 }}>{r.report_slug}</td>
                    <td style={{ padding: "8px 12px", color: "hsl(var(--muted-foreground))" }}>{r.report_category}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>{r.display_order}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <button
                        onClick={() => handleToggle(r.id, r.is_active)}
                        style={{
                          padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none",
                          background: r.is_active ? "#dcfce7" : "#fee2e2",
                          color: r.is_active ? "#166534" : "#991b1b",
                        }}
                      >
                        {r.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <button onClick={() => handleDelete(r.id)} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", cursor: "pointer" }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {configs.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "hsl(var(--muted-foreground))" }}>
          <p style={{ fontSize: 16, fontWeight: 600 }}>No market report configs yet</p>
          <p style={{ fontSize: 14 }}>Apply the migration first, then add report configs.</p>
        </div>
      )}
    </div>
  );
}
