"use client";

import { useState } from "react";
import { FLYER_TEMPLATES } from "@/lib/flyer-templates";

type Props = {
  eventId: string;
  currentTemplateId: string;
};

export default function FlyerTemplatePicker({ eventId, currentTemplateId }: Props) {
  const [selected, setSelected] = useState(currentTemplateId);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function selectTemplate(templateId: string) {
    setSelected(templateId);
    setSaving(true);
    setMsg(null);

    const res = await fetch(`/api/open-houses/${eventId}/template`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ template_id: templateId }),
    });

    setSaving(false);
    if (res.ok) {
      setMsg("Template saved");
      setTimeout(() => setMsg(null), 2000);
    } else {
      setMsg("Failed to save");
    }
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Flyer Template</h2>
      <p style={{ fontSize: 13, opacity: 0.7, marginTop: 0, marginBottom: 16 }}>
        Choose a template for this open house flyer. Click to select.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {FLYER_TEMPLATES.map((t) => {
          const isActive = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => selectTemplate(t.id)}
              disabled={saving}
              style={{
                padding: 14,
                border: isActive ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                borderRadius: 10,
                background: isActive ? "#eff6ff" : "#fff",
                cursor: saving ? "wait" : "pointer",
                textAlign: "left",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>{t.category}</div>
              <div style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.85 }}>
                {t.description.length > 80 ? t.description.slice(0, 80) + "..." : t.description}
              </div>

              {/* Color swatches */}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <div
                  style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: t.defaultSettings.primaryColor,
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                  title="Primary color"
                />
                <div
                  style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: t.defaultSettings.secondaryColor,
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                  title="Secondary color"
                />
              </div>

              {isActive && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>
                  Selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {saving && (
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Saving...</p>
      )}
      {msg && (
        <p style={{ marginTop: 8, fontSize: 12, color: msg === "Template saved" ? "#16a34a" : "crimson" }}>
          {msg}
        </p>
      )}
    </div>
  );
}
