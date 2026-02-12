"use client";

import { useState } from "react";

type OpenHouseFormProps = {
  startDefault: string;
  endDefault: string;
  onSubmit: (formData: FormData) => Promise<void>;
};

export default function OpenHouseForm({
  startDefault,
  endDefault,
  onSubmit,
}: OpenHouseFormProps) {
  const [address, setAddress] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err?.message || "Failed to create open house. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
      {/* Event type is always sales for open houses; rentals are managed in PM Showings */}
      <input type="hidden" name="event_type" value="sales" />

      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Address</label>
        <input
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ width: "100%", padding: 10 }}
          placeholder="123 Main St, Honolulu, HI"
          required
          disabled={submitting}
        />
        <p style={{ fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
          We'll automatically geocode this address to show a map on your open house page.
        </p>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Start</label>
          <input
            name="start_at"
            type="datetime-local"
            defaultValue={startDefault}
            style={{ width: "100%", padding: 10 }}
            required
            disabled={submitting}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>End</label>
          <input
            name="end_at"
            type="datetime-local"
            defaultValue={endDefault}
            style={{ width: "100%", padding: 10 }}
            required
            disabled={submitting}
          />
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, color: "crimson", fontSize: 13, fontWeight: 600 }}>{error}</p>
      )}

      <button disabled={submitting} style={{ padding: 12, fontWeight: 900, opacity: submitting ? 0.6 : 1, cursor: submitting ? "wait" : "pointer" }}>
        {submitting ? "Creating..." : "Create"}
      </button>
      <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
        After creating, you'll publish it and generate the QR check-in link.
      </p>
    </form>
  );
}
