"use client";

import { useState, useMemo } from "react";

interface Lead {
  id: string;
  created_at: string;
  payload: {
    name?: string;
    email?: string;
    phone_e164?: string;
    representation?: string;
    timeline?: string;
    financing?: string;
    [key: string]: unknown;
  };
  contacted_at: string | null;
  contact_method: string | null;
  contact_notes: string | null;
}

interface ScorecardClientProps {
  eventId: string;
  leads: Lead[];
  contactTrackingEnabled?: boolean;
}

export default function ScorecardClient({ eventId, leads: initialLeads, contactTrackingEnabled = true }: ScorecardClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Calculate scorecard metrics
  const metrics = useMemo(() => {
    const totalSignIns = leads.length;
    const contacted = leads.filter((l) => l.contacted_at);
    const contactedWithin5Min = leads.filter((l) => {
      if (!l.contacted_at) return false;
      const signInTime = new Date(l.created_at).getTime();
      const contactTime = new Date(l.contacted_at).getTime();
      const diffMinutes = (contactTime - signInTime) / (1000 * 60);
      return diffMinutes <= 5;
    });

    // Check representation field for realtor status
    const hasRealtor = leads.filter((l) => {
      const rep = (l.payload?.representation || "").toLowerCase();
      return rep.includes("have") || rep.includes("yes") || rep.includes("working");
    });

    const lookingForAgent = leads.filter((l) => {
      const rep = (l.payload?.representation || "").toLowerCase();
      return (
        !rep ||
        rep.includes("no") ||
        rep.includes("looking") ||
        rep.includes("need") ||
        rep === "" ||
        rep === "none"
      );
    });

    return {
      totalSignIns,
      totalContacted: contacted.length,
      contactedWithin5Min: contactedWithin5Min.length,
      hasRealtor: hasRealtor.length,
      lookingForAgent: lookingForAgent.length,
      percentContacted: totalSignIns > 0 ? Math.round((contacted.length / totalSignIns) * 100) : 0,
      percentWithin5Min: totalSignIns > 0 ? Math.round((contactedWithin5Min.length / totalSignIns) * 100) : 0,
      percentHasRealtor: totalSignIns > 0 ? Math.round((hasRealtor.length / totalSignIns) * 100) : 0,
      percentLookingForAgent: totalSignIns > 0 ? Math.round((lookingForAgent.length / totalSignIns) * 100) : 0,
    };
  }, [leads]);

  // Mark lead as contacted
  const markContacted = async (leadId: string, method: string) => {
    setUpdating(leadId);
    setError("");

    try {
      const response = await fetch(`/api/open-houses/${eventId}/scorecard`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          contacted_at: new Date().toISOString(),
          contact_method: method,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }

      // Update local state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, contacted_at: new Date().toISOString(), contact_method: method }
            : l
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark contacted");
    } finally {
      setUpdating(null);
    }
  };

  // Score color based on percentage
  const getScoreColor = (percent: number, inverse: boolean = false) => {
    if (inverse) {
      // For "has realtor" - lower is better (more opportunities)
      if (percent <= 30) return "#10b981";
      if (percent <= 60) return "#f59e0b";
      return "#ef4444";
    }
    // Higher is better
    if (percent >= 70) return "#10b981";
    if (percent >= 40) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div>
      {error && (
        <div style={{ padding: 12, background: "#fee2e2", color: "#dc2626", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Scorecard Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {/* Total Sign-Ins */}
        <div
          style={{
            padding: 20,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
            Sign-Ins Captured
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#111827" }}>
            {metrics.totalSignIns}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            Total attendees
          </div>
        </div>

        {/* Contacted Within 5 Min */}
        <div
          style={{
            padding: 20,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
            Contacted Within 5 Min
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: getScoreColor(metrics.percentWithin5Min),
            }}
          >
            {metrics.percentWithin5Min}%
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {metrics.contactedWithin5Min} of {metrics.totalSignIns}
          </div>
        </div>

        {/* Has Realtor */}
        <div
          style={{
            padding: 20,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
            Represented by Realtor
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: getScoreColor(metrics.percentHasRealtor, true),
            }}
          >
            {metrics.percentHasRealtor}%
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {metrics.hasRealtor} of {metrics.totalSignIns}
          </div>
        </div>

        {/* Looking for Agent */}
        <div
          style={{
            padding: 20,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
            Looking for an Agent
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: getScoreColor(metrics.percentLookingForAgent),
            }}
          >
            {metrics.percentLookingForAgent}%
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
            {metrics.lookingForAgent} of {metrics.totalSignIns}
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div
        style={{
          padding: 24,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 12,
          color: "#fff",
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        <div style={{ fontSize: 16, opacity: 0.9, marginBottom: 8 }}>
          Overall Performance Score
        </div>
        <div style={{ fontSize: 48, fontWeight: 700 }}>
          {Math.round(
            (metrics.percentWithin5Min * 0.4 +
              metrics.percentLookingForAgent * 0.3 +
              (100 - metrics.percentHasRealtor) * 0.3)
          )}
          /100
        </div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
          Based on response time (40%), opportunity rate (30%), and lead quality (30%)
        </div>
      </div>

      {/* Lead Contact Tracking Table */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          Contact Tracking
        </h2>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
          Mark leads as contacted to track your 5-minute response rate. Speed to lead matters!
        </p>
      </div>

      {leads.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "#f9fafb",
            borderRadius: 12,
            color: "#6b7280",
          }}
        >
          No sign-ins yet. Share your QR code to start capturing leads!
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  Name
                </th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  Contact Info
                </th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  Sign-In Time
                </th>
                <th style={{ padding: 12, textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  Representation
                </th>
                <th style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>
                  Status
                </th>
                <th style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const isContacted = !!lead.contacted_at;
                const signInTime = new Date(lead.created_at);
                const contactTime = lead.contacted_at ? new Date(lead.contacted_at) : null;
                const responseMinutes = contactTime
                  ? Math.round((contactTime.getTime() - signInTime.getTime()) / (1000 * 60))
                  : null;
                const within5Min = responseMinutes !== null && responseMinutes <= 5;

                return (
                  <tr key={lead.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600 }}>{lead.payload?.name || "Unknown"}</div>
                    </td>
                    <td style={{ padding: 12, fontSize: 13 }}>
                      {lead.payload?.email && (
                        <div>
                          <a href={`mailto:${lead.payload.email}`} style={{ color: "#3b82f6" }}>
                            {lead.payload.email}
                          </a>
                        </div>
                      )}
                      {lead.payload?.phone_e164 && (
                        <div>
                          <a href={`tel:${lead.payload.phone_e164}`} style={{ color: "#3b82f6" }}>
                            {lead.payload.phone_e164}
                          </a>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 12, fontSize: 13 }}>
                      {signInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          background:
                            lead.payload?.representation?.toLowerCase().includes("no") ||
                            !lead.payload?.representation
                              ? "#dcfce7"
                              : "#fef3c7",
                          color:
                            lead.payload?.representation?.toLowerCase().includes("no") ||
                            !lead.payload?.representation
                              ? "#166534"
                              : "#92400e",
                        }}
                      >
                        {lead.payload?.representation || "None / Looking"}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {isContacted ? (
                        <div>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 12,
                              background: within5Min ? "#dcfce7" : "#fee2e2",
                              color: within5Min ? "#166534" : "#dc2626",
                            }}
                          >
                            {within5Min ? "Within 5 min" : `${responseMinutes} min`}
                          </span>
                          {lead.contact_method && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                              via {lead.contact_method}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            background: "#fef3c7",
                            color: "#92400e",
                          }}
                        >
                          Not contacted
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {!isContacted && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            onClick={() => markContacted(lead.id, "call")}
                            disabled={updating === lead.id}
                            style={{
                              padding: "6px 10px",
                              fontSize: 12,
                              background: "#3b82f6",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              cursor: updating === lead.id ? "wait" : "pointer",
                              opacity: updating === lead.id ? 0.7 : 1,
                            }}
                          >
                            Call
                          </button>
                          <button
                            onClick={() => markContacted(lead.id, "text")}
                            disabled={updating === lead.id}
                            style={{
                              padding: "6px 10px",
                              fontSize: 12,
                              background: "#10b981",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              cursor: updating === lead.id ? "wait" : "pointer",
                              opacity: updating === lead.id ? 0.7 : 1,
                            }}
                          >
                            Text
                          </button>
                          <button
                            onClick={() => markContacted(lead.id, "email")}
                            disabled={updating === lead.id}
                            style={{
                              padding: "6px 10px",
                              fontSize: 12,
                              background: "#8b5cf6",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              cursor: updating === lead.id ? "wait" : "pointer",
                              opacity: updating === lead.id ? 0.7 : 1,
                            }}
                          >
                            Email
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
