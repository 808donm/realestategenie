"use client";

import { useState } from "react";

type OpenHouseFormProps = {
  startDefault: string;
  endDefault: string;
  onSubmit: (formData: FormData) => Promise<void>;
};

interface MlsLookupResult {
  mappedFields: {
    address: string;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    price: number | null;
    listing_description: string | null;
    key_features: string[];
    property_photo_url: string | null;
    latitude: number | null;
    longitude: number | null;
    mls_listing_key: string;
    mls_listing_id: string;
    mls_source: string;
  };
  property: {
    listingKey: string;
    listingId: string;
    status: string;
    propertyType: string;
    propertySubType?: string;
    listAgentName?: string;
    listOfficeName?: string;
    onMarketDate?: string;
    photos: { url: string; description: string }[];
    virtualTourUrl?: string;
  };
}

interface AddressCandidate {
  listingKey: string;
  listingId: string;
  address: string;
  status: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  photoUrl: string | null;
}

type SearchMode = "mls" | "address";

export default function OpenHouseForm({ startDefault, endDefault, onSubmit }: OpenHouseFormProps) {
  const [address, setAddress] = useState<string>("");
  const [eventType, setEventType] = useState<"sales" | "rental" | "both">("sales");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MLS lookup state
  const [searchMode, setSearchMode] = useState<SearchMode>("mls");
  const [mlsNumber, setMlsNumber] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [mlsLoading, setMlsLoading] = useState(false);
  const [mlsError, setMlsError] = useState<string | null>(null);
  const [mlsResult, setMlsResult] = useState<MlsLookupResult | null>(null);

  // Multiple address match candidates
  const [candidates, setCandidates] = useState<AddressCandidate[]>([]);
  const [selectingCandidate, setSelectingCandidate] = useState(false);

  // Hidden fields populated from MLS
  const [mlsFields, setMlsFields] = useState<Record<string, string>>({});

  const applyMlsResult = (data: MlsLookupResult) => {
    setMlsResult(data);
    setCandidates([]);
    setAddress(data.mappedFields.address || "");

    const fields: Record<string, string> = {};
    const m = data.mappedFields;
    if (m.beds != null) fields.beds = String(m.beds);
    if (m.baths != null) fields.baths = String(m.baths);
    if (m.sqft != null) fields.sqft = String(m.sqft);
    if (m.price != null) fields.price = String(m.price);
    if (m.listing_description) fields.listing_description = m.listing_description;
    if (m.key_features?.length) fields.key_features = JSON.stringify(m.key_features);
    if (m.property_photo_url) fields.property_photo_url = m.property_photo_url;
    if (m.latitude != null) fields.latitude = String(m.latitude);
    if (m.longitude != null) fields.longitude = String(m.longitude);
    if (m.mls_listing_key) fields.mls_listing_key = m.mls_listing_key;
    if (m.mls_listing_id) fields.mls_listing_id = m.mls_listing_id;
    if (m.mls_source) fields.mls_source = m.mls_source;
    setMlsFields(fields);
  };

  const handleMlsLookup = async () => {
    const query = searchMode === "mls" ? mlsNumber.trim() : addressQuery.trim();
    if (!query) {
      setMlsError(searchMode === "mls" ? "Enter an MLS number." : "Enter an address to search.");
      return;
    }

    setMlsLoading(true);
    setMlsError(null);
    setMlsResult(null);
    setCandidates([]);

    try {
      const body = searchMode === "mls" ? { mlsNumber: query } : { address: query };

      const res = await fetch("/api/mls/lookup-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Not found");
      }

      // Multiple matches — show candidates for the user to pick
      if (data.multiple && data.candidates) {
        setCandidates(data.candidates);
        return;
      }

      applyMlsResult(data);
    } catch (err: any) {
      setMlsError(err?.message || "Failed to look up listing");
    } finally {
      setMlsLoading(false);
    }
  };

  const handleSelectCandidate = async (candidate: AddressCandidate) => {
    setSelectingCandidate(true);
    setMlsError(null);

    try {
      const res = await fetch("/api/mls/lookup-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingKey: candidate.listingKey }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load listing details");
      }

      applyMlsResult(data);
    } catch (err: any) {
      setMlsError(err?.message || "Failed to load listing details");
    } finally {
      setSelectingCandidate(false);
    }
  };

  const clearMls = () => {
    setMlsResult(null);
    setMlsFields({});
    setMlsNumber("");
    setAddressQuery("");
    setMlsError(null);
    setCandidates([]);
    setAddress("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const addr = String(formData.get("address") || "").trim();
    const startAt = String(formData.get("start_at") || "").trim();
    const endAt = String(formData.get("end_at") || "").trim();

    // Validate required fields with specific messages
    const missing: string[] = [];
    if (!addr) missing.push("Address");
    if (!startAt) missing.push("Start date/time");
    if (!endAt) missing.push("End date/time");

    if (missing.length > 0) {
      setError(`Please fill in the following required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
      return;
    }

    // Validate date logic
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (endDate <= startDate) {
      setError("End date/time must be after the start date/time.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      // Next.js redirect() throws a NEXT_REDIRECT error — let it propagate
      if (err?.digest?.includes("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT")) {
        throw err;
      }
      setError(err?.message || "Failed to create open house. Please try again.");
      setSubmitting(false);
    }
  };

  const fmt = (n: number) => `$${n.toLocaleString()}`;
  const inputValue = searchMode === "mls" ? mlsNumber : addressQuery;
  const setInputValue = searchMode === "mls" ? setMlsNumber : setAddressQuery;
  const hasInput = inputValue.trim().length > 0;
  const isLocked = !!mlsResult || candidates.length > 0;

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
      {/* Event Type Selector */}
      <input type="hidden" name="event_type" value={eventType} />
      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Event Type</label>
        <div style={{ display: "flex", gap: 0 }}>
          {[
            { value: "sales" as const, label: "Open House (Sales)" },
            { value: "rental" as const, label: "Rental Showing" },
            { value: "both" as const, label: "Both" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEventType(opt.value)}
              disabled={submitting}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid hsl(var(--border))",
                borderRight: opt.value === "both" ? "1px solid #d1d5db" : "none",
                borderRadius: opt.value === "sales" ? "8px 0 0 8px" : opt.value === "both" ? "0 8px 8px 0" : "0",
                background: eventType === opt.value ? "#4f46e5" : "#fff",
                color: eventType === opt.value ? "#fff" : "#374151",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
          {eventType === "sales" && "Visitors will see the buyer check-in form."}
          {eventType === "rental" && "Visitors will see the rental application form."}
          {eventType === "both" && "Visitors will choose between buyer check-in or rental application."}
        </p>
      </div>

      {/* Hidden MLS fields */}
      {Object.entries(mlsFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {/* MLS Import Section */}
      <div
        style={{
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 10,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0369a1", marginBottom: 8 }}>Import from MLS</div>
        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: "0 0 10px 0" }}>
          Look up a listing by MLS number or address to auto-fill property details.
        </p>

        {/* Search mode toggle */}
        {!isLocked && (
          <div style={{ display: "flex", gap: 0, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => {
                setSearchMode("mls");
                setMlsError(null);
              }}
              style={{
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid hsl(var(--border))",
                borderRight: "none",
                borderRadius: "6px 0 0 6px",
                background: searchMode === "mls" ? "#0284c7" : "#fff",
                color: searchMode === "mls" ? "#fff" : "#374151",
                cursor: "pointer",
              }}
            >
              MLS Number
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMode("address");
                setMlsError(null);
              }}
              style={{
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid hsl(var(--border))",
                borderRadius: "0 6px 6px 0",
                background: searchMode === "address" ? "#0284c7" : "#fff",
                color: searchMode === "address" ? "#fff" : "#374151",
                cursor: "pointer",
              }}
            >
              Address
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleMlsLookup();
                }
              }}
              placeholder={searchMode === "mls" ? "e.g. H12345678" : "e.g. 123 Main St, Honolulu"}
              disabled={mlsLoading || submitting || isLocked}
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                background: mlsResult ? "#f0fdf4" : "#fff",
              }}
            />
          </div>
          {!isLocked ? (
            <button
              type="button"
              onClick={handleMlsLookup}
              disabled={mlsLoading || !hasInput}
              style={{
                padding: "9px 18px",
                fontWeight: 600,
                fontSize: 13,
                background: "#0284c7",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: mlsLoading || !hasInput ? "not-allowed" : "pointer",
                opacity: mlsLoading || !hasInput ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {mlsLoading ? "Searching..." : searchMode === "mls" ? "Look Up" : "Search"}
            </button>
          ) : (
            <button
              type="button"
              onClick={clearMls}
              disabled={submitting || selectingCandidate}
              style={{
                padding: "9px 18px",
                fontWeight: 600,
                fontSize: 13,
                background: "hsl(var(--card))",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: 6,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {mlsError && <p style={{ margin: "8px 0 0 0", color: "#dc2626", fontSize: 12, fontWeight: 600 }}>{mlsError}</p>}

        {/* Address search — multiple results to pick from */}
        {candidates.length > 0 && !mlsResult && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: 8 }}>
              {candidates.length} listing{candidates.length === 1 ? "" : "s"} found — select one:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {candidates.map((c) => (
                <button
                  key={c.listingKey}
                  type="button"
                  disabled={selectingCandidate}
                  onClick={() => handleSelectCandidate(c)}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: 10,
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    cursor: selectingCandidate ? "wait" : "pointer",
                    textAlign: "left",
                    opacity: selectingCandidate ? 0.6 : 1,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!selectingCandidate) e.currentTarget.style.borderColor = "#93c5fd";
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                >
                  {c.photoUrl && (
                    <img
                      src={c.photoUrl}
                      alt=""
                      style={{
                        width: 56,
                        height: 42,
                        objectFit: "cover",
                        borderRadius: 4,
                        border: "1px solid hsl(var(--border))",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 1 }}>{c.address}</div>
                    <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                      {[
                        c.beds != null ? `${c.beds} bed` : null,
                        c.baths != null ? `${c.baths} bath` : null,
                        c.sqft ? `${c.sqft.toLocaleString()} sqft` : null,
                        c.price ? `$${c.price.toLocaleString()}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>MLS# {c.listingId}</div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: c.status === "Active" ? "#059669" : c.status === "Pending" ? "#d97706" : "#6b7280",
                      }}
                    >
                      {c.status}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MLS Preview Card — selected listing */}
        {mlsResult && (
          <div
            style={{
              marginTop: 12,
              background: "hsl(var(--card))",
              border: "1px solid #d1fae5",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {mlsResult.mappedFields.property_photo_url && (
                <img
                  src={mlsResult.mappedFields.property_photo_url}
                  alt="Property"
                  style={{
                    width: 100,
                    height: 75,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{mlsResult.mappedFields.address}</div>
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {mlsResult.mappedFields.beds != null && <span>{mlsResult.mappedFields.beds} bed</span>}
                  {mlsResult.mappedFields.baths != null && <span>{mlsResult.mappedFields.baths} bath</span>}
                  {mlsResult.mappedFields.sqft != null && (
                    <span>{mlsResult.mappedFields.sqft.toLocaleString()} sqft</span>
                  )}
                  {mlsResult.mappedFields.price != null && (
                    <span style={{ color: "#059669", fontWeight: 600 }}>{fmt(mlsResult.mappedFields.price)}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
                  MLS# {mlsResult.property.listingId} · {mlsResult.property.status}
                  {mlsResult.property.listAgentName && ` · ${mlsResult.property.listAgentName}`}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 8,
                padding: "6px 10px",
                background: "#f0fdf4",
                borderRadius: 6,
                fontSize: 11,
                color: "#166534",
                fontWeight: 600,
              }}
            >
              Property details will be auto-filled: address, beds, baths, sqft, price, description, photo, and
              coordinates.
            </div>
          </div>
        )}
      </div>

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
          {mlsResult
            ? "Auto-filled from MLS. You can edit this if needed."
            : "We'll automatically geocode this address to show a map on your open house page."}
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
        <div
          style={{
            margin: 0,
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#dc2626",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <button
        disabled={submitting}
        style={{ padding: 12, fontWeight: 900, opacity: submitting ? 0.6 : 1, cursor: submitting ? "wait" : "pointer" }}
      >
        {submitting ? "Creating..." : "Create"}
      </button>
      <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
        After creating, you'll publish it and generate the QR check-in link.
      </p>
    </form>
  );
}
