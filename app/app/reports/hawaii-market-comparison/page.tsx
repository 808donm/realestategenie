import Link from "next/link";
import HawaiiMarketComparisonClient from "./hawaii-market-comparison.client";

export const metadata = { title: "Hawaii Statewide Market Comparison" };

export default function HawaiiMarketComparisonPage() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/app/reports"
          style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}
        >
          &larr; Back to Reports
        </Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 20px 0" }}>
        Hawaii Statewide Market Comparison
      </h1>
      <HawaiiMarketComparisonClient />
    </div>
  );
}
