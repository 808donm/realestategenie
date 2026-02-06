import Link from "next/link";
import LeadAssignmentClient from "./lead-assignment.client";

export default function LeadAssignmentPage() {
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
        Lead Assignment Fairness
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Evaluate lead distribution equity and individual conversion rates across your team. Data from GHL.
      </p>
      <LeadAssignmentClient />
    </div>
  );
}
