import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const supabase = await supabaseServer();

  // Get statistics
  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: disabledUsers },
    { count: pendingInvites },
    { count: totalOpenHouses },
    { count: totalLeads },
    { count: recentErrors },
  ] = await Promise.all([
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
    supabase.from("open_house_events").select("*", { count: "exact", head: true }),
    supabase.from("lead_submissions").select("*", { count: "exact", head: true }),
    supabase
      .from("error_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

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
          title="Disabled Users"
          value={disabledUsers || 0}
          icon="🚫"
          color="#ef4444"
        />
        <StatCard
          title="Pending Invites"
          value={pendingInvites || 0}
          icon="📧"
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
        transition: "background 0.2s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "#2563eb";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "#3b82f6";
      }}
    >
      {children}
    </a>
  );
}
