import Link from "next/link";
import MaintenanceStatusClient from "./maintenance-status.client";

export default function MaintenanceStatusPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link
          href="/app/pm/reports"
          style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}
        >
          &larr; Back to PM Reports
        </Link>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Maintenance Status Summary
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Bird&apos;s-eye view of all open work orders, overdue items, and unresponsive vendors. Data from GHL &amp; App.
      </p>
      <MaintenanceStatusClient />
    </div>
  );
}
