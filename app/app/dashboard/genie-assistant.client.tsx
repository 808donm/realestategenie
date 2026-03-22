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

  // Execute a quick action
  const executeQuickAction = useCallback(async (qa: QuickActionDef) => {
    // Actions that are just redirects — navigate directly
    const redirectActions = [
      "create_open_house", "property_lookup", "generate_property_report",
      "search_mls", "run_calculator", "export_calculator_report",
      "search_seller_map", "create_farm_watchdog", "create_mls_search_profile",
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
      create_dom_search: "/app/seller-map/dom-prospecting",
      send_esign_document: "/app/contacts",
    };

    const route = pageRoutes[qa.type];
    if (route) {
      window.location.href = route;
    }
  }, []);

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
