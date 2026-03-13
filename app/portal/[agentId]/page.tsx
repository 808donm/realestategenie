import { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Client Portal | The Real Estate Genie",
  description: "Your real estate tools and resources",
};

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;

  // Fetch agent info for branding
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("full_name, brokerage, phone, email")
    .eq("id", agentId)
    .single();

  if (!agent) {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", padding: 16, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Portal Not Found</h1>
        <p style={{ marginTop: 12, color: "#6b7280" }}>
          This portal link is invalid.
        </p>
      </div>
    );
  }

  const tools = [
    {
      title: "Mortgage Calculator",
      description: "Calculate monthly payments, see amortization schedule, and explore affordability",
      href: `/portal/${agentId}/mortgage`,
      icon: "🏠",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "20px 24px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            Client Portal
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0" }}>
            {agent.full_name}
          </h1>
          {agent.brokerage && (
            <p style={{ fontSize: 14, color: "#6b7280", margin: "2px 0 0" }}>
              {agent.brokerage}
            </p>
          )}
        </div>
      </header>

      {/* Tools Grid */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
          Real Estate Tools
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              style={{
                display: "block",
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                textDecoration: "none",
                color: "inherit",
                transition: "box-shadow 0.2s",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{tool.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>
                {tool.title}
              </h3>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                {tool.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Agent Contact */}
        <div
          style={{
            marginTop: 48,
            padding: 20,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>
            Need help?
          </h3>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            Contact {agent.full_name}
            {agent.phone && <> at {agent.phone}</>}
            {agent.email && <> or {agent.email}</>}
          </p>
        </div>
      </main>
    </div>
  );
}
