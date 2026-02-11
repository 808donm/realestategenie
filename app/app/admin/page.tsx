import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminUsageBanner from "../components/admin-usage-banner";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const supabase = await supabaseServer();
  const adminSupabase = supabaseAdmin;

  // Get statistics with error handling
  const results = await Promise.all([
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("account_status", "active"),
    supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("account_status", "disabled"),
    supabase
      .from("user_invitations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    adminSupabase
      .from("access_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("open_house_events").select("*", { count: "exact", head: true }),
    supabase.from("lead_submissions").select("*", { count: "exact", head: true }),
    supabase
      .from("error_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    adminSupabase
      .from("usage_alerts")
      .select("*", { count: "exact", head: true })
      .eq("is_resolved", false)
      .eq("alert_type", "critical_100"),
    adminSupabase
      .from("usage_alerts")
      .select("*", { count: "exact", head: true })
      .eq("is_resolved", false)
      .eq("alert_type", "warning_70"),
  ]);

  const totalUsers = results[0].count ?? 0;
  const activeUsers = results[1].count ?? 0;
  const disabledUsers = results[2].count ?? 0;
  const pendingInvites = results[3].count ?? 0;
  const pendingAccessRequests = results[4].count ?? 0;
  const totalOpenHouses = results[5].count ?? 0;
  const totalLeads = results[6].count ?? 0;
  const recentErrors = results[7].count ?? 0;
  const criticalAlerts = results[8].count ?? 0;
  const warningAlerts = results[9].count ?? 0;

  // Get agents with critical alerts for sales opportunities
  const { data: criticalAlertsData } = await adminSupabase
    .from("usage_alerts")
    .select(`
      agent_id,
      resource_type,
      agents (
        email,
        display_name,
        agent_subscriptions (
          subscription_plans:subscription_plan_id (name)
        )
      )
    `)
    .eq("is_resolved", false)
    .eq("alert_type", "critical_100")
    .limit(5);

  const salesOpportunities = new Map<string, { agent: any; resources: string[] }>();
  criticalAlertsData?.forEach(alert => {
    const existing = salesOpportunities.get(alert.agent_id);
    if (existing) {
      existing.resources.push(alert.resource_type);
    } else {
      salesOpportunities.set(alert.agent_id, {
        agent: alert.agents,
        resources: [alert.resource_type]
      });
    }
  });

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
          Admin Overview
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          Real Estate Genie system statistics
        </p>
      </div>

      {/* Sales Opportunities */}
      {salesOpportunities.size > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
            🚨 Sales Opportunities
          </h2>
          {Array.from(salesOpportunities.entries()).map(([agentId, data]) => {
            const planName = data.agent?.agent_subscriptions?.[0]?.subscription_plans?.name || "Unknown Plan";
            return (
              <AdminUsageBanner
                key={agentId}
                agentName={data.agent?.display_name || data.agent?.email}
                agentEmail={data.agent?.email}
                agentId={agentId}
                exceededResources={data.resources}
                planName={planName}
              />
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <StatCard
          title="Total Users"
          value={totalUsers || 0}
          icon="👥"
          color="#3b82f6"
        />
        <StatCard
          title="Active Users"
          value={activeUsers || 0}
          icon="✓"
          color="#10b981"
        />
        <StatCard
          title="Access Requests"
          value={pendingAccessRequests || 0}
          icon="📋"
          color={pendingAccessRequests && pendingAccessRequests > 0 ? "#f59e0b" : "#10b981"}
        />
        <StatCard
          title="Critical Alerts"
          value={criticalAlerts || 0}
          icon="🚨"
          color="#ef4444"
        />
        <StatCard
          title="Warning Alerts"
          value={warningAlerts || 0}
          icon="⚠️"
          color="#f59e0b"
        />
        <StatCard
          title="Open Houses"
          value={totalOpenHouses || 0}
          icon="🏠"
          color="#8b5cf6"
        />
        <StatCard
          title="Total Leads"
          value={totalLeads || 0}
          icon="📈"
          color="#06b6d4"
        />
        <StatCard
          title="Errors (24h)"
          value={recentErrors || 0}
          icon="🐛"
          color={recentErrors && recentErrors > 0 ? "#ef4444" : "#10b981"}
        />
      </div>

      <div style={{ background: "white", borderRadius: 12, padding: 24, border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px 0" }}>
          Quick Actions
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <QuickActionButton href="/app/admin/users">
            Manage Users
          </QuickActionButton>
          <QuickActionButton href="/app/admin/access-requests">
            Access Requests
          </QuickActionButton>
          <QuickActionButton href="/app/admin/subscriptions">
            Manage Subscriptions
          </QuickActionButton>
          <QuickActionButton href="/app/admin/plans">
            Manage Plans
          </QuickActionButton>
          <QuickActionButton href="/app/admin/features">
            Manage Features
          </QuickActionButton>
          <QuickActionButton href="/app/admin/invitations">
            Send Invitation
          </QuickActionButton>
          <QuickActionButton href="/app/admin/error-logs">
            View Error Logs
          </QuickActionButton>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: 24,
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
            {title}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        padding: "10px 20px",
        background: "#3b82f6",
        color: "white",
        borderRadius: 8,
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {children}
    </a>
  );
}
