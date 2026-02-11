import Link from "next/link";
import CommissionSplitClient from "./commission-split.client";

export default function CommissionSplitPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link
          href="/app/analyzers"
          style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}
        >
          &larr; Back to Analyzers
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/app/analyzers/net-sheet" style={{ padding: "6px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>
            Seller Net Sheet
          </Link>
          <Link href="/app/analyzers/cash-to-close" style={{ padding: "6px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>
            Cash-to-Close
          </Link>
          <Link href="/app/analyzers/mortgage" style={{ padding: "6px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>
            Mortgage
          </Link>
        </div>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Commission Split Calculator
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Calculate agent net and brokerage gross after splits, caps, fees, and team overrides
      </p>

      <CommissionSplitClient />
    </div>
  );
}
