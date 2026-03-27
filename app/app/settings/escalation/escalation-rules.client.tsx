"use client";

import { useState, useEffect } from "react";

interface EscalationRule {
  id: string;
  name: string;
  trigger: string;
  threshold?: number;
  keywords?: string[];
  action: string;
  description?: string;
  enabled: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  heat_score_above: "Heat Score Above",
  keyword_match: "Keyword Match",
  sentiment_negative: "Negative Sentiment",
  no_response_hours: "No Response (Hours)",
  open_house_count: "Open House Attendance",
};

const ACTION_LABELS: Record<string, string> = {
  notify_agent: "Notify Agent",
  escalate_to_agent: "Escalate to Human Agent",
  create_task: "Create Follow-Up Task",
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  notify_agent: { bg: "#dbeafe", color: "#1d4ed8" },
  escalate_to_agent: { bg: "#fee2e2", color: "#dc2626" },
  create_task: { bg: "#ecfdf5", color: "#059669" },
};

export default function EscalationRulesClient() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/escalation")
      .then((r) => r.json())
      .then((data) => setRules(data.rules || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r)));
    try {
      await fetch("/api/escalation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, enabled }),
      });
      showToast(`Rule ${enabled ? "enabled" : "disabled"}`, "success");
    } catch {
      showToast("Failed to update rule", "error");
      setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled: !enabled } : r)));
    }
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading escalation rules...</div>;
  }

  return (
    <div>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100,
            padding: "12px 20px",
            borderRadius: 8,
            background: toast.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${toast.type === "success" ? "#a7f3d0" : "#fca5a5"}`,
            color: toast.type === "success" ? "#059669" : "#dc2626",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rules.map((rule) => {
          const actionStyle = ACTION_COLORS[rule.action] || { bg: "#f3f4f6", color: "#6b7280" };
          return (
            <div
              key={rule.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 20,
                opacity: rule.enabled ? 1 : 0.6,
                borderLeft: `4px solid ${rule.enabled ? actionStyle.color : "#d1d5db"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{rule.name}</h3>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: actionStyle.bg,
                        color: actionStyle.color,
                        textTransform: "uppercase",
                      }}
                    >
                      {ACTION_LABELS[rule.action] || rule.action}
                    </span>
                  </div>
                  {rule.description && (
                    <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>{rule.description}</p>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: "#f3f4f6",
                        borderRadius: 4,
                        color: "#374151",
                      }}
                    >
                      Trigger: {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                    </span>
                    {rule.threshold != null && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          background: "#fef3c7",
                          borderRadius: 4,
                          color: "#a16207",
                        }}
                      >
                        Threshold: {rule.threshold}
                      </span>
                    )}
                    {rule.keywords && rule.keywords.length > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          background: "#e0e7ff",
                          borderRadius: 4,
                          color: "#3730a3",
                        }}
                      >
                        Keywords: {rule.keywords.slice(0, 3).join(", ")}
                        {rule.keywords.length > 3 ? ` +${rule.keywords.length - 3}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: 44,
                    height: 24,
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => toggleRule(rule.id, e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: rule.enabled ? "#3b82f6" : "#d1d5db",
                      borderRadius: 24,
                      transition: "0.3s",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        height: 18,
                        width: 18,
                        left: rule.enabled ? 22 : 3,
                        bottom: 3,
                        background: "#fff",
                        borderRadius: "50%",
                        transition: "0.3s",
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {rules.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
          No escalation rules configured yet.
        </div>
      )}
    </div>
  );
}
