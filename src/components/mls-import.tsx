"use client";

import { useState } from "react";

export interface MLSPropertyData {
  listingKey: string;
  listingId: string;
  address: string;
  listPrice: number;
  livingArea: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  propertyType: string;
  propertySubType: string;
  numberOfUnits: number;
  taxAnnual: number;
  insuranceAnnual: number;
  associationFee: number;
  status: string;
}

interface AddressResult {
  listingKey: string;
  listingId: string;
  address: string;
  listPrice: number;
  status: string;
}

interface MLSImportProps {
  onImport: (property: MLSPropertyData) => void;
}

export default function MLSImport({ onImport }: MLSImportProps) {
  const [searchMode, setSearchMode] = useState<"mls" | "address">("mls");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imported, setImported] = useState<string | null>(null);
  const [addressResults, setAddressResults] = useState<AddressResult[] | null>(null);

  const handleLookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setImported(null);
    setAddressResults(null);

    try {
      const param = searchMode === "mls"
        ? `mlsNumber=${encodeURIComponent(query.trim())}`
        : `address=${encodeURIComponent(query.trim())}`;
      const res = await fetch(`/api/mls/calculator-lookup?${param}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Listing not found");
        return;
      }

      // Multiple address matches — let user pick
      if (data.multiple && data.results) {
        setAddressResults(data.results);
        return;
      }

      onImport(data.property);
      setImported(data.property.address);
    } catch {
      setError("Failed to connect to MLS");
    } finally {
      setLoading(false);
    }
  };

  const handlePickResult = async (listingKey: string) => {
    setLoading(true);
    setError("");
    setAddressResults(null);

    try {
      const res = await fetch(`/api/mls/calculator-lookup?mlsNumber=${encodeURIComponent(listingKey)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load listing");
        return;
      }

      onImport(data.property);
      setImported(data.property.address);
    } catch {
      setError("Failed to connect to MLS");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8", whiteSpace: "nowrap" }}>
          Import from MLS
        </span>

        {/* Search mode toggle */}
        <div
          style={{
            display: "flex",
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid #93c5fd",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => { setSearchMode("mls"); setQuery(""); setError(""); setAddressResults(null); setImported(null); }}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: searchMode === "mls" ? "#2563eb" : "#fff",
              color: searchMode === "mls" ? "#fff" : "#2563eb",
            }}
          >
            MLS #
          </button>
          <button
            onClick={() => { setSearchMode("address"); setQuery(""); setError(""); setAddressResults(null); setImported(null); }}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              borderLeft: "1px solid #93c5fd",
              cursor: "pointer",
              background: searchMode === "address" ? "#2563eb" : "#fff",
              color: searchMode === "address" ? "#fff" : "#2563eb",
            }}
          >
            Address
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder={searchMode === "mls" ? "Enter MLS #" : "Enter street address"}
          style={{
            flex: 1,
            padding: "6px 10px",
            border: "1px solid #93c5fd",
            borderRadius: 6,
            fontSize: 13,
            minWidth: 0,
          }}
        />
        <button
          onClick={handleLookup}
          disabled={loading || !query.trim()}
          style={{
            padding: "6px 14px",
            background: loading ? "#93c5fd" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Searching..." : "Import"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626" }}>{error}</div>
      )}
      {imported && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#16a34a" }}>
          Imported: {imported}
        </div>
      )}

      {/* Multiple address results — let user pick */}
      {addressResults && addressResults.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8", marginBottom: 6 }}>
            Multiple listings found — select one:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {addressResults.map((r) => (
              <button
                key={r.listingKey}
                onClick={() => handlePickResult(r.listingKey)}
                disabled={loading}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "#fff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 6,
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#dbeafe")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{r.address}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    MLS# {r.listingId} &middot; {r.status}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: "#1d4ed8", whiteSpace: "nowrap", marginLeft: 12 }}>
                  {fmt(r.listPrice)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
