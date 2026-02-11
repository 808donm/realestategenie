import Link from "next/link";
import CompanyDollarClient from "./company-dollar.client";

export default function CompanyDollarPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link
          href="/app/reports"
          style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}
        >
          &larr; Back to Reports
        </Link>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Company Dollar Report
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        What stays with the brokerage after agent splits and expenses. The most important metric for your business. Data from QBO.
      </p>
      <CompanyDollarClient />
    </div>
  );
}
