import Link from "next/link";
import VendorSpendClient from "./vendor-spend.client";

export default function VendorSpendPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link href="/app/pm/reports" style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}>
          &larr; Back to PM Reports
        </Link>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>Vendor Spend Report</h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Track spending per vendor to negotiate better preferred rates. Data from QBO.
      </p>
      <VendorSpendClient />
    </div>
  );
}
