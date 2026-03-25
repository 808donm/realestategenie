"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CopilotActionResult } from "@/lib/genie/types";

interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
  actionResult?: CopilotActionResult;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  actionContext?: string | null;
  onClearContext?: () => void;
  currentPage?: string | null;
}

const fmt = (n?: number) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
};

export function GenieCopilotPopup({ isOpen, onClose, actionContext, onClearContext, currentPage }: Props) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened and after each message exchange
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Re-focus input after loading completes (response received)
  useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, loading]);

  // Initialize with actionContext on first open
  useEffect(() => {
    if (isOpen && actionContext && !hasInitialized.current) {
      hasInitialized.current = true;
      sendMessage("", actionContext);
      onClearContext?.();
    }
  }, [isOpen, actionContext]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen]);

  // Restore session from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("genie_copilot_session");
    if (stored) {
      try {
        const { sid, msgs } = JSON.parse(stored);
        if (sid) setSessionId(sid);
        if (msgs?.length) setMessages(msgs);
      } catch { /* ignore */ }
    }
  }, []);

  // Persist session to sessionStorage
  useEffect(() => {
    if (sessionId || messages.length) {
      sessionStorage.setItem("genie_copilot_session", JSON.stringify({ sid: sessionId, msgs: messages }));
    }
  }, [sessionId, messages]);

  const sendMessage = useCallback(async (msg: string, ctx?: string) => {
    if (!msg && !ctx) return;

    if (msg) {
      setMessages(prev => [...prev, { role: "user", content: msg }]);
    }
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/genie/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg || undefined,
          sessionId,
          actionContext: ctx || undefined,
          currentPage: currentPage || undefined,
          selectedProperty: (() => { try { return JSON.parse(sessionStorage.getItem("hoku_selected_property") || "null"); } catch { return null; } })(),
          selectedLead: (() => { try { return JSON.parse(sessionStorage.getItem("hoku_selected_lead") || "null"); } catch { return null; } })(),
        }),
      });
      const data = await res.json();

      if (data.sessionId) setSessionId(data.sessionId);

      if (data.reply) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.reply,
          actionResult: data.actionResult || undefined,
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    sessionStorage.removeItem("genie_copilot_session");
    hasInitialized.current = false;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 99999,
      width: 400, height: 560,
      borderRadius: 16, overflow: "hidden",
      boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
      display: "flex", flexDirection: "column",
      background: "#fff",
      animation: "slideUp 0.25s ease-out",
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      {/* Header */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>&#10024;</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Hoku</div>
            <div style={{ fontSize: 10, color: "#c7d2fe" }}>Your AI assistant</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={startNewChat} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 4, padding: "4px 8px", color: "#fff", fontSize: 10, cursor: "pointer" }}>New</button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: "0 4px" }}>&times;</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", background: "#f9fafb" }}>
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>&#10024;</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Aloha!</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Aloha! I can search properties, create tasks, run calculators, draft emails, and more. What can I help with?</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 8,
          }}>
            <div style={{
              maxWidth: "85%",
              padding: "8px 12px",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: msg.role === "user" ? "#4f46e5" : "#fff",
              color: msg.role === "user" ? "#fff" : "#111827",
              fontSize: 13,
              lineHeight: 1.5,
              border: msg.role === "assistant" ? "1px solid #e5e7eb" : "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}>
              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

              {/* Rich action result card */}
              {msg.actionResult && msg.actionResult.success && (
                <div style={{ marginTop: 8 }}>
                  {/* Redirect link */}
                  {msg.actionResult.redirect && (
                    <a
                      href={msg.actionResult.redirect}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block", padding: "6px 12px", borderRadius: 6,
                        background: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 600,
                        textDecoration: "none", marginTop: 4,
                      }}
                    >
                      Open &rarr;
                    </a>
                  )}

                  {/* Property results */}
                  {msg.actionResult.data?.properties && (() => {
                    const props = msg.actionResult.data.properties;
                    const total = msg.actionResult.data.total || props.length;
                    const aiScored = msg.actionResult.data.aiScored;
                    const filters = msg.actionResult.data.filters;
                    const tierColors: Record<string, { bg: string; border: string; text: string }> = {
                      hot: { bg: "#fef2f2", border: "#dc2626", text: "#991b1b" },
                      warm: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
                      "long-term": { bg: "#f9fafb", border: "#6b7280", text: "#374151" },
                    };
                    return (
                      <div style={{ marginTop: 6 }}>
                        {/* Summary header */}
                        <div style={{ padding: "8px 10px", background: "#eff6ff", borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                          <strong style={{ color: "#1e40af" }}>
                            {aiScored ? `Found ${total} properties — showing top ${Math.min(props.length, 15)} most likely sellers` : `Found ${total} properties`}
                          </strong>
                          {filters && (filters.minYearsOwned > 0 || filters.minBeds > 0) && (
                            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                              Filters: {filters.minYearsOwned > 0 ? `${filters.minYearsOwned}+ years owned` : ""}{filters.minBeds > 0 ? ` | ${filters.minBeds}+ beds` : ""}{filters.minBaths > 0 ? ` / ${filters.minBaths}+ baths` : ""}
                            </div>
                          )}
                        </div>

                        {/* Scrollable property cards */}
                        <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                          {props.slice(0, 15).map((p: any, j: number) => {
                            const addr = p.address?.oneLine || p.address || p.UnparsedAddress || [p.StreetNumber, p.StreetName].filter(Boolean).join(" ") || "Unknown";
                            const score = p.score;
                            const tier = p.tier || (score >= 90 ? "hot" : score >= 60 ? "warm" : "long-term");
                            const tc = tierColors[tier] || tierColors["long-term"];
                            const beds = p.building?.rooms?.beds ?? p.BedroomsTotal ?? p.beds;
                            const baths = p.building?.rooms?.bathsFull ?? p.BathroomsTotalInteger ?? p.baths;
                            const ownerName = p.owner?.owner1?.fullName || p.ownerName || "";
                            const mailing = p.owner?.mailingAddressOneLine || "";
                            const absentee = p.owner?.absenteeOwnerStatus === "A" || p.owner?.absenteeOwnerStatus?.includes?.("Absentee");
                            const avm = p.avm?.amount?.value;
                            const reasoning = p.reasoning || p.suggestedApproach || "";

                            return (
                              <div
                                key={j}
                                style={{
                                  padding: "8px 10px", borderRadius: 8, fontSize: 11,
                                  border: `2px solid ${score != null ? tc.border : "#e5e7eb"}`,
                                  background: score != null ? tc.bg : "#f9fafb",
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  // Open full property detail modal in new tab
                                  const q = encodeURIComponent(addr);
                                  window.open(`/app/property-detail?address=${q}`, "_blank");
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12, color: tc.text }}>{addr}</div>
                                    <div style={{ color: "#6b7280", marginTop: 2 }}>
                                      {beds != null && `${beds}bd `}{baths != null && `${baths}ba `}
                                      {avm ? `| AVM: ${fmt(avm)} ` : ""}
                                      {p.DaysOnMarket != null && `| ${p.DaysOnMarket}d DOM`}
                                    </div>
                                    {ownerName && (
                                      <div style={{ marginTop: 2, color: "#4b5563" }}>
                                        Owner: {ownerName}
                                        {absentee && <span style={{ marginLeft: 4, padding: "1px 4px", background: "#fef3c7", borderRadius: 3, fontSize: 9, fontWeight: 600, color: "#92400e" }}>Absentee</span>}
                                      </div>
                                    )}
                                    {mailing && (
                                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>Mailing: {mailing}</div>
                                    )}
                                    {reasoning && (
                                      <div style={{ fontSize: 10, color: tc.text, marginTop: 3, fontStyle: "italic" }}>{reasoning}</div>
                                    )}
                                  </div>
                                  {score != null && (
                                    <div style={{ textAlign: "center", minWidth: 44, marginLeft: 8 }}>
                                      <div style={{
                                        width: 40, height: 40, borderRadius: "50%",
                                        background: tc.border, color: "#fff",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 14, fontWeight: 800,
                                      }}>
                                        {score}
                                      </div>
                                      <div style={{ fontSize: 8, color: tc.text, fontWeight: 600, marginTop: 2 }}>
                                        {tier === "hot" ? "HOT" : tier === "warm" ? "WARM" : "WATCH"}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {total > props.length && (
                          <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", marginTop: 4 }}>
                            Showing top {Math.min(props.length, 15)} of {total} total matches
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* DOM results */}
                  {msg.actionResult.data?.results && (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                      {msg.actionResult.data.summary && (
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>
                          {msg.actionResult.data.summary.red || 0} red | {msg.actionResult.data.summary.orange || 0} orange | {msg.actionResult.data.summary.charcoal || 0} charcoal
                        </div>
                      )}
                      {msg.actionResult.data.results.slice(0, 5).map((r: any, j: number) => {
                        const tierColors: Record<string, string> = { red: "#dc2626", orange: "#ea580c", charcoal: "#4b5563" };
                        return (
                          <div key={j} style={{ padding: "6px 8px", background: "#f3f4f6", borderRadius: 6, fontSize: 11, borderLeft: `3px solid ${tierColors[r.tier] || "#9ca3af"}` }}>
                            <div style={{ fontWeight: 600 }}>{r.address}</div>
                            <div style={{ color: "#6b7280" }}>{r.daysOnMarket}d DOM | {r.domRatio}x avg | {fmt(r.listPrice)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Task created */}
                  {msg.actionResult.data?.task && (
                    <div style={{ marginTop: 6, padding: "6px 8px", background: "#f0fdf4", borderRadius: 6, fontSize: 11, borderLeft: "3px solid #059669" }}>
                      Task: {msg.actionResult.data.task.title}
                      {msg.actionResult.data.task.due_date && ` | Due: ${msg.actionResult.data.task.due_date}`}
                      {msg.actionResult.data.task.priority && ` | ${msg.actionResult.data.task.priority}`}
                    </div>
                  )}

                  {/* Calendar event */}
                  {msg.actionResult.data?.event && (
                    <div style={{ marginTop: 6, padding: "6px 8px", background: "#eff6ff", borderRadius: 6, fontSize: 11, borderLeft: "3px solid #3b82f6" }}>
                      Event: {msg.actionResult.data.event.title}
                      {msg.actionResult.data.event.start_at && ` | ${new Date(msg.actionResult.data.event.start_at).toLocaleString()}`}
                    </div>
                  )}

                  {/* Pipeline moved */}
                  {msg.actionResult.data?.previousStage && (
                    <div style={{ marginTop: 6, padding: "6px 8px", background: "#faf5ff", borderRadius: 6, fontSize: 11, borderLeft: "3px solid #7c3aed" }}>
                      Pipeline: {msg.actionResult.data.previousStage} → {msg.actionResult.data.newStage}
                    </div>
                  )}

                  {/* Draft */}
                  {msg.actionResult.data?.draft && (
                    <div style={{ marginTop: 6, padding: "8px", background: "#fffbeb", borderRadius: 6, fontSize: 11, borderLeft: "3px solid #f59e0b" }}>
                      {msg.actionResult.data.draft.subject && <div style={{ fontWeight: 600, marginBottom: 4 }}>Subject: {msg.actionResult.data.draft.subject}</div>}
                      <div style={{ whiteSpace: "pre-wrap", color: "#374151" }}>{msg.actionResult.data.draft.body}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Error result */}
              {msg.actionResult && !msg.actionResult.success && (
                <div style={{ marginTop: 6, padding: "6px 8px", background: "#fef2f2", borderRadius: 6, fontSize: 11, color: "#991b1b" }}>
                  Error: {msg.actionResult.error}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
            <div style={{
              padding: "10px 14px", borderRadius: "12px 12px 12px 2px",
              background: "#fff", border: "1px solid #e5e7eb",
              display: "flex", gap: 4,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                  animation: `bounce 1.4s infinite ${i * 0.16}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        padding: "10px 14px", borderTop: "1px solid #e5e7eb",
        display: "flex", gap: 8, background: "#fff",
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
          placeholder="Ask Hoku anything..."
          disabled={loading}
          style={{
            flex: 1, padding: "8px 12px", border: "1px solid #d1d5db",
            borderRadius: 8, fontSize: 13, outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "8px 14px", borderRadius: 8, border: "none",
            background: loading ? "#9ca3af" : "#4f46e5",
            color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>

      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }`}</style>
    </div>
  );
}

export default GenieCopilotPopup;
