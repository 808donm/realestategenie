"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// Minimal E.164 normalizer (US-focused MVP)
// - Accepts formats like (808) 555-1212, 808-555-1212, +1 808...
// - Assumes US country code (+1) if 10 digits.
// - If 11 digits starting with 1 => +1...
function toE164US(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  const onlyNums = digits.replace(/\D/g, "");

  if (digits.startsWith("+")) {
    // keep +, strip other non-digits, require 8..15 digits per E.164 practical bounds
    const cleaned = "+" + onlyNums;
    const len = cleaned.replace("+", "").length;
    if (len >= 8 && len <= 15) return cleaned;
    return null;
  }

  if (onlyNums.length === 10) return `+1${onlyNums}`;
  if (onlyNums.length === 11 && onlyNums.startsWith("1")) return `+${onlyNums}`;
  return null;
}

type Agent = {
  id: string;
  email: string | null;
  display_name: string;
  license_number: string | null;
  phone_e164: string | null;
  locations_served: string[] | null;
  photo_url: string | null;
  headshot_url: string | null;
  company_logo_url: string | null;
  agency_name: string | null;
  timezone: string | null;
};

export default function ProfileForm({ agent }: { agent: Agent }) {
  const supabase = supabaseBrowser();

  const [displayName, setDisplayName] = useState(agent.display_name ?? "");
  const [licenseNumber, setLicenseNumber] = useState(agent.license_number ?? "");
  const [agencyName, setAgencyName] = useState(agent.agency_name ?? "");
  const [phoneInput, setPhoneInput] = useState(agent.phone_e164 ?? "");
  const [locationsCsv, setLocationsCsv] = useState(
    (agent.locations_served ?? []).join(", ")
  );
  const [timezone, setTimezone] = useState(agent.timezone ?? "America/New_York");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [headshotUrl, setHeadshotUrl] = useState(agent.headshot_url);
  const [logoUrl, setLogoUrl] = useState(agent.company_logo_url);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const normalizedPhone = useMemo(() => {
    if (!phoneInput.trim()) return null;
    return toE164US(phoneInput.trim());
  }, [phoneInput]);

  async function handleHeadshotUpload(file: File | undefined) {
    if (!file) return;

    setUploadingHeadshot(true);
    setErr(null);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const response = await fetch("/api/agents/headshot", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setHeadshotUrl(data.url);
        setMsg("Headshot uploaded successfully");
      } else {
        const data = await response.json();
        setErr(data.error || "Failed to upload headshot");
      }
    } catch (error: any) {
      setErr(error.message || "Upload failed");
    } finally {
      setUploadingHeadshot(false);
    }
  }

  async function handleHeadshotDelete() {
    if (!confirm("Delete your headshot photo?")) return;

    setUploadingHeadshot(true);

    try {
      const response = await fetch("/api/agents/headshot", {
        method: "DELETE",
      });

      if (response.ok) {
        setHeadshotUrl(null);
        setMsg("Headshot deleted");
      } else {
        setErr("Failed to delete headshot");
      }
    } catch (error: any) {
      setErr(error.message || "Delete failed");
    } finally {
      setUploadingHeadshot(false);
    }
  }

  async function handleLogoUpload(file: File | undefined) {
    if (!file) return;

    setUploadingLogo(true);
    setErr(null);

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/agents/logo", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLogoUrl(data.url);
        setMsg("Company logo uploaded successfully");
      } else {
        const data = await response.json();
        setErr(data.error || "Failed to upload logo");
      }
    } catch (error: any) {
      setErr(error.message || "Upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoDelete() {
    if (!confirm("Delete your company logo?")) return;

    setUploadingLogo(true);

    try {
      const response = await fetch("/api/agents/logo", {
        method: "DELETE",
      });

      if (response.ok) {
        setLogoUrl(null);
        setMsg("Company logo deleted");
      } else {
        setErr("Failed to delete logo");
      }
    } catch (error: any) {
      setErr(error.message || "Delete failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!displayName.trim()) {
      setErr("Name is required.");
      return;
    }

    if (phoneInput.trim() && !normalizedPhone) {
      setErr("Phone must be a valid E.164 number (we accept common US formats).");
      return;
    }

    const locations = locationsCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);

    const { error } = await supabase
      .from("agents")
      .update({
        display_name: displayName.trim(),
        license_number: licenseNumber.trim() || null,
        agency_name: agencyName.trim() || null,
        phone_e164: normalizedPhone,
        locations_served: locations,
        timezone: timezone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id);

    setSaving(false);

    if (error) setErr(error.message);
    else setMsg("Saved.");
  }

  return (
    <form onSubmit={save} style={{ marginTop: 24 }}>
      <div style={{ display: "grid", gap: 14 }}>
        {/* Agent Headshot */}
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
            Agent Photo
          </label>
          {headshotUrl ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <img
                src={headshotUrl}
                alt="Agent headshot"
                style={{ width: 150, height: 150, objectFit: "cover", borderRadius: 8, border: "2px solid #e5e7eb" }}
              />
              <button
                type="button"
                onClick={handleHeadshotDelete}
                disabled={uploadingHeadshot}
                style={{ padding: "8px 12px", width: 150, background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                {uploadingHeadshot ? "Deleting..." : "Delete Photo"}
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleHeadshotUpload(e.target.files?.[0])}
              disabled={uploadingHeadshot}
              style={{ padding: 8 }}
            />
          )}
          {uploadingHeadshot && <p style={{ fontSize: 12, opacity: 0.7, margin: "6px 0 0 0" }}>Uploading...</p>}
        </div>

        {/* Company Logo */}
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
            Company Logo
          </label>
          {logoUrl ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <img
                src={logoUrl}
                alt="Company logo"
                style={{ width: 200, height: 100, objectFit: "contain", borderRadius: 8, border: "2px solid #e5e7eb", padding: 10, background: "white" }}
              />
              <button
                type="button"
                onClick={handleLogoDelete}
                disabled={uploadingLogo}
                style={{ padding: "8px 12px", width: 150, background: "#ef4444", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                {uploadingLogo ? "Deleting..." : "Delete Logo"}
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
              onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              disabled={uploadingLogo}
              style={{ padding: 8 }}
            />
          )}
          {uploadingLogo && <p style={{ fontSize: 12, opacity: 0.7, margin: "6px 0 0 0" }}>Uploading...</p>}
          <p style={{ fontSize: 11, opacity: 0.6, margin: "6px 0 0 0" }}>
            SVG, PNG, JPG, or WebP (5MB max)
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "10px 0" }} />

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Don Mangiarelli"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Phone (E.164 stored)</label>
          <input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="+18085551234 or (808) 555-1234"
            style={{ width: "100%", padding: 10 }}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            {phoneInput.trim()
              ? normalizedPhone
                ? <>Will save as: <code>{normalizedPhone}</code></>
                : <>Not a valid number yet</>
              : <>Optional for now, but recommended</>}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>License number</label>
          <input
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="RB-xxxxxx"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Agency/Company name</label>
          <input
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="Island Properties LLC"
            style={{ width: "100%", padding: 10 }}
          />
          <p style={{ fontSize: 11, opacity: 0.6, margin: "6px 0 0 0" }}>
            Your real estate agency or brokerage name (used in SMS notifications)
          </p>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
            Locations served (comma-separated)
          </label>
          <input
            value={locationsCsv}
            onChange={(e) => setLocationsCsv(e.target.value)}
            placeholder="Honolulu, Kailua, Kapolei"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Phoenix">Mountain Time - Arizona (no DST)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Anchorage">Alaska Time (AKT)</option>
            <option value="Pacific/Honolulu">Hawaii-Aleutian Time (HST)</option>
          </select>
          <p style={{ fontSize: 11, opacity: 0.6, margin: "6px 0 0 0" }}>
            Your timezone is used to generate monthly rent invoices at midnight on the 1st of each month in your local time
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{ padding: 12, fontWeight: 600 }}
        >
          {saving ? "Saving..." : "Save profile"}
        </button>

        {err && <p style={{ color: "crimson", margin: 0 }}>{err}</p>}
        {msg && <p style={{ color: "green", margin: 0 }}>{msg}</p>}
      </div>
    </form>
  );
}
