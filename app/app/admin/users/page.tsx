import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import UserManagementClient from "./user-management.client";

export default async function UsersManagementPage() {
  await requireAdmin("global");

  const supabase = await supabaseServer();

  //  Get all users
  const { data: users, error } = await supabase
    .from("agents")
    .select("id, email, display_name, is_admin, account_status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div>
        <h1>Error loading users</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  // Get all active plans for plan assignment
  const { data: plans } = await supabaseAdmin
    .from("subscription_plans")
    .select("id, name, slug, monthly_price, annual_price, tier_level")
    .eq("is_active", true)
    .order("tier_level", { ascending: true });

  // Get all subscriptions to show current plan per user
  const { data: subscriptions } = await supabaseAdmin
    .from("agent_subscriptions")
    .select("agent_id, subscription_plan_id, status, billing_cycle, subscription_plans(name)")
    .eq("status", "active");

  // Build a map of agent_id -> subscription info
  const subscriptionMap: Record<string, { planName: string; planId: string; status: string }> = {};
  if (subscriptions) {
    for (const sub of subscriptions) {
      const planName = (sub as any).subscription_plans?.name || "Unknown";
      subscriptionMap[sub.agent_id] = {
        planName,
        planId: sub.subscription_plan_id,
        status: sub.status,
      };
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>User Management</h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>Manage agent accounts, permissions, and plan assignments</p>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>All Users ({users?.length || 0})</h2>
          <Link
            href="/app/admin/invitations"
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "white",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            + Invite User
          </Link>
        </div>

        <UserManagementClient users={users || []} plans={plans || []} subscriptionMap={subscriptionMap} />
      </div>
    </div>
  );
}
