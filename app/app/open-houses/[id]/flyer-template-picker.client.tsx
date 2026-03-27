"use client";

import { useState, useRef } from "react";
import { FLYER_TEMPLATES } from "@/lib/flyer-templates";

type Props = {
  eventId: string;
  currentTemplateId: string;
};

type ImageSlotConfig = {
  slot: "primary" | "secondary" | "tertiary";
  label: string;
  recommendation: string;
};

const TEMPLATE_IMAGE_SLOTS: Record<string, ImageSlotConfig[]> = {
  "modern-blue": [
    { slot: "primary", label: "Hero Image", recommendation: "1200 x 600 px (2:1 ratio)" },
    { slot: "secondary", label: "Secondary Image", recommendation: "1200 x 400 px (3:1 ratio)" },
  ],
  "elegant-warm": [
    { slot: "primary", label: "Main Image (large left)", recommendation: "800 x 600 px (4:3 ratio)" },
    { slot: "secondary", label: "Top Right Image", recommendation: "400 x 290 px (4:3 ratio)" },
    { slot: "tertiary", label: "Bottom Right Image", recommendation: "400 x 290 px (4:3 ratio)" },
  ],
};

export default function FlyerTemplatePicker({ eventId, currentTemplateId }: Props) {
  const [selected, setSelected] = useState(currentTemplateId);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  async function handleImageUpload(slot: string, file: File) {
    setUploading(slot);
    setUploadMsg(null);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch(`/api/open-houses/${eventId}/photo?slot=${slot}`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setUploadMsg(`${slot} image uploaded successfully`);
        setTimeout(() => setUploadMsg(null), 3000);
      } else {
        const data = await res.json();
        setUploadMsg(data.error || "Upload failed");
      }
    } catch {
      setUploadMsg("Upload failed");
    }
    setUploading(null);
  }

  const imageSlots = TEMPLATE_IMAGE_SLOTS[selected];

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
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: t.defaultSettings.primaryColor,
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                  title="Primary color"
                />
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: t.defaultSettings.secondaryColor,
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                  title="Secondary color"
                />
              </div>

              {isActive && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>Selected</div>
              )}
            </button>
          );
        })}
      </div>

      {saving && <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Saving...</p>}
      {msg && (
        <p style={{ marginTop: 8, fontSize: 12, color: msg === "Template saved" ? "#16a34a" : "crimson" }}>{msg}</p>
      )}

      {/* Image upload section for templates that need multiple images */}
      {imageSlots && (
        <div
          style={{ marginTop: 24, padding: 20, background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 4 }}>Flyer Images</h3>
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 0, marginBottom: 16 }}>
            Upload images for your flyer. Follow the recommended dimensions for best results.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {imageSlots.map((slotConfig) => (
              <div
                key={slotConfig.slot}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 12,
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{slotConfig.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>Recommended: {slotConfig.recommendation}</div>
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Accepted: JPEG, PNG, WebP (max 5MB)</div>
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={(el) => {
                    fileInputRefs.current[slotConfig.slot] = el;
                  }}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(slotConfig.slot, file);
                    e.target.value = "";
                  }}
                />

                <button
                  onClick={() => fileInputRefs.current[slotConfig.slot]?.click()}
                  disabled={uploading === slotConfig.slot}
                  style={{
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    background: uploading === slotConfig.slot ? "#d1d5db" : "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: uploading === slotConfig.slot ? "wait" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {uploading === slotConfig.slot ? "Uploading..." : "Upload"}
                </button>
              </div>
            ))}
          </div>

          {uploadMsg && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                color: uploadMsg.includes("successfully") ? "#16a34a" : "crimson",
              }}
            >
              {uploadMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
