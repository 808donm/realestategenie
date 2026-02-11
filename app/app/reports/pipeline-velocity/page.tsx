import Link from "next/link";
import PipelineVelocityClient from "./pipeline-velocity.client";

export default function PipelineVelocityPage() {
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
        Pipeline Velocity
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        How many days a lead stays in each pipeline stage. Find where deals get stuck. Data from GHL.
      </p>
      <PipelineVelocityClient />
    </div>
  );
}
