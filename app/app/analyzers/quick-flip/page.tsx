import Link from "next/link";
import STRAnalyzerClient from "./str-analyzer.client";

export default function STRAnalyzerPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link href="/app/analyzers" style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}>
          &larr; Back to Analyzers
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/app/analyzers/rental"
            style={{
              padding: "6px 12px",
              background: "#f3f4f6",
              borderRadius: 6,
              fontSize: 13,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            Rental Analyzer
          </Link>
          <Link
            href="/app/analyzers/brrr"
            style={{
              padding: "6px 12px",
              background: "#f3f4f6",
              borderRadius: 6,
              fontSize: 13,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            BRRR
          </Link>
          <Link
            href="/app/analyzers/flip"
            style={{
              padding: "6px 12px",
              background: "#f3f4f6",
              borderRadius: 6,
              fontSize: 13,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            House Flip
          </Link>
        </div>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Short-Term Rental Analyzer (VRBO/Airbnb)
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Airbnb & VRBO cash flow analysis with STR-specific taxes, expense breakdown, and multi-year equity projections
      </p>

      <STRAnalyzerClient />
    </div>
  );
}
