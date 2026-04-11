"use client";

import { useState, useEffect, useCallback } from "react";

type View = "profiles" | "create" | "alerts";

interface MonitorProfile {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_crm_contact_id: string | null;
  search_criteria: any;
  notify_email: boolean;
  notify_sms: boolean;
  notify_crm: boolean;
  alert_new_listing: boolean;
  alert_price_drop: boolean;
  alert_back_on_market: boolean;
  alert_expired_withdrawn: boolean;
  alert_pending: boolean;
  is_active: boolean;
  last_scan_at: string | null;
  total_alerts: number;
  criteriaSummary: string;
  alertCounts: Record<string, number>;
}

interface MonitorAlert {
  id: string;
  listing_key: string;
  listing_id: string | null;
  address: string;
  city: string;
  postal_code: string;
  photo_url: string | null;
  property_type: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  list_price: number;
  alert_type: string;
  alert_title: string;
  alert_details: any;
  genie_avm: any;
  email_sent: boolean;
  sms_sent: boolean;
  crm_sent: boolean;
  created_at: string;
}

const ALERT_COLORS: Record<string, string> = {
  new_listing: "#059669",
  price_drop: "#dc2626",
  back_on_market: "#2563eb",
  expired_withdrawn: "#6b7280",
  pending: "#d97706",
};

const ALERT_LABELS: Record<string, string> = {
  new_listing: "New Listing",
  price_drop: "Price Drop",
  back_on_market: "Back on Market",
  expired_withdrawn: "Expired",
  pending: "Pending",
};

const PROPERTY_TYPES = [
  "Residential",
  "Condominium",
  "Land",
  "Multi Family",
  "Commercial",
];

const fmt = (n: number) => "$" + n.toLocaleString();

export function MarketMonitorPage() {
  const [view, setView] = useState<View>("profiles");
  const [profiles, setProfiles] = useState<MonitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<MonitorProfile | null>(null);
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertFilter, setAlertFilter] = useState<string>("");
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [running, setRunning] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCrmId, setFormCrmId] = useState("");
  const [formZips, setFormZips] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formTmk, setFormTmk] = useState("");
  const [formBedsMin, setFormBedsMin] = useState("");
  const [formBedsMax, setFormBedsMax] = useState("");
  const [formBathsMin, setFormBathsMin] = useState("");
  const [formBathsMax, setFormBathsMax] = useState("");
  const [formPriceMin, setFormPriceMin] = useState("");
  const [formPriceMax, setFormPriceMax] = useState("");
  const [formPropTypes, setFormPropTypes] = useState<string[]>([]);
  const [formNotifyEmail, setFormNotifyEmail] = useState(true);
  const [formNotifySms, setFormNotifySms] = useState(false);
  const [formNotifyCrm, setFormNotifyCrm] = useState(false);
  const [formAlertNew, setFormAlertNew] = useState(true);
  const [formAlertDrop, setFormAlertDrop] = useState(true);
  const [formAlertBom, setFormAlertBom] = useState(true);
  const [formAlertExpired, setFormAlertExpired] = useState(false);
  const [formAlertPending, setFormAlertPending] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load profiles
  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market-monitor/profiles");
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  // Load alerts for a profile
  const loadAlerts = useCallback(async (profileId: string, type?: string) => {
    setAlertsLoading(true);
    try {
      const url = `/api/market-monitor/alerts?profileId=${profileId}${type ? `&alertType=${type}` : ""}&limit=100`;
      const res = await fetch(url);
      const data = await res.json();
      setAlerts(data.alerts || []);
      setAlertsTotal(data.total || 0);
    } catch { /* empty */ }
    setAlertsLoading(false);
  }, []);

  // Create profile
  const handleCreate = async () => {
    if (!formName.trim()) return;
    const zipArr = formZips.split(",").map((z) => z.trim()).filter(Boolean);
    if (!zipArr.length && !formCity.trim() && !formTmk.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/market-monitor/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: formName,
          clientEmail: formEmail || undefined,
          clientPhone: formPhone || undefined,
          clientCrmContactId: formCrmId || undefined,
          searchCriteria: {
            tmk: formTmk || undefined,
            zip_codes: zipArr.length > 0 ? zipArr : undefined,
            city: formCity || undefined,
            beds_min: formBedsMin ? Number(formBedsMin) : undefined,
            beds_max: formBedsMax ? Number(formBedsMax) : undefined,
            baths_min: formBathsMin ? Number(formBathsMin) : undefined,
            baths_max: formBathsMax ? Number(formBathsMax) : undefined,
            price_min: formPriceMin ? Number(formPriceMin) : undefined,
            price_max: formPriceMax ? Number(formPriceMax) : undefined,
            property_types: formPropTypes.length > 0 ? formPropTypes : undefined,
          },
          notifyEmail: formNotifyEmail,
          notifySms: formNotifySms,
          notifyCrm: formNotifyCrm,
          alertNewListing: formAlertNew,
          alertPriceDrop: formAlertDrop,
          alertBackOnMarket: formAlertBom,
          alertExpiredWithdrawn: formAlertExpired,
          alertPending: formAlertPending,
        }),
      });
      if (res.ok) {
        resetForm();
        setView("profiles");
        loadProfiles();
      }
    } catch { /* empty */ }
    setCreating(false);
  };

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormPhone(""); setFormCrmId("");
    setFormZips(""); setFormCity(""); setFormTmk(""); setFormBedsMin(""); setFormBedsMax("");
    setFormBathsMin(""); setFormBathsMax(""); setFormPriceMin(""); setFormPriceMax("");
    setFormPropTypes([]);
    setFormNotifyEmail(true); setFormNotifySms(false); setFormNotifyCrm(false);
    setFormAlertNew(true); setFormAlertDrop(true); setFormAlertBom(true);
    setFormAlertExpired(false); setFormAlertPending(false);
  };

  // Run now
  const handleRun = async (id: string) => {
    setRunning(id);
    try {
      await fetch("/api/market-monitor/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "run" }),
      });
      loadProfiles();
    } catch { /* empty */ }
    setRunning(null);
  };

  // Toggle active
  const handleToggle = async (id: string) => {
    await fetch("/api/market-monitor/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "toggle" }),
    });
    loadProfiles();
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this monitor profile and all its alerts?")) return;
    await fetch(`/api/market-monitor/profiles?id=${id}`, { method: "DELETE" });
    loadProfiles();
  };

  // View alerts
  const handleViewAlerts = (profile: MonitorProfile) => {
    setSelectedProfile(profile);
    setAlertFilter("");
    loadAlerts(profile.id);
    setView("alerts");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: 14, outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block",
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#374151", cursor: "pointer",
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Market Monitor</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>
            Automated MLS alerts for your clients
          </p>
        </div>
        {view === "profiles" && (
          <button
            onClick={() => { resetForm(); setView("create"); }}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: "#059669", color: "#fff", fontWeight: 600,
              cursor: "pointer", fontSize: 14,
            }}
          >
            + New Profile
          </button>
        )}
        {view !== "profiles" && (
          <button
            onClick={() => setView("profiles")}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "1px solid #d1d5db",
              background: "#fff", color: "#374151", fontWeight: 600,
              cursor: "pointer", fontSize: 14,
            }}
          >
            Back to Profiles
          </button>
        )}
      </div>

      {/* ── Profile List ─────────────────────────────────────── */}
      {view === "profiles" && (
        <div>
          {loading ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>Loading profiles...</p>
          ) : profiles.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No monitor profiles yet</p>
              <p style={{ fontSize: 14 }}>Create a profile to start sending MLS alerts to your clients.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {profiles.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #e5e7eb", borderRadius: 12, padding: 16,
                    background: p.is_active ? "#fff" : "#f9fafb",
                    opacity: p.is_active ? 1 : 0.7,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>{p.client_name}</span>
                        <span
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                            background: p.is_active ? "#dcfce7" : "#f3f4f6",
                            color: p.is_active ? "#166534" : "#6b7280",
                          }}
                        >
                          {p.is_active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                        {p.criteriaSummary}
                      </div>
                      {/* Alert count badges */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {Object.entries(p.alertCounts || {}).filter(([k, v]) => k !== "total" && v > 0).map(([type, count]) => (
                          <span
                            key={type}
                            style={{
                              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                              background: `${ALERT_COLORS[type]}15`, color: ALERT_COLORS[type],
                            }}
                          >
                            {count} {ALERT_LABELS[type]}
                          </span>
                        ))}
                      </div>
                      {p.last_scan_at && (
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                          Last scan: {new Date(p.last_scan_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleViewAlerts(p)} style={smallBtn("#2563eb")}>Alerts</button>
                      <button onClick={() => handleRun(p.id)} disabled={running === p.id} style={smallBtn("#059669")}>
                        {running === p.id ? "Scanning..." : "Run Now"}
                      </button>
                      <button onClick={() => handleToggle(p.id)} style={smallBtn("#6b7280")}>
                        {p.is_active ? "Pause" : "Resume"}
                      </button>
                      <button onClick={() => handleDelete(p.id)} style={smallBtn("#dc2626")}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Profile ───────────────────────────────────── */}
      {view === "create" && (
        <div style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>New Monitor Profile</h2>

          {/* Client Info */}
          <div style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Client Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Client Name *</label>
                <input style={inputStyle} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="John Smith" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="john@email.com" type="email" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+18081234567" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>CRM Contact ID</label>
                <input style={inputStyle} value={formCrmId} onChange={(e) => setFormCrmId(e.target.value)} placeholder="Optional - for CRM notifications" />
              </div>
            </div>
          </div>

          {/* Search Criteria */}
          <div style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Search Criteria</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>ZIP Codes (comma-separated)</label>
                <input style={inputStyle} value={formZips} onChange={(e) => setFormZips(e.target.value)} placeholder="96825, 96821, 96734" />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="Honolulu" />
              </div>
              <div>
                <label style={labelStyle}>TMK (Hawaii)</label>
                <input style={inputStyle} value={formTmk} onChange={(e) => setFormTmk(e.target.value)} placeholder="1-2-9" />
              </div>
              <div>
                <label style={labelStyle}>Beds Min</label>
                <input style={inputStyle} value={formBedsMin} onChange={(e) => setFormBedsMin(e.target.value)} type="number" placeholder="3" />
              </div>
              <div>
                <label style={labelStyle}>Beds Max</label>
                <input style={inputStyle} value={formBedsMax} onChange={(e) => setFormBedsMax(e.target.value)} type="number" placeholder="" />
              </div>
              <div>
                <label style={labelStyle}>Baths Min</label>
                <input style={inputStyle} value={formBathsMin} onChange={(e) => setFormBathsMin(e.target.value)} type="number" placeholder="2" />
              </div>
              <div>
                <label style={labelStyle}>Baths Max</label>
                <input style={inputStyle} value={formBathsMax} onChange={(e) => setFormBathsMax(e.target.value)} type="number" placeholder="" />
              </div>
              <div>
                <label style={labelStyle}>Price Min</label>
                <input style={inputStyle} value={formPriceMin} onChange={(e) => setFormPriceMin(e.target.value)} type="number" placeholder="500000" />
              </div>
              <div>
                <label style={labelStyle}>Price Max</label>
                <input style={inputStyle} value={formPriceMax} onChange={(e) => setFormPriceMax(e.target.value)} type="number" placeholder="1500000" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Property Types</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PROPERTY_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setFormPropTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                      style={{
                        padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer",
                        border: formPropTypes.includes(t) ? "2px solid #059669" : "1px solid #d1d5db",
                        background: formPropTypes.includes(t) ? "#dcfce7" : "#fff",
                        color: formPropTypes.includes(t) ? "#166534" : "#374151",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notification Channels */}
          <div style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Notification Channels</h3>
            <div style={{ display: "flex", gap: 20 }}>
              <label style={checkboxLabelStyle}>
                <input type="checkbox" checked={formNotifyEmail} onChange={(e) => setFormNotifyEmail(e.target.checked)} /> Email
              </label>
              <label style={checkboxLabelStyle}>
                <input type="checkbox" checked={formNotifySms} onChange={(e) => setFormNotifySms(e.target.checked)} /> SMS
              </label>
              <label style={checkboxLabelStyle}>
                <input type="checkbox" checked={formNotifyCrm} onChange={(e) => setFormNotifyCrm(e.target.checked)} /> CRM
              </label>
            </div>
          </div>

          {/* Alert Types */}
          <div style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Alert Types</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={checkboxLabelStyle}>
                <input type="checkbox" checked={formAlertNew} onChange={(e) => setFormAlertNew(e.target.checked)} />
                New Listing - matching properties just listed
              </label>
              <label style={checkboxLabelStyle}>
                <input type="checkbox" checked={formAlertDrop} onChange={(e) => setFormAlertDrop(e.target.checked)} />
                Price Drop - listing price decreased
              </label>
              <label style={checkboxLabelStyle}>
                <input type="checkbox" checked={formAlertBom} onChange={(e) => setFormAlertBom(e.target.checked)} />
                Back on Market - fell out of escrow
              </label>
              <label style={checkboxLabelStyle}>
                <input type="checkbox" checked={formAlertExpired} onChange={(e) => setFormAlertExpired(e.target.checked)} />
                Expired/Withdrawn - listing failed
              </label>
              <label style={checkboxLabelStyle}>
                <input type="checkbox" checked={formAlertPending} onChange={(e) => setFormAlertPending(e.target.checked)} />
                Pending - went under contract
              </label>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating || !formName.trim() || (!formZips.trim() && !formCity.trim() && !formTmk.trim())}
            style={{
              padding: "12px 32px", borderRadius: 8, border: "none",
              background: "#059669", color: "#fff", fontWeight: 600,
              cursor: "pointer", fontSize: 15, opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? "Creating..." : "Create Monitor Profile"}
          </button>
        </div>
      )}

      {/* ── Alert History ────────────────────────────────────── */}
      {view === "alerts" && selectedProfile && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
              Alerts for {selectedProfile.client_name}
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
              {selectedProfile.criteriaSummary}
            </p>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { key: "", label: `All (${alertsTotal})` },
              { key: "new_listing", label: "New Listing" },
              { key: "price_drop", label: "Price Drop" },
              { key: "back_on_market", label: "Back on Market" },
              { key: "expired_withdrawn", label: "Expired" },
              { key: "pending", label: "Pending" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setAlertFilter(tab.key); loadAlerts(selectedProfile.id, tab.key || undefined); }}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: alertFilter === tab.key ? "2px solid #059669" : "1px solid #d1d5db",
                  background: alertFilter === tab.key ? "#dcfce7" : "#fff",
                  color: alertFilter === tab.key ? "#166534" : "#6b7280",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {alertsLoading ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              <p>No alerts yet. Run a scan to detect changes.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alerts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden",
                    borderLeft: `4px solid ${ALERT_COLORS[a.alert_type] || "#6b7280"}`,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, padding: 14 }}>
                    {/* Photo */}
                    {a.photo_url && (
                      <div style={{ width: 100, height: 75, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                        <img src={a.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Type badge */}
                      <span
                        style={{
                          display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                          background: ALERT_COLORS[a.alert_type], color: "#fff", marginBottom: 4,
                        }}
                      >
                        {ALERT_LABELS[a.alert_type] || a.alert_type}
                      </span>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{a.address}</div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>{a.city}, HI {a.postal_code}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 14 }}>
                        {a.list_price > 0 && <span style={{ fontWeight: 700, color: "#059669" }}>{fmt(a.list_price)}</span>}
                        {a.beds && <span style={{ color: "#6b7280" }}>{a.beds}bd</span>}
                        {a.baths && <span style={{ color: "#6b7280" }}>{a.baths}ba</span>}
                        {a.sqft && <span style={{ color: "#6b7280" }}>{a.sqft.toLocaleString()}sf</span>}
                      </div>
                      {/* Price drop details */}
                      {a.alert_type === "price_drop" && a.alert_details && (
                        <div style={{ fontSize: 13, color: "#dc2626", marginTop: 4 }}>
                          Was {fmt(a.alert_details.previousPrice)} - Reduced {fmt(a.alert_details.dropAmount)} ({a.alert_details.dropPct}%)
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, fontSize: 11, color: "#9ca3af" }}>
                      {new Date(a.created_at).toLocaleDateString()}
                      <div style={{ display: "flex", gap: 4, marginTop: 6, justifyContent: "flex-end" }}>
                        {a.email_sent && <span title="Email sent" style={{ fontSize: 14 }}>📧</span>}
                        {a.sms_sent && <span title="SMS sent" style={{ fontSize: 14 }}>📱</span>}
                        {a.crm_sent && <span title="CRM sent" style={{ fontSize: 14 }}>💬</span>}
                      </div>
                    </div>
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

function smallBtn(color: string): React.CSSProperties {
  return {
    padding: "5px 12px", borderRadius: 6, border: `1px solid ${color}`,
    background: "transparent", color, fontWeight: 600, cursor: "pointer",
    fontSize: 12, whiteSpace: "nowrap",
  };
}
