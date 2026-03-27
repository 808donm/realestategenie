import { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import PublicMortgageCalculator from "./mortgage-calculator.client";

export const metadata: Metadata = {
  title: "Mortgage Calculator | Client Portal",
  description: "Calculate your monthly mortgage payment, view amortization schedule, and explore affordability",
};

export default async function PortalMortgagePage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("full_name, brokerage, phone, email")
    .eq("id", agentId)
    .single();

  if (!agent) {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", padding: 16, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Page Not Found</h1>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <Link href={`/portal/${agentId}`} style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>
              &larr; Back to Portal
            </Link>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 0" }}>Mortgage Calculator</h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Provided by {agent.full_name}</p>
            {agent.brokerage && <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{agent.brokerage}</p>}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        <PublicMortgageCalculator agentName={agent.full_name} agentPhone={agent.phone} />
      </main>
    </div>
  );
}
