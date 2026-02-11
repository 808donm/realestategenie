import Link from "next/link";
import MortgageCalculatorClient from "./mortgage-calculator.client";

export default function MortgageCalculatorPage() {
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
            Flip
          </Link>
        </div>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Mortgage Calculator
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Calculate monthly payments including principal, interest, taxes, insurance, and HOA fees
      </p>

      <MortgageCalculatorClient />
    </div>
  );
}
