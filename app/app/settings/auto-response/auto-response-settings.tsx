"use client";

import { useState, useEffect } from "react";

interface AutoResponseConfig {
  enabled: boolean;
  autoReplyEmail: boolean;
  afterHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  maxAutoRepliesPerContact: number;
  escalateAfterReplies: number;
  greeting: string;
}

export default function AutoResponseSettings() {
  const [config, setConfig] = useState<AutoResponseConfig>({
    enabled: false,
    autoReplyEmail: false,
    afterHoursOnly: false,
    businessHoursStart: "08:00",
    businessHoursEnd: "18:00",
    maxAutoRepliesPerContact: 5,
    escalateAfterReplies: 3,
    greeting: "Thanks for reaching out! I'll get back to you shortly.",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/messaging/auto-response")
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/messaging/auto-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: "Settings saved!", type: "success" });
      } else {
        setToast({ message: data.error || "Failed to save", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Loading settings...</div>;
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

      {/* Main Toggle */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>AI SMS Auto-Response</h3>
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
              Automatically respond to inbound SMS messages using AI
            </p>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: 48, height: 26 }}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
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
                background: config.enabled ? "#3b82f6" : "#d1d5db",
                borderRadius: 26,
                transition: "0.3s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  height: 20,
                  width: 20,
                  left: config.enabled ? 24 : 3,
                  bottom: 3,
                  background: "hsl(var(--card))",
                  borderRadius: "50%",
                  transition: "0.3s",
                }}
              />
            </span>
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>AI Email Auto-Response</h3>
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>Auto-respond to inbound emails (via GHL)</p>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: 48, height: 26 }}>
            <input
              type="checkbox"
              checked={config.autoReplyEmail}
              onChange={(e) => setConfig({ ...config, autoReplyEmail: e.target.checked })}
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
                background: config.autoReplyEmail ? "#3b82f6" : "#d1d5db",
                borderRadius: 26,
                transition: "0.3s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  height: 20,
                  width: 20,
                  left: config.autoReplyEmail ? 24 : 3,
                  bottom: 3,
                  background: "hsl(var(--card))",
                  borderRadius: "50%",
                  transition: "0.3s",
                }}
              />
            </span>
          </label>
        </div>
      </div>

      {/* Schedule */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Schedule</h3>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={config.afterHoursOnly}
            onChange={(e) => setConfig({ ...config, afterHoursOnly: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
          />
          <label style={{ fontSize: 14, color: "hsl(var(--foreground))" }}>Only auto-respond outside business hours</label>
        </div>

        {config.afterHoursOnly && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 4 }}>
                Business Hours Start
              </label>
              <input
                type="time"
                value={config.businessHoursStart}
                onChange={(e) => setConfig({ ...config, businessHoursStart: e.target.value })}
                style={{ width: "100%", padding: 10, border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 4 }}>
                Business Hours End
              </label>
              <input
                type="time"
                value={config.businessHoursEnd}
                onChange={(e) => setConfig({ ...config, businessHoursEnd: e.target.value })}
                style={{ width: "100%", padding: 10, border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 14 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Limits & Escalation */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Limits & Escalation</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 4 }}>
              Max Auto-Replies Per Contact
            </label>
            <input
              type="number"
              value={config.maxAutoRepliesPerContact}
              onChange={(e) => setConfig({ ...config, maxAutoRepliesPerContact: parseInt(e.target.value) || 5 })}
              min={1}
              max={50}
              style={{ width: "100%", padding: 10, border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 14 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 4 }}>
              Escalate to Agent After
            </label>
            <input
              type="number"
              value={config.escalateAfterReplies}
              onChange={(e) => setConfig({ ...config, escalateAfterReplies: parseInt(e.target.value) || 3 })}
              min={1}
              max={20}
              style={{ width: "100%", padding: 10, border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 14 }}
            />
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>replies before notifying you</div>
          </div>
        </div>
      </div>

      {/* Custom Greeting */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Greeting Message</h3>
        <textarea
          value={config.greeting}
          onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
          rows={3}
          placeholder="Custom greeting for first-time contacts..."
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 14,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
        <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
          This greeting is sent as the first message when a new contact texts you.
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: "12px 32px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: isSaving ? "wait" : "pointer",
          }}
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
