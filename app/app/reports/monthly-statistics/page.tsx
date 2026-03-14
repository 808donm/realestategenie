import Link from "next/link";
import MonthlyStatisticsClient from "./monthly-statistics.client";

export default function MonthlyStatisticsPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link
          href="/app/reports"
          style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}
        >
          &larr; Back to Reports
        </Link>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 4 }}>
        Monthly Market Statistics
      </h1>
      <p style={{ margin: "0 0 8px 0", opacity: 0.7 }}>
        Oahu Monthly Residential Resales — Honolulu Board of REALTORS®
      </p>
      <p style={{ margin: "0 0 24px 0", fontSize: 12, opacity: 0.5 }}>
        Source: HiCentral MLS, Ltd. data
      </p>
      <MonthlyStatisticsClient />
    </div>
  );
}
