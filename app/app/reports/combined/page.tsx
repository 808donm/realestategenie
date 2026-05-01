import CombinedReportClient from "./combined-report.client";

export default function CombinedReportPage() {
  return (
    <div style={{ padding: "24px 0" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Combined Property Report</h1>
      <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", marginBottom: 24 }}>
        One-tap report combining MLS, Tax, AVM, Demographics, FEMA Flood, and EPA data.
      </p>
      <CombinedReportClient />
    </div>
  );
}
