import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Reports
      </h1>
      <p style={{ margin: "0 0 32px 0", opacity: 0.7 }}>
        Business intelligence and performance tracking across your real estate operations
      </p>

      {/* Solo Agent Reports */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: "#3b82f6", borderRadius: 2 }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Solo Agent</h2>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Time management, lead ROI & personal income</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <ReportCard
            href="/app/reports/lead-source-roi"
            title="Lead Source ROI"
            description="Which lead source has the highest conversion rate and lowest cost-per-closing."
            dataSources={["GHL", "QBO"]}
            color="#3b82f6"
          />
          <ReportCard
            href="/app/reports/pipeline-velocity"
            title="Pipeline Velocity"
            description="How many days a lead stays in each pipeline stage. Find where deals get stuck."
            dataSources={["GHL"]}
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
            dataSources={["GHL"]}
            color="#3b82f6"
          />
        </div>
      </section>

      {/* Small Team Reports */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: "#8b5cf6", borderRadius: 2 }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Small Teams</h2>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Accountability, lead distribution & team splits</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <ReportCard
            href="/app/reports/agent-leaderboard"
            title="Agent Leaderboard"
            description="Activity vs. results: closings, calls, SMS, and showings per agent."
            dataSources={["GHL"]}
            color="#8b5cf6"
          />
          <ReportCard
            href="/app/reports/lead-assignment"
            title="Lead Assignment Fairness"
            description="Leads distributed to each team member and their individual conversion rates."
            dataSources={["GHL"]}
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
          <span style={{ fontSize: 13, color: "#6b7280" }}>Compliance, liability & brokerage-wide profitability</span>
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
            dataSources={["GHL", "App"]}
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
            dataSources={["GHL"]}
            color="#059669"
          />
        </div>
      </section>

      {/* Assistants & Office Admin Reports */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 24, background: "#f59e0b", borderRadius: 2 }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Assistants & Office Admin</h2>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Operations, maintenance & the to-do list</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <ReportCard
            href="/app/reports/pending-documents"
            title="Pending Document Checklist"
            description="Under-contract deals missing required signatures or disclosure forms."
            dataSources={["GHL"]}
            color="#f59e0b"
          />
          <ReportCard
            href="/app/pm/reports"
            title="Property Management Reports"
            description="Maintenance status, rent collection, and vendor spend reports."
            dataSources={["GHL", "Stripe", "QBO"]}
            color="#f59e0b"
            badge="PM Module"
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
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        textDecoration: "none",
        color: "inherit",
        display: "block",
        transition: "border-color 0.2s, box-shadow 0.2s",
        borderLeft: `4px solid ${color}`,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 700 }}>{title}</h3>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: "2px 8px", borderRadius: 4 }}>
            {badge}
          </span>
        )}
      </div>
      <p style={{ margin: "0 0 12px 0", opacity: 0.7, fontSize: 13, lineHeight: 1.5 }}>
        {description}
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        {dataSources.map((source) => (
          <span
            key={source}
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 4,
              background: "#f3f4f6",
              color: "#6b7280",
            }}
          >
            {source}
          </span>
        ))}
      </div>
    </Link>
  );
}
