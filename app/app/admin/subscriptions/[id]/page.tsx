import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import ManageSubscriptionForm from "./manage-subscription-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  tier_level: number;
  max_agents: number;
  max_properties: number;
  max_tenants: number;
};

export default async function ManageUserSubscriptionPage({ params }: PageProps) {
  await requireAdmin();
  const { id: agentId } = await params;

  // Get agent details with subscription
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select(`
      id,
      email,
      display_name,
      role,
      is_active,
      agent_subscriptions (
        id,
        status,
        monthly_price,
        billing_cycle,
        current_period_start,
        current_period_end,
        next_billing_date,
        subscription_plan_id,
        subscription_plans:subscription_plan_id (
          id,
          name,
          slug,
          monthly_price,
          tier_level,
          max_agents,
          max_properties,
          max_tenants
        )
      ),
      agent_usage (
        current_agents,
        current_properties,
        current_tenants,
        last_calculated_at
      )
    `)
    .eq("id", agentId)
    .single();

  if (!agent) {
    redirect("/app/admin/subscriptions");
  }

  // Get all available plans
  const { data: plans } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("tier_level", { ascending: true });

  // Get usage alerts for this agent
  const { data: alerts } = await supabaseAdmin
    .from("usage_alerts")
    .select("*")
    .eq("agent_id", agentId)
    .eq("is_resolved", false)
    .order("created_at", { ascending: false });

  const subscription = agent.agent_subscriptions?.[0];
  const currentPlan = subscription?.subscription_plans as unknown as SubscriptionPlan | undefined;
  const usage = agent.agent_usage?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Subscription</h1>
          <p className="text-muted-foreground">
            {agent.display_name || agent.email}
          </p>
        </div>
        <Link
          href="/app/admin/subscriptions"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
        >
          Back to Subscriptions
        </Link>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-bold mb-4">User Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Email</div>
            <div className="font-medium">{agent.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Display Name</div>
            <div className="font-medium">{agent.display_name || "-"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Role</div>
            <div className="font-medium capitalize">{agent.role}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Account Status</div>
            <div>
              <span
                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  agent.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {agent.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Usage */}
      {usage && currentPlan && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4">Current Usage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-2">Properties</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{usage.current_properties}</span>
                <span className="text-gray-500">/ {currentPlan.max_properties}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.current_properties > currentPlan.max_properties
                      ? "bg-red-600"
                      : usage.current_properties / currentPlan.max_properties > 0.7
                      ? "bg-yellow-500"
                      : "bg-green-600"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (usage.current_properties / currentPlan.max_properties) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-2">Tenants</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{usage.current_tenants}</span>
                <span className="text-gray-500">/ {currentPlan.max_tenants}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.current_tenants > currentPlan.max_tenants
                      ? "bg-red-600"
                      : usage.current_tenants / currentPlan.max_tenants > 0.7
                      ? "bg-yellow-500"
                      : "bg-green-600"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (usage.current_tenants / currentPlan.max_tenants) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-2">Agents</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{usage.current_agents}</span>
                <span className="text-gray-500">/ {currentPlan.max_agents}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.current_agents > currentPlan.max_agents
                      ? "bg-red-600"
                      : usage.current_agents / currentPlan.max_agents > 0.7
                      ? "bg-yellow-500"
                      : "bg-green-600"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (usage.current_agents / currentPlan.max_agents) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
          {usage.last_calculated_at && (
            <p className="text-xs text-gray-500 mt-4">
              Last updated: {new Date(usage.last_calculated_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4 text-yellow-900">Active Alerts</h2>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg ${
                  alert.alert_type === "critical_100"
                    ? "bg-red-100 text-red-900"
                    : "bg-yellow-100 text-yellow-900"
                }`}
              >
                <div className="font-semibold">
                  {alert.alert_type === "critical_100"
                    ? "🚨 Critical"
                    : "⚠️ Warning"}{" "}
                  - {alert.resource_type}
                </div>
                <div className="text-sm">
                  {alert.usage_count} / {alert.limit_count} (
                  {alert.usage_percentage.toFixed(0)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manage Subscription Form */}
      <ManageSubscriptionForm
        agent={agent}
        subscription={subscription}
        currentPlan={currentPlan}
        availablePlans={plans || []}
      />
    </div>
  );
}
