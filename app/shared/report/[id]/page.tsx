import { createClient } from "@supabase/supabase-js";
import SharedReportView from "./shared-report-view";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: report } = await admin
    .from("shared_reports")
    .select("report_data, agent_name")
    .eq("share_id", id)
    .single();

  if (!report) {
    return { title: "Report Not Found | Real Estate Genie" };
  }

  const address = report.report_data?.address || "Property";
  return {
    title: `Property Report — ${address} | Real Estate Genie`,
    description: `Property Intelligence Report for ${address}. Shared${report.agent_name ? ` by ${report.agent_name}` : ""} via Real Estate Genie.`,
  };
}

export default async function SharedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: report, error } = await admin
    .from("shared_reports")
    .select("*")
    .eq("share_id", id)
    .single();

  if (error || !report) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Report Not Found</h1>
          <p style={{ color: "#6b7280" }}>This report may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  // Check expiry
  if (report.expires_at && new Date(report.expires_at) < new Date()) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Report Expired</h1>
          <p style={{ color: "#6b7280" }}>This shared report link has expired.</p>
        </div>
      </div>
    );
  }

  // Increment view count
  await admin
    .from("shared_reports")
    .update({ view_count: (report.view_count || 0) + 1 })
    .eq("share_id", id);

  return (
    <SharedReportView
      reportData={report.report_data}
      agentName={report.agent_name}
      agentEmail={report.agent_email}
      agentPhone={report.agent_phone}
      brandColor={report.brand_color}
      createdAt={report.created_at}
    />
  );
}
