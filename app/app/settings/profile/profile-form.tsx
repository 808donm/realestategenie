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
};

export default function ProfileForm({ agent }: { agent: Agent }) {
  const supabase = supabaseBrowser();

  const [displayName, setDisplayName] = useState(agent.display_name ?? "");
  const [licenseNumber, setLicenseNumber] = useState(agent.license_number ?? "");
  const [phoneInput, setPhoneInput] = useState(agent.phone_e164 ?? "");
  const [locationsCsv, setLocationsCsv] = useState(
    (agent.locations_served ?? []).join(", ")
  );

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const normalizedPhone = useMemo(() => {
    if (!phoneInput.trim()) return null;
    return toE164US(phoneInput.trim());
  }, [phoneInput]);

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
        phone_e164: normalizedPhone,
        locations_served: locations,
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
