"use client";

import { useState, useEffect, useCallback } from "react";

type View = "blasts" | "create" | "history";

interface Blast {
  id: string;
  name: string;
  search_criteria: any;
  alert_types: string[];
  crm_contact_ids: string[];
  crm_tag: string | null;
  schedule: string;
  is_active: boolean;
  last_sent_at: string | null;
  total_sent: number;
  criteriaSummary: string;
}

interface CrmContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
}

const STATUS_OPTIONS = ["Active", "Pending", "Closed", "Expired", "Withdrawn"];
const SCHEDULES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "manual", label: "Manual only" },
];

export function MlsBlastPage() {
  const [view, setView] = useState<View>("blasts");
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  // Create form
  const [formName, setFormName] = useState("");
  const [formSubdivision, setFormSubdivision] = useState("");
  const [formZips, setFormZips] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formStatuses, setFormStatuses] = useState<string[]>(["Active", "Closed"]);
  const [formSchedule, setFormSchedule] = useState("weekly");
  const [formDateRange, setFormDateRange] = useState("7");
  const [creating, setCreating] = useState(false);

  // Contact search
  const [contactQuery, setContactQuery] = useState("");
  const [contactResults, setContactResults] = useState<CrmContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<CrmContact[]>([]);
  const [contactSearching, setContactSearching] = useState(false);

  // Send result
  const [lastResult, setLastResult] = useState<any>(null);

  const loadBlasts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mls-blast/blasts");
      const data = await res.json();
      setBlasts(data.blasts || []);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadBlasts(); }, [loadBlasts]);

  // Search CRM contacts
  const searchContacts = async () => {
    if (!contactQuery.trim() || contactQuery.length < 2) return;
    setContactSearching(true);
    try {
      const res = await fetch(`/api/mls-blast/contacts?q=${encodeURIComponent(contactQuery)}`);
      const data = await res.json();
      setContactResults(data.contacts || []);
    } catch { /* empty */ }
    setContactSearching(false);
  };

  const addContact = (c: CrmContact) => {
    if (!selectedContacts.find((sc) => sc.id === c.id)) {
      setSelectedContacts([...selectedContacts, c]);
    }
  };

  const removeContact = (id: string) => {
    setSelectedContacts(selectedContacts.filter((c) => c.id !== id));
  };

  const handleCreate = async () => {
    if (!formName.trim() || selectedContacts.length === 0) return;
    if (!formSubdivision && !formZips && !formCity) return;
    setCreating(true);
    try {
      const res = await fetch("/api/mls-blast/blasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          searchCriteria: {
            subdivision: formSubdivision || undefined,
            zip_codes: formZips ? formZips.split(",").map((z) => z.trim()).filter(Boolean) : undefined,
            city: formCity || undefined,
            statuses: formStatuses,
            date_range_days: Number(formDateRange) || 7,
          },
          crmContactIds: selectedContacts.map((c) => c.id),
          schedule: formSchedule,
        }),
      });
      if (res.ok) {
        resetForm();
        setView("blasts");
        loadBlasts();
      }
    } catch { /* empty */ }
    setCreating(false);
  };

  const handleSend = async (id: string) => {
    setSending(id);
    setLastResult(null);
    try {
      const res = await fetch("/api/mls-blast/blasts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "send" }),
      });
      const data = await res.json();
      setLastResult(data.result);
      loadBlasts();
    } catch { /* empty */ }
    setSending(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this email blast?")) return;
    await fetch(`/api/mls-blast/blasts?id=${id}`, { method: "DELETE" });
    loadBlasts();
  };

  const resetForm = () => {
    setFormName(""); setFormSubdivision(""); setFormZips(""); setFormCity("");
    setFormStatuses(["Active", "Closed"]); setFormSchedule("weekly"); setFormDateRange("7");
    setSelectedContacts([]); setContactQuery(""); setContactResults([]);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14,
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Email Blast</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>
            Send MLS neighborhood updates to your contacts
          </p>
        </div>
        {view === "blasts" && (
          <button onClick={() => { resetForm(); setView("create"); }} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            + New Blast
          </button>
        )}
        {view !== "blasts" && (
          <button onClick={() => setView("blasts")} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            Back
          </button>
        )}
      </div>

      {/* Send result banner */}
      {lastResult && (
        <div style={{ padding: 16, background: lastResult.emailsSent > 0 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${lastResult.emailsSent > 0 ? "#bbf7d0" : "#fecaca"}`, borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          <strong>{lastResult.emailsSent} emails sent</strong> to {lastResult.recipientCount} recipients. {lastResult.listingsFound} listings found.
          {lastResult.errors?.length > 0 && <div style={{ color: "#dc2626", marginTop: 4 }}>{lastResult.errors.join("; ")}</div>}
          <button onClick={() => setLastResult(null)} style={{ marginLeft: 12, fontSize: 12, cursor: "pointer", background: "none", border: "none", color: "#6b7280" }}>Dismiss</button>
        </div>
      )}

      {/* Blast List */}
      {view === "blasts" && (
        <div>
          {loading ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>Loading...</p>
          ) : blasts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
              <p style={{ fontSize: 18, fontWeight: 600 }}>No email blasts yet</p>
              <p style={{ fontSize: 14 }}>Create a blast to send MLS updates to your contacts.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {blasts.map((b) => (
                <div key={b.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{b.name}</div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>{b.criteriaSummary}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                        {b.schedule} | {b.crm_contact_ids?.length || 0} contacts | {b.total_sent} total sent
                        {b.last_sent_at && ` | Last: ${new Date(b.last_sent_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleSend(b.id)} disabled={sending === b.id} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                        {sending === b.id ? "Sending..." : "Send Now"}
                      </button>
                      <button onClick={() => handleDelete(b.id)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: 12 }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Blast */}
      {view === "create" && (
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>New Email Blast</h2>

          <div style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Blast Details</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Name *</label>
              <input style={inputStyle} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Kaimuki Weekly Update" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Neighborhood / Subdivision</label>
                <input style={inputStyle} value={formSubdivision} onChange={(e) => setFormSubdivision(e.target.value)} placeholder="Kaimuki" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>ZIP Codes</label>
                <input style={inputStyle} value={formZips} onChange={(e) => setFormZips(e.target.value)} placeholder="96816, 96815" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Schedule</label>
                <select style={inputStyle} value={formSchedule} onChange={(e) => setFormSchedule(e.target.value)}>
                  {SCHEDULES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Date Range (days)</label>
                <input style={inputStyle} type="number" value={formDateRange} onChange={(e) => setFormDateRange(e.target.value)} placeholder="7" />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Statuses to include</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map((s) => {
                  const sel = formStatuses.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => setFormStatuses(sel ? formStatuses.filter((x) => x !== s) : [...formStatuses, s])} style={{ padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer", border: sel ? "2px solid #2563eb" : "1px solid #d1d5db", background: sel ? "#eff6ff" : "#fff", color: sel ? "#2563eb" : "#6b7280" }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Contact List Builder */}
          <div style={{ marginBottom: 20, padding: 16, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recipients (CRM Contacts)</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={contactQuery} onChange={(e) => setContactQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchContacts()} placeholder="Search contacts by name or email..." />
              <button onClick={searchContacts} disabled={contactSearching} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0369a1", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                {contactSearching ? "..." : "Search"}
              </button>
            </div>

            {/* Search results */}
            {contactResults.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 12 }}>
                {contactResults.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: "#6b7280", marginLeft: 8 }}>{c.email}</span>
                    </div>
                    <button onClick={() => addContact(c)} disabled={selectedContacts.some((sc) => sc.id === c.id)} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #059669", background: "#dcfce7", color: "#166534", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                      {selectedContacts.some((sc) => sc.id === c.id) ? "Added" : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected contacts */}
            {selectedContacts.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  {selectedContacts.length} contact{selectedContacts.length > 1 ? "s" : ""} selected
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selectedContacts.map((c) => (
                    <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 16, background: "#dbeafe", color: "#1e40af", fontSize: 12, fontWeight: 500 }}>
                      {c.name || c.email}
                      <button onClick={() => removeContact(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14, padding: 0, lineHeight: 1 }}>x</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedContacts.length === 0 && contactResults.length === 0 && (
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Search your CRM to find contacts for this blast.</p>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !formName.trim() || selectedContacts.length === 0 || (!formSubdivision && !formZips && !formCity)}
            style={{ padding: "12px 32px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 15, opacity: creating ? 0.6 : 1 }}
          >
            {creating ? "Creating..." : "Create Email Blast"}
          </button>
        </div>
      )}
    </div>
  );
}
