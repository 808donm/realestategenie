"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

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
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  // Lead detail drawer
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);

  // Draft follow-up email
  const [draftEmail, setDraftEmail] = useState<{ subject: string; body: string } | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);

  // Drag and drop state
  const [draggedLead, setDraggedLead] = useState<PipelineLead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  const showToast = useCallback((message: string, type: "error" | "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

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
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error || "Failed to move lead", "error");
        return;
      }
      // Update selected lead if it was the one moved
      if (selectedLead?.id === leadId && data?.newStage) {
        setSelectedLead((prev) =>
          prev ? { ...prev, pipelineStage: data.newStage } : null
        );
      }
      await fetchPipeline();
    } catch {
      showToast("Network error — could not move lead", "error");
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
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error || "Failed to move lead", "error");
        return;
      }
      await fetchPipeline();
    } catch {
      showToast("Network error — could not move lead", "error");
    } finally {
      setMovingLeadId(null);
    }
  };

  const handleDraftFollowUp = async (leadId: string) => {
    setIsDrafting(true);
    setDraftEmail(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/draft-followup`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setDraftEmail(data);
      }
    } catch {
      // Failed to draft
    } finally {
      setIsDrafting(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, lead: PipelineLead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lead.id);
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedLead(null);
    setDragOverStage(null);
    dragCounterRef.current = {};
  };

  const handleDragEnter = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    dragCounterRef.current[stageKey] = (dragCounterRef.current[stageKey] || 0) + 1;
    if (draggedLead && stageKey !== draggedLead.pipelineStage) {
      setDragOverStage(stageKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    dragCounterRef.current[stageKey] = (dragCounterRef.current[stageKey] || 0) - 1;
    if (dragCounterRef.current[stageKey] <= 0) {
      dragCounterRef.current[stageKey] = 0;
      if (dragOverStage === stageKey) {
        setDragOverStage(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);
    dragCounterRef.current = {};
    if (draggedLead && stageKey !== draggedLead.pipelineStage) {
      moveToStage(draggedLead.id, stageKey);
    }
    setDraggedLead(null);
  };

  const totalLeads = stages.reduce((sum, s) => sum + s.count, 0);

  const exportPipeline = (format: "pdf" | "xlsx") => {
    const allLeads = stages.flatMap((s) => s.leads.map((l) => ({
      name: l.name,
      email: l.email || "",
      phone: l.phone || "",
      property: l.property,
      stage: stages.find((st) => st.key === l.pipelineStage)?.label || l.pipelineStage,
      heatScore: l.heatScore,
      date: new Date(l.createdAt).toLocaleDateString(),
    })));
    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(allLeads);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pipeline");
      XLSX.writeFile(wb, `Pipeline_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      let y = 20;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Sales Pipeline Export", pw / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated ${new Date().toLocaleDateString()} | ${allLeads.length} leads`, pw / 2, y, { align: "center" });
      y += 12;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const cols = [14, 45, 85, 120, 150, 175];
      ["Name", "Email", "Property", "Stage", "Score", "Date"].forEach((h, i) => doc.text(h, cols[i], y));
      y += 2;
      doc.line(14, y, pw - 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      allLeads.forEach((r) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(r.name.slice(0, 16), cols[0], y);
        doc.text(r.email.slice(0, 20), cols[1], y);
        doc.text(r.property.slice(0, 18), cols[2], y);
        doc.text(r.stage.slice(0, 15), cols[3], y);
        doc.text(String(r.heatScore), cols[4], y);
        doc.text(r.date, cols[5], y);
        y += 5;
      });
      doc.save(`Pipeline_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
    }
  };

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
      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100,
            padding: "12px 20px",
            borderRadius: 8,
            background: toast.type === "error" ? "#fef2f2" : "#ecfdf5",
            border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#a7f3d0"}`,
            color: toast.type === "error" ? "#dc2626" : "#059669",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toast.message}
        </div>
      )}

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
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          Drag cards to move between stages
        </div>
        <div className="noprint" style={{ display: "flex", gap: 6 }}>
          <button onClick={() => exportPipeline("xlsx")} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", color: "#374151", cursor: "pointer" }}>Export Excel</button>
          <button onClick={() => exportPipeline("pdf")} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 6, background: "#dc2626", color: "#fff", cursor: "pointer" }}>Export PDF</button>
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
            const isDragTarget = dragOverStage === stage.key;
            return (
              <div
                key={stage.key}
                onDragEnter={(e) => handleDragEnter(e, stage.key)}
                onDragLeave={(e) => handleDragLeave(e, stage.key)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
                style={{
                  minWidth: 240,
                  maxWidth: 280,
                  flex: "1 0 240px",
                  background: isDragTarget ? `${color}10` : "#f9fafb",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "calc(100vh - 320px)",
                  outline: isDragTarget ? `2px dashed ${color}` : "none",
                  transition: "background 0.15s, outline 0.15s",
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
                    minHeight: 60,
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
                      {isDragTarget ? "Drop here" : "No leads"}
                    </div>
                  ) : (
                    stage.leads.map((lead) => {
                      const heat = getHeatBadge(lead.heatScore);
                      const isMoving = movingLeadId === lead.id;
                      const isDragging = draggedLead?.id === lead.id;
                      return (
                        <div
                          key={lead.id}
                          draggable={!isMoving}
                          onDragStart={(e) => handleDragStart(e, lead)}
                          onDragEnd={handleDragEnd}
                          style={{
                            background: "#fff",
                            border: isDragging ? `2px dashed ${color}` : "1px solid #e5e7eb",
                            borderRadius: 8,
                            padding: 10,
                            opacity: isMoving || isDragging ? 0.4 : 1,
                            transition: "all 0.15s",
                            cursor: isMoving ? "wait" : "grab",
                          }}
                          onClick={() => {
                            if (!isDragging) setSelectedLead(lead);
                          }}
                          onMouseEnter={(e) => {
                            if (!isDragging) {
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                            }
                          }}
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

                          {/* Quick contact actions */}
                          {(lead.phone || lead.email) && (
                            <div style={{ display: "flex", gap: 4, marginBottom: 4 }} onClick={(e) => e.stopPropagation()}>
                              {lead.phone && (
                                <a href={`tel:${lead.phone}`} style={{ padding: "2px 6px", background: "#ecfdf5", color: "#059669", borderRadius: 4, fontSize: 10, fontWeight: 600, textDecoration: "none" }}>Call</a>
                              )}
                              {lead.phone && (
                                <a href={`sms:${lead.phone}`} style={{ padding: "2px 6px", background: "#eff6ff", color: "#2563eb", borderRadius: 4, fontSize: 10, fontWeight: 600, textDecoration: "none" }}>Text</a>
                              )}
                              {lead.email && (
                                <a href={`mailto:${lead.email}`} style={{ padding: "2px 6px", background: "#fef3c7", color: "#d97706", borderRadius: 4, fontSize: 10, fontWeight: 600, textDecoration: "none" }}>Email</a>
                              )}
                            </div>
                          )}

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
            if (e.target === e.currentTarget) {
              setSelectedLead(null);
              setDraftEmail(null);
            }
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
                  onClick={() => {
                    setSelectedLead(null);
                    setDraftEmail(null);
                  }}
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

              {/* Draft Follow-Up Email */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    Follow-Up Email
                  </div>
                  <button
                    onClick={() => handleDraftFollowUp(selectedLead.id)}
                    disabled={isDrafting}
                    style={{
                      padding: "4px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid #6366f1",
                      borderRadius: 6,
                      background: isDrafting ? "#e5e7eb" : "#6366f1",
                      color: isDrafting ? "#9ca3af" : "#fff",
                      cursor: isDrafting ? "not-allowed" : "pointer",
                    }}
                  >
                    {isDrafting ? "Drafting..." : "Draft Email"}
                  </button>
                </div>

                {draftEmail && (
                  <div
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Subject
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#111827",
                        marginBottom: 12,
                      }}
                    >
                      {draftEmail.subject}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Body
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "#374151",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {draftEmail.body}
                    </div>
                    {selectedLead.email && (
                      <a
                        href={`mailto:${selectedLead.email}?subject=${encodeURIComponent(draftEmail.subject)}&body=${encodeURIComponent(draftEmail.body)}`}
                        style={{
                          display: "inline-block",
                          marginTop: 12,
                          padding: "6px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          background: "#059669",
                          color: "#fff",
                          borderRadius: 6,
                          textDecoration: "none",
                        }}
                      >
                        Open in Email Client
                      </a>
                    )}
                  </div>
                )}
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
