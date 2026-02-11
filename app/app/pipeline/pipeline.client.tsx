"use client";

import { useState, useEffect, useCallback } from "react";

interface Opportunity {
  id: string;
  name: string;
  monetaryValue: number;
  contactId: string;
  contactName: string;
  status: string;
  createdAt?: string;
}

interface PipelineStage {
  stageId: string;
  stageName: string;
  position: number;
  opportunityCount: number;
  totalValue: number;
  opportunities: Opportunity[];
}

interface PipelineData {
  pipelineId: string;
  pipelineName: string;
  stages: PipelineStage[];
  totalOpportunities: number;
  totalValue: number;
}

interface ContactDetail {
  contact: any;
  notes: any[];
  conversations: any[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const STAGE_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#6366f1", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

export default function PipelineClient() {
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Lead detail modal
  const [selectedLead, setSelectedLead] = useState<Opportunity | null>(null);
  const [contactDetail, setContactDetail] = useState<ContactDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Fetch available pipelines
  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        const res = await fetch("/api/ghl/pipelines");
        const data = await res.json();
        if (res.ok && data.pipelines) {
          setPipelines(data.pipelines);
          const saved = localStorage.getItem("pipeline_selected_id");
          const defaultId = saved && data.pipelines.find((p: any) => p.id === saved)
            ? saved
            : data.pipelines[0]?.id || "";
          setSelectedPipelineId(defaultId);
        } else {
          setError(data.error || "Failed to load pipelines");
          setIsLoading(false);
        }
      } catch {
        setError("Failed to load pipelines. Is GoHighLevel connected?");
        setIsLoading(false);
      }
    };
    fetchPipelines();
  }, []);

  // Fetch pipeline breakdown when selected pipeline changes
  const fetchBreakdown = useCallback(async (pipelineId: string) => {
    if (!pipelineId) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ghl/pipeline-breakdown?pipelineId=${pipelineId}`);
      const data = await res.json();
      if (res.ok) {
        setPipelineData(data);
      } else {
        setError(data.error || "Failed to load pipeline data");
      }
    } catch {
      setError("Failed to load pipeline data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPipelineId) {
      localStorage.setItem("pipeline_selected_id", selectedPipelineId);
      fetchBreakdown(selectedPipelineId);
    }
  }, [selectedPipelineId, fetchBreakdown]);

  // Fetch contact detail when a lead is selected
  const openLeadDetail = async (lead: Opportunity) => {
    setSelectedLead(lead);
    setContactDetail(null);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/ghl/contact-detail?contactId=${lead.contactId}`);
      const data = await res.json();
      if (res.ok) {
        setContactDetail(data);
      }
    } catch {
      // Detail fetch failed - still show what we have
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedLead(null);
    setContactDetail(null);
  };

  if (error && !pipelineData) {
    return (
      <div style={{ padding: 40, textAlign: "center", background: "#fef2f2", borderRadius: 12, color: "#dc2626" }}>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{error}</p>
        <p style={{ fontSize: 14, color: "#6b7280" }}>
          Make sure GoHighLevel is connected in your Integrations settings.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#6b7280" }}>
        Loading pipeline...
      </div>
    );
  }

  const stages = pipelineData?.stages?.sort((a, b) => a.position - b.position) || [];

  return (
    <div>
      {/* Pipeline Selector */}
      {pipelines.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            style={{
              padding: "8px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
              background: "#fff",
            }}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Summary Bar */}
      {pipelineData && (
        <div style={{
          display: "flex", gap: 20, marginBottom: 20, padding: 16,
          background: "#f9fafb", borderRadius: 12, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Pipeline</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{pipelineData.pipelineName}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Total Deals</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{pipelineData.totalOpportunities}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Total Value</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(pipelineData.totalValue)}</div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div style={{
        overflowX: "auto",
        paddingBottom: 16,
      }}>
        <div style={{
          display: "flex",
          gap: 16,
          minWidth: stages.length * 300,
        }}>
          {stages.map((stage, idx) => (
            <div
              key={stage.stageId}
              style={{
                minWidth: 280,
                maxWidth: 320,
                flex: "1 0 280px",
                background: "#f9fafb",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                maxHeight: "calc(100vh - 300px)",
              }}
            >
              {/* Stage Header */}
              <div style={{
                padding: "12px 16px",
                borderBottom: `3px solid ${STAGE_COLORS[idx % STAGE_COLORS.length]}`,
                borderRadius: "12px 12px 0 0",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{stage.stageName}</span>
                  <span style={{
                    background: STAGE_COLORS[idx % STAGE_COLORS.length],
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {stage.opportunityCount}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  {formatCurrency(stage.totalValue)}
                </div>
              </div>

              {/* Cards */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}>
                {stage.opportunities.length === 0 ? (
                  <div style={{
                    padding: 20,
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: 13,
                  }}>
                    No deals
                  </div>
                ) : (
                  stage.opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => openLeadDetail(opp)}
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: 12,
                        cursor: "pointer",
                        transition: "box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "#111827" }}>
                        {opp.contactName || "Unknown Contact"}
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                        {opp.name}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#059669" }}>
                          {opp.monetaryValue ? formatCurrency(opp.monetaryValue) : "—"}
                        </span>
                        <span style={{
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 600,
                          background: opp.status === "won" ? "#dcfce7" : opp.status === "lost" ? "#fee2e2" : "#f3f4f6",
                          color: opp.status === "won" ? "#16a34a" : opp.status === "lost" ? "#dc2626" : "#6b7280",
                        }}>
                          {opp.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", zIndex: 50,
            display: "flex", justifyContent: "center", alignItems: "flex-start",
            padding: "40px 16px", overflowY: "auto",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}
        >
          <div style={{
            background: "#fff", borderRadius: 16, maxWidth: 700, width: "100%",
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ padding: 24 }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
                    {selectedLead.contactName || "Unknown Contact"}
                  </h2>
                  <p style={{ color: "#6b7280", fontSize: 14, margin: "4px 0 0" }}>
                    {selectedLead.name}
                  </p>
                </div>
                <button
                  onClick={closeDetail}
                  style={{
                    padding: "6px 12px", border: "1px solid #d1d5db",
                    borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 16,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Deal Info */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
                padding: 16, background: "#f9fafb", borderRadius: 10, marginBottom: 20,
              }}>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Deal Value</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>
                    {selectedLead.monetaryValue ? formatCurrency(selectedLead.monetaryValue) : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Status</div>
                  <div style={{ fontSize: 16, fontWeight: 600, textTransform: "capitalize" }}>
                    {selectedLead.status}
                  </div>
                </div>
              </div>

              {isLoadingDetail ? (
                <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                  Loading contact details...
                </div>
              ) : contactDetail ? (
                <>
                  {/* Contact Info */}
                  {contactDetail.contact && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#374151" }}>
                        Contact Information
                      </h3>
                      <div style={{
                        display: "grid", gridTemplateColumns: "120px 1fr",
                        gap: "6px 12px", fontSize: 14,
                      }}>
                        {contactDetail.contact.name && (
                          <>
                            <span style={{ fontWeight: 600, color: "#374151" }}>Name:</span>
                            <span style={{ color: "#6b7280" }}>{contactDetail.contact.name}</span>
                          </>
                        )}
                        {contactDetail.contact.email && (
                          <>
                            <span style={{ fontWeight: 600, color: "#374151" }}>Email:</span>
                            <span style={{ color: "#6b7280" }}>{contactDetail.contact.email}</span>
                          </>
                        )}
                        {contactDetail.contact.phone && (
                          <>
                            <span style={{ fontWeight: 600, color: "#374151" }}>Phone:</span>
                            <span style={{ color: "#6b7280" }}>{contactDetail.contact.phone}</span>
                          </>
                        )}
                        {contactDetail.contact.address1 && (
                          <>
                            <span style={{ fontWeight: 600, color: "#374151" }}>Address:</span>
                            <span style={{ color: "#6b7280" }}>
                              {[contactDetail.contact.address1, contactDetail.contact.city, contactDetail.contact.state, contactDetail.contact.postalCode].filter(Boolean).join(", ")}
                            </span>
                          </>
                        )}
                        {contactDetail.contact.tags?.length > 0 && (
                          <>
                            <span style={{ fontWeight: 600, color: "#374151" }}>Tags:</span>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {contactDetail.contact.tags.map((tag: string) => (
                                <span key={tag} style={{
                                  padding: "2px 8px", background: "#e0e7ff",
                                  color: "#4f46e5", borderRadius: 4, fontSize: 12,
                                }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#374151" }}>
                      Notes ({contactDetail.notes.length})
                    </h3>
                    {contactDetail.notes.length === 0 ? (
                      <p style={{ color: "#9ca3af", fontSize: 14 }}>No notes yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {contactDetail.notes.map((note: any, i: number) => (
                          <div key={note.id || i} style={{
                            padding: 12, background: "#fffbeb",
                            border: "1px solid #fef3c7", borderRadius: 8, fontSize: 13,
                          }}>
                            <div style={{ whiteSpace: "pre-wrap", color: "#374151" }}>{note.body}</div>
                            {note.dateAdded && (
                              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                                {new Date(note.dateAdded).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Conversations */}
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#374151" }}>
                      Conversations ({contactDetail.conversations.length})
                    </h3>
                    {contactDetail.conversations.length === 0 ? (
                      <p style={{ color: "#9ca3af", fontSize: 14 }}>No conversations yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {contactDetail.conversations.map((conv: any) => (
                          <div key={conv.id} style={{
                            border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden",
                          }}>
                            <div style={{
                              padding: "8px 12px", background: "#f3f4f6",
                              fontSize: 12, fontWeight: 600, color: "#374151",
                            }}>
                              {conv.type || "Conversation"} — {conv.lastMessageDate
                                ? new Date(conv.lastMessageDate).toLocaleString()
                                : ""}
                            </div>
                            {conv.messages && conv.messages.length > 0 ? (
                              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                                {conv.messages.map((msg: any, i: number) => (
                                  <div key={msg.id || i} style={{
                                    padding: "6px 10px",
                                    background: msg.direction === "outbound" ? "#dbeafe" : "#f3f4f6",
                                    borderRadius: 6, fontSize: 13,
                                    alignSelf: msg.direction === "outbound" ? "flex-end" : "flex-start",
                                    maxWidth: "85%",
                                  }}>
                                    <div style={{ color: "#374151" }}>
                                      {msg.body || msg.message || msg.text || ""}
                                    </div>
                                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                                      {msg.dateAdded ? new Date(msg.dateAdded).toLocaleString() : ""}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ padding: 12, color: "#9ca3af", fontSize: 13 }}>
                                No messages loaded.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: 20 }}>
                  Could not load contact details.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
