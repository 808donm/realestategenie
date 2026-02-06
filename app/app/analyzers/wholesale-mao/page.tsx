import Link from "next/link";
import WholesaleMaoClient from "./wholesale-mao.client";

export default function WholesaleMaoPage() {
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
          <Link href="/app/analyzers/quick-flip" style={{ padding: "6px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>
            Quick Flip
          </Link>
          <Link href="/app/analyzers/flip" style={{ padding: "6px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>
            Full Flip Analyzer
          </Link>
          <Link href="/app/analyzers/brrr" style={{ padding: "6px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>
            BRRR
          </Link>
        </div>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Wholesale MAO Calculator
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Calculate maximum allowable offer and suggested offer range for wholesale deals
      </p>

      <WholesaleMaoClient />
    </div>
  );
}
