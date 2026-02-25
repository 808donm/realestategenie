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

interface MLSImportProps {
  onImport: (property: MLSPropertyData) => void;
}

export default function MLSImport({ onImport }: MLSImportProps) {
  const [mlsNumber, setMlsNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imported, setImported] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!mlsNumber.trim()) return;
    setLoading(true);
    setError("");
    setImported(null);

    try {
      const res = await fetch(`/api/mls/calculator-lookup?mlsNumber=${encodeURIComponent(mlsNumber.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Listing not found");
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
        <input
          type="text"
          value={mlsNumber}
          onChange={(e) => setMlsNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder="Enter MLS #"
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
          disabled={loading || !mlsNumber.trim()}
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
          {loading ? "Looking up..." : "Import"}
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
    </div>
  );
}
