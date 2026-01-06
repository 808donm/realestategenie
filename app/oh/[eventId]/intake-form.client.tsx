"use client";

import { useMemo, useState } from "react";

function toE164US(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  const onlyNums = digits.replace(/\D/g, "");

  if (digits.startsWith("+")) {
    const cleaned = "+" + onlyNums;
    const len = cleaned.replace("+", "").length;
    if (len >= 8 && len <= 15) return cleaned;
    return null;
  }

  if (onlyNums.length === 10) return `+1${onlyNums}`;
  if (onlyNums.length === 11 && onlyNums.startsWith("1")) return `+${onlyNums}`;
  return null;
}

type Representation = "yes" | "no" | "unsure";
type Timeline = "0-3 months" | "3-6 months" | "6+ months" | "just browsing";
type Financing = "pre-approved" | "cash" | "need lender" | "not sure";

type IntakeFormProps = {
  eventId: string;
  agentName?: string;
  brokerageName?: string;
  accessToken: string;
};

export default function IntakeForm({ eventId, agentName, brokerageName, accessToken }: IntakeFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  const [consentSms, setConsentSms] = useState(false);
  const [consentEmail, setConsentEmail] = useState(false);

  const [representation, setRepresentation] = useState<Representation>("unsure");
  const [wantsAgentReachOut, setWantsAgentReachOut] = useState(true);

  const [timeline, setTimeline] = useState<Timeline>("0-3 months");
  const [financing, setFinancing] = useState<Financing>("not sure");
  const [neighborhoods, setNeighborhoods] = useState("");
  const [mustHaves, setMustHaves] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const phoneE164 = useMemo(() => {
    if (!phoneInput.trim()) return null;
    return toE164US(phoneInput.trim());
  }, [phoneInput]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!name.trim()) return setErr("Name is required.");
    if (!email.trim()) return setErr("Email is required.");
    if (!phoneE164) return setErr("Phone number is required and must be valid.");

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone_e164: phoneE164,
      consent: {
        sms: consentSms,
        email: consentEmail,
        captured_at: new Date().toISOString(),
      },
      representation,
      wants_agent_reach_out: representation === "no" ? wantsAgentReachOut : false,
      timeline,
      financing,
      neighborhoods: neighborhoods.trim(),
      must_haves: mustHaves.trim(),
      source: "open_house_qr",
    };

    const r = await fetch("/api/leads/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId, payload, accessToken }),
    });

    const j = await r.json().catch(() => ({}));

    setSubmitting(false);

    if (!r.ok) {
      setErr(j.error || `Submission failed (${r.status})`);
      return;
    }

    // Redirect to thank you page
    window.location.href = `/oh/${eventId}/thank-you`;
  }

  return (
    <div style={{ marginTop: 10 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
        Quick check-in
      </h2>
      <p style={{ opacity: 0.75, marginTop: 0 }}>
        This helps the agent follow up appropriately.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 10 }} required />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ width: "100%", padding: 10 }} required />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Phone</label>
          <input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="(808) 555-1234"
            style={{ width: "100%", padding: 10 }}
            required
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            {phoneE164 ? <>Will save as: <code>{phoneE164}</code></> : <>Enter a valid phone number</>}
          </div>
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Consent</div>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={consentEmail} onChange={(e) => setConsentEmail(e.target.checked)} />
            <span style={{ fontSize: 14 }}>I agree to receive emails about listings and follow-up.</span>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <input type="checkbox" checked={consentSms} onChange={(e) => setConsentSms(e.target.checked)} />
            <span style={{ fontSize: 14 }}>
              I agree to receive SMS messages relating to this open house listing and follow-up relating to this listing.
            </span>
          </label>

          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            By checking these boxes, you consent to receive communications via email and/or SMS from{" "}
            {agentName && <strong>{agentName}</strong>}
            {agentName && brokerageName && " at "}
            {brokerageName && <strong>{brokerageName}</strong>}
            {!agentName && !brokerageName && "the listing agent"}
            . Message/data rates may apply. Reply STOP to opt out or HELP for support. See our{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "underline" }}>
              Terms of Service
            </a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "underline" }}>
              Privacy Policy
            </a>.
          </p>
          <p style={{ marginTop: 8, fontSize: 12, fontWeight: 600, opacity: 0.8 }}>
            We value your privacy and will never sell your information.
          </p>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
            Are you currently represented by an agent?
          </label>
          <select
            value={representation}
            onChange={(e) => setRepresentation(e.target.value as Representation)}
            style={{ padding: 10 }}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
            <option value="unsure">Not sure</option>
          </select>
        </div>

        {representation === "no" && (
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
            <div style={{ fontWeight: 800 }}>Would you like the agent to reach out?</div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
              <input
                type="checkbox"
                checked={wantsAgentReachOut}
                onChange={(e) => setWantsAgentReachOut(e.target.checked)}
              />
              <span>Yes, please contact me.</span>
            </label>
          </div>
        )}

        {representation === "yes" && (
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12, opacity: 0.9 }}>
            <strong>Note:</strong> If you’re represented, please coordinate offers and next steps through your agent.
          </div>
        )}

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Timeline</label>
            <select value={timeline} onChange={(e) => setTimeline(e.target.value as Timeline)} style={{ padding: 10, width: "100%" }}>
              <option value="0-3 months">0–3 months</option>
              <option value="3-6 months">3–6 months</option>
              <option value="6+ months">6–12 months</option>
              <option value="just browsing">Just browsing</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Financing</label>
            <select value={financing} onChange={(e) => setFinancing(e.target.value as Financing)} style={{ padding: 10, width: "100%" }}>
              <option value="pre-approved">Pre-approved</option>
              <option value="cash">Cash</option>
              <option value="need lender">Need a lender</option>
              <option value="not sure">Not sure</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Neighborhoods of interest</label>
          <input value={neighborhoods} onChange={(e) => setNeighborhoods(e.target.value)} placeholder="Kaka‘ako, Kailua..." style={{ width: "100%", padding: 10 }} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Must-haves</label>
          <input value={mustHaves} onChange={(e) => setMustHaves(e.target.value)} placeholder="3 bed, parking..." style={{ width: "100%", padding: 10 }} />
        </div>

        <button disabled={submitting} style={{ padding: 12, fontWeight: 800 }}>
          {submitting ? "Submitting…" : "Check in"}
        </button>

        {err && <p style={{ color: "crimson", margin: 0 }}>{err}</p>}
        {msg && <p style={{ color: "green", margin: 0 }}>{msg}</p>}
      </form>
    </div>
  );
}
