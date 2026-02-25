"use client";

import { useState, useEffect, useCallback } from "react";

interface PipelineLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  heatScore: number;
  timeline: string | null;
  financing: string | null;
  property: string;
  eventId: string;
  pipelineStage: string;
  createdAt: string;
}

interface PipelineStageData {
  key: string;
  label: string;
  count: number;
  leads: PipelineLead[];
}

const STAGE_COLORS: Record<string, string> = {
  new_lead: "#6366f1",
  initial_contact: "#3b82f6",
  qualification: "#8b5cf6",
  initial_consultation: "#a855f7",
  property_search_listing_prep: "#ec4899",
  open_houses_and_tours: "#f59e0b",
  offer_and_negotiation: "#f97316",
  under_contract_escrow: "#14b8a6",
  closing_coordination: "#06b6d4",
  closed_and_followup: "#10b981",
  review_request: "#84cc16",
};

function getHeatBadge(score: number) {
  if (score >= 80) return { label: "Hot", bg: "#fef2f2", color: "#ef4444" };
  if (score >= 50) return { label: "Warm", bg: "#fffbeb", color: "#f59e0b" };
  return { label: "Cold", bg: "#eff6ff", color: "#3b82f6" };
}

export default function LocalPipelineClient() {
  const [stages, setStages] = useState<PipelineStageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);

  // Lead detail drawer
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch("/api/leads/pipeline");
      const data = await res.json();
      if (res.ok && data.stages) {
        setStages(data.stages);
      } else {
        setError(data.error || "Failed to load pipeline");
      }
    } catch {
      setError("Failed to load pipeline data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const advanceLead = async (
    leadId: string,
    direction: "forward" | "backward"
  ) => {
    setMovingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/advance-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (res.ok) {
        await fetchPipeline();
        // Update selected lead if it was the one moved
        if (selectedLead?.id === leadId) {
          const data = await res.json().catch(() => null);
          if (data?.newStage) {
            setSelectedLead((prev) =>
              prev ? { ...prev, pipelineStage: data.newStage } : null
            );
          }
        }
      }
    } catch {
      // Silently fail - data will be stale but not lost
    } finally {
      setMovingLeadId(null);
    }
  };

  const moveToStage = async (leadId: string, stage: string) => {
    setMovingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/advance-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) {
        await fetchPipeline();
      }
    } catch {
      // Silently fail
    } finally {
      setMovingLeadId(null);
    }
  };

  const totalLeads = stages.reduce((sum, s) => sum + s.count, 0);

  if (error && stages.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          background: "#fef2f2",
          borderRadius: 12,
          color: "#dc2626",
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {error}
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

  if (totalLeads === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          background: "#f9fafb",
          borderRadius: 12,
          color: "#6b7280",
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          No leads in the pipeline yet
        </p>
        <p style={{ fontSize: 14 }}>
          Publish an open house and have attendees check in via QR to get
          started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Bar */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          padding: 16,
          background: "#f9fafb",
          borderRadius: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
            Total Leads
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalLeads}</div>
        </div>
        {/* Mini stage indicator */}
        <div
          style={{
            display: "flex",
            gap: 2,
            flex: 1,
            minWidth: 200,
            alignItems: "flex-end",
            height: 32,
          }}
        >
          {stages.map((s) => (
            <div
              key={s.key}
              title={`${s.label}: ${s.count}`}
              style={{
                flex: 1,
                height: s.count > 0 ? Math.max(8, Math.min(32, s.count * 8)) : 4,
                background:
                  s.count > 0
                    ? STAGE_COLORS[s.key] || "#d1d5db"
                    : "#e5e7eb",
                borderRadius: 2,
                transition: "height 0.2s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ overflowX: "auto", paddingBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            minWidth: stages.length * 260,
          }}
        >
          {stages.map((stage) => {
            const color = STAGE_COLORS[stage.key] || "#6b7280";
            return (
              <div
                key={stage.key}
                style={{
                  minWidth: 240,
                  maxWidth: 280,
                  flex: "1 0 240px",
                  background: "#f9fafb",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "calc(100vh - 320px)",
                }}
              >
                {/* Stage Header */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: `3px solid ${color}`,
                    borderRadius: "12px 12px 0 0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#111827",
                      }}
                    >
                      {stage.label}
                    </span>
                    <span
                      style={{
                        background: color,
                        color: "#fff",
                        padding: "2px 7px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {stage.count}
                    </span>
                  </div>
                </div>

                {/* Lead Cards */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {stage.leads.length === 0 ? (
                    <div
                      style={{
                        padding: 16,
                        textAlign: "center",
                        color: "#9ca3af",
                        fontSize: 12,
                      }}
                    >
                      No leads
                    </div>
                  ) : (
                    stage.leads.map((lead) => {
                      const heat = getHeatBadge(lead.heatScore);
                      const isMoving = movingLeadId === lead.id;
                      return (
                        <div
                          key={lead.id}
                          style={{
                            background: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            padding: 10,
                            opacity: isMoving ? 0.5 : 1,
                            transition: "all 0.15s",
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedLead(lead)}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.boxShadow =
                              "0 2px 8px rgba(0,0,0,0.08)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.boxShadow = "none")
                          }
                        >
                          {/* Name + Heat */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                color: "#111827",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "65%",
                              }}
                            >
                              {lead.name}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: heat.bg,
                                color: heat.color,
                              }}
                            >
                              {lead.heatScore}
                            </span>
                          </div>

                          {/* Property */}
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              marginBottom: 6,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {lead.property}
                          </div>

                          {/* Quick advance buttons */}
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              justifyContent: "flex-end",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => advanceLead(lead.id, "backward")}
                              disabled={isMoving || stage.key === "new_lead"}
                              style={{
                                padding: "2px 8px",
                                fontSize: 11,
                                border: "1px solid #e5e7eb",
                                borderRadius: 4,
                                background: "#fff",
                                cursor:
                                  stage.key === "new_lead"
                                    ? "not-allowed"
                                    : "pointer",
                                color:
                                  stage.key === "new_lead"
                                    ? "#d1d5db"
                                    : "#6b7280",
                              }}
                              title="Move back"
                            >
                              ←
                            </button>
                            <button
                              onClick={() => advanceLead(lead.id, "forward")}
                              disabled={
                                isMoving || stage.key === "review_request"
                              }
                              style={{
                                padding: "2px 8px",
                                fontSize: 11,
                                border: "1px solid #e5e7eb",
                                borderRadius: 4,
                                background:
                                  stage.key === "review_request"
                                    ? "#fff"
                                    : color,
                                color:
                                  stage.key === "review_request"
                                    ? "#d1d5db"
                                    : "#fff",
                                cursor:
                                  stage.key === "review_request"
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                              title="Advance"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "40px 16px",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLead(null);
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 540,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ padding: 24 }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 20,
                }}
              >
                <div>
                  <h2
                    style={{ fontSize: 20, fontWeight: 700, margin: 0 }}
                  >
                    {selectedLead.name}
                  </h2>
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: 13,
                      margin: "4px 0 0",
                    }}
                  >
                    {selectedLead.property}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Lead Info Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  padding: 16,
                  background: "#f9fafb",
                  borderRadius: 10,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    Heat Score
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: getHeatBadge(selectedLead.heatScore).color,
                    }}
                  >
                    {selectedLead.heatScore} —{" "}
                    {getHeatBadge(selectedLead.heatScore).label}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    Timeline
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {selectedLead.timeline || "—"}
                  </div>
                </div>
                {selectedLead.email && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        fontWeight: 600,
                      }}
                    >
                      Email
                    </div>
                    <div style={{ fontSize: 14, color: "#374151" }}>
                      {selectedLead.email}
                    </div>
                  </div>
                )}
                {selectedLead.phone && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        fontWeight: 600,
                      }}
                    >
                      Phone
                    </div>
                    <div style={{ fontSize: 14, color: "#374151" }}>
                      {selectedLead.phone}
                    </div>
                  </div>
                )}
                {selectedLead.financing && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        fontWeight: 600,
                      }}
                    >
                      Financing
                    </div>
                    <div style={{ fontSize: 14, color: "#374151" }}>
                      {selectedLead.financing}
                    </div>
                  </div>
                )}
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    Captured
                  </div>
                  <div style={{ fontSize: 14, color: "#374151" }}>
                    {new Date(selectedLead.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Move to Stage */}
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Move to Stage
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {stages.map((s) => {
                    const isCurrentStage =
                      s.key === selectedLead.pipelineStage;
                    const stageColor =
                      STAGE_COLORS[s.key] || "#6b7280";
                    return (
                      <button
                        key={s.key}
                        onClick={() => {
                          if (!isCurrentStage) {
                            moveToStage(selectedLead.id, s.key);
                            setSelectedLead(null);
                          }
                        }}
                        disabled={isCurrentStage}
                        style={{
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          border: `1.5px solid ${stageColor}`,
                          borderRadius: 6,
                          background: isCurrentStage
                            ? stageColor
                            : "#fff",
                          color: isCurrentStage ? "#fff" : stageColor,
                          cursor: isCurrentStage
                            ? "default"
                            : "pointer",
                          transition: "all 0.1s",
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
