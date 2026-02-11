import Link from "next/link";
import NetSheetCalculatorClient from "./net-sheet-calculator.client";

export default function NetSheetCalculatorPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Navigation Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link
          href="/app/analyzers"
          style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}
        >
          &larr; Back to Analyzers
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/app/analyzers/investment"
            style={{
              padding: "6px 12px",
              background: "#f3f4f6",
              borderRadius: 6,
              fontSize: 13,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            Investment
          </Link>
          <Link
            href="/app/analyzers/mortgage"
            style={{
              padding: "6px 12px",
              background: "#f3f4f6",
              borderRadius: 6,
              fontSize: 13,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            Mortgage
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
            Flip
          </Link>
        </div>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Seller Net Sheet Calculator
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Estimate seller proceeds after commissions, closing costs, mortgage payoff, and concessions
      </p>

      <NetSheetCalculatorClient />
    </div>
  );
}
