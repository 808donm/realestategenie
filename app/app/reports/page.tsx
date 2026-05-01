import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import PageHelp from "../components/page-help";

export default async function ReportsPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  // Get agent's MLS ID from their Trestle integration
  const { data: trestleInteg } = await supabase
    .from("integrations")
    .select("config")
    .eq("agent_id", userData.user.id)
    .eq("provider", "trestle")
    .eq("status", "connected")
    .maybeSingle();

  const trestleConfig = trestleInteg?.config
    ? typeof trestleInteg.config === "string" ? JSON.parse(trestleInteg.config) : trestleInteg.config
    : null;
  const agentMlsId = trestleConfig?.mls_id || null;

  // Load market report configs for the agent's MLS (or all if no MLS connected)
  let marketReports: { report_slug: string; report_title: string; report_description: string | null; report_category: string; mls_name: string }[] = [];

  if (agentMlsId) {
    const { data } = await supabaseAdmin
      .from("market_report_configs")
      .select("report_slug, report_title, report_description, report_category, mls_name")
      .eq("mls_id", agentMlsId)
      .eq("is_active", true)
      .order("display_order");
    marketReports = data || [];
  } else {
    // No MLS connected -- show all active reports
    const { data } = await supabaseAdmin
      .from("market_report_configs")
      .select("report_slug, report_title, report_description, report_category, mls_name")
      .eq("is_active", true)
      .order("mls_id")
      .order("display_order");
    marketReports = data || [];
  }

  // Always include MLS Agent Leaderboard if not already in the list
  if (!marketReports.some((r) => r.report_slug === "mls-leaderboard")) {
    marketReports.push({
      report_slug: "mls-leaderboard",
      report_title: "MLS Agent Leaderboard",
      report_description: "Market-wide agent rankings by closed transactions. Top agents and offices by sales, volume, and DOM.",
      report_category: "leaderboard",
      mls_name: "MLS",
    });
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>Reports</h1>
        <PageHelp
          title="Reports"
          description="Performance reports and analytics for your real estate business. Export any report as PDF or Excel."
          tips={["Use Ctrl+P to print any report page", "Export reports to share with your broker or team"]}
        />
      </div>
      <p style={{ margin: "0 0 32px 0", opacity: 0.7 }}>
        Business intelligence and performance tracking across your real estate operations
      </p>

      {/* Market Statistics — Dynamic based on agent's MLS */}
      {marketReports.length > 0 && (
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: "#dc2626", borderRadius: 2 }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Market Statistics</h2>
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
            {agentMlsId ? `Reports for your MLS` : "Historical data with interactive charts"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {marketReports.map((r) => (
            <ReportCard
              key={r.report_slug}
              href={`/app/reports/${r.report_slug}`}
              title={r.report_title}
              description={r.report_description || ""}
              dataSources={[r.mls_name]}
              color={r.report_category === "leaderboard" ? "#059669" : "#dc2626"}
            />
          ))}
        </div>
      </section>
      )}

      {/* Solo Agent Reports */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: "#3b82f6", borderRadius: 2 }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Solo Agent</h2>
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Time management, lead ROI & personal income</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <ReportCard
            href="/app/reports/lead-source-roi"
            title="Lead Source ROI"
            description="Which lead source has the highest conversion rate and lowest cost-per-closing."
            dataSources={["CRM", "QBO"]}
            color="#3b82f6"
          />
          <ReportCard
            href="/app/reports/pipeline-velocity"
            title="Pipeline Velocity"
            description="How many days a lead stays in each pipeline stage. Find where deals get stuck."
            dataSources={["CRM"]}
            color="#3b82f6"
          />
          <ReportCard
            href="/app/reports/tax-savings-reserve"
            title="Tax & Savings Reserve"
            description="Gross commission vs. what to set aside for taxes, expenses, and marketing."
            dataSources={["Stripe", "QBO"]}
            color="#3b82f6"
          />
          <ReportCard
            href="/app/reports/speed-to-lead"
            title="Speed-to-Lead Audit"
            description="Average response time to portal leads. Prove where automation is needed."
            dataSources={["CRM"]}
            color="#3b82f6"
          />
        </div>
      </section>

      {/* Small Team Reports */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: "#8b5cf6", borderRadius: 2 }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Small Teams</h2>
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Accountability, lead distribution & team splits</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <ReportCard
            href="/app/reports/agent-leaderboard"
            title="Agent Leaderboard"
            description="Activity vs. results: closings, calls, SMS, and showings per agent."
            dataSources={["CRM"]}
            color="#8b5cf6"
          />
          <ReportCard
            href="/app/reports/lead-assignment"
            title="Lead Assignment Fairness"
            description="Leads distributed to each team member and their individual conversion rates."
            dataSources={["CRM"]}
            color="#8b5cf6"
          />
          <ReportCard
            href="/app/reports/team-commission-split"
            title="Team Commission Split Tracker"
            description="House portion vs. agent portion for every deal. Instant split calculations."
            dataSources={["QBO"]}
            color="#8b5cf6"
          />
          <ReportCard
            href="/app/reports/listing-inventory"
            title="Listing Inventory Health"
            description="Active listings, days on market, and price adjustment alerts for 21+ DOM."
            dataSources={["MLS"]}
            color="#8b5cf6"
          />
        </div>
      </section>

      {/* Brokerage Reports */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: "#059669", borderRadius: 2 }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Brokerage</h2>
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Compliance, liability & brokerage-wide profitability</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <ReportCard
            href="/app/reports/company-dollar"
            title="Company Dollar Report"
            description="How much stays with the brokerage after all agent commissions and expenses."
            dataSources={["QBO"]}
            color="#059669"
          />
          <ReportCard
            href="/app/reports/compliance-audit"
            title="Compliance & Audit Log"
            description="Signed documents, ID verifications, and wire instruction confirmations."
            dataSources={["CRM", "App"]}
            color="#059669"
          />
          <ReportCard
            href="/app/reports/brokerage-market-share"
            title="Brokerage Market Share"
            description="Brokerage rank in specific zip codes compared to Big Box brands."
            dataSources={["MLS"]}
            color="#059669"
          />
          <ReportCard
            href="/app/reports/agent-retention-risk"
            title="Agent Retention Risk"
            description="AI-driven flags for agents whose activity dropped 40%+ over 30 days."
            dataSources={["CRM"]}
            color="#059669"
          />
        </div>
      </section>

      {/* Assistants & Office Admin Reports */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: "#f59e0b", borderRadius: 2 }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Assistants & Office Admin</h2>
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Operations, maintenance & the to-do list</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <ReportCard
            href="/app/reports/pending-documents"
            title="Pending Document Checklist"
            description="Under-contract deals missing required signatures or disclosure forms."
            dataSources={["CRM"]}
            color="#f59e0b"
          />
        </div>
      </section>
    </div>
  );
}

function ReportCard({
  href,
  title,
  description,
  dataSources,
  color,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  dataSources: string[];
  color: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: 20,
        border: "1px solid hsl(var(--border))",
        borderRadius: 12,
        textDecoration: "none",
        color: "inherit",
        display: "block",
        transition: "border-color 0.2s, box-shadow 0.2s",
        borderLeft: `4px solid ${color}`,
        background: "hsl(var(--card))",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700 }}>{title}</h3>
        {badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color,
              background: `${color}15`,
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <p style={{ margin: "0 0 12px 0", opacity: 0.7, fontSize: 13, lineHeight: 1.5 }}>{description}</p>
      <div style={{ display: "flex", gap: 6 }}>
        {dataSources.map((source) => (
          <span
            key={source}
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 4,
              background: "hsl(var(--muted))",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            {source}
          </span>
        ))}
      </div>
    </Link>
  );
}
