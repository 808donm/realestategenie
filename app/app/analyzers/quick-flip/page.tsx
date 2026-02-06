import Link from "next/link";
import QuickFlipClient from "./quick-flip.client";

export default function QuickFlipPage() {
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
          <Link href="/app/analyzers/flip" style={{ padding: "6px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>
            Full Flip Analyzer
          </Link>
          <Link href="/app/analyzers/wholesale-mao" style={{ padding: "6px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>
            Wholesale MAO
          </Link>
          <Link href="/app/analyzers/brrr" style={{ padding: "6px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 13, textDecoration: "none", color: "inherit" }}>
            BRRR
          </Link>
        </div>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Quick Flip Analyzer
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Fast flip deal analysis with profit, ROI, and 70% rule MAO check
      </p>

      <QuickFlipClient />
    </div>
  );
}
