import { createClient } from "@supabase/supabase-js";
import ReportView from "./report-view";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: report } = await admin
    .from("property_intelligence_reports")
    .select("address, city, state")
    .eq("id", id)
    .single();

  if (!report) {
    return { title: "Report Not Found | Real Estate Genie" };
  }

  const location = [report.city, report.state].filter(Boolean).join(", ");
  return {
    title: `Property Intelligence Report — ${report.address} | Real Estate Genie`,
    description: `Property Intelligence Report for ${report.address}${location ? `, ${location}` : ""}. Includes valuation, tax assessment, ownership, hazard, and neighborhood data.`,
  };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: report, error } = await admin
    .from("property_intelligence_reports")
    .select("*")
    .eq("id", id)
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

  return <ReportView report={report} />;
}
