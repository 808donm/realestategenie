import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

// Type definitions for the complex query
type SubscriptionPlan = {
  id: string;
  name: string;
  slug: string;
  max_agents: number;
  max_properties: number;
  max_tenants: number;
};

type AgentSubscription = {
  id: string;
  status: string;
  monthly_price: number;
  billing_cycle: string;
  current_period_end: string;
  subscription_plan_id: string;
  subscription_plans: SubscriptionPlan;
};

type AgentWithSubscription = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  agent_subscriptions: AgentSubscription[];
  agent_usage: Array<{
    current_agents: number;
    current_properties: number;
    current_tenants: number;
  }>;
};

export default async function AdminSubscriptionsPage() {
  await requireAdmin();

  const adminSupabase = supabaseAdmin;

  // Get all agents with their subscription details
  const { data: agentsData } = await adminSupabase
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
        current_period_end,
        subscription_plan_id,
        subscription_plans:subscription_plan_id (
          id,
          name,
          slug,
          max_agents,
          max_properties,
          max_tenants
        )
      ),
      agent_usage (
        current_agents,
        current_properties,
        current_tenants
      )
    `)
    .order("created_at", { ascending: false });

  // Cast to proper type
  const agents = agentsData as AgentWithSubscription[] | null;

  // Get all available plans
  const { data: plans } = await adminSupabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("tier_level", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Subscription Management</h1>
          <p className="text-gray-600">
            Manage user subscriptions and plan assignments
          </p>
        </div>
        <Link
          href="/app/admin"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
        >
          Back to Admin
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {plans?.map((plan) => {
          const subscriberCount = agents?.filter(
            (a) => a.agent_subscriptions?.[0]?.subscription_plans?.id === plan.id
          ).length || 0;

          return (
            <div
              key={plan.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="text-sm text-gray-500 mb-1">{plan.name}</div>
              <div className="text-2xl font-bold">{subscriberCount}</div>
              <div className="text-xs text-gray-400 mt-1">subscribers</div>
            </div>
          );
        })}
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">All Subscriptions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Renewal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents?.map((agent) => {
                const subscription = agent.agent_subscriptions?.[0];
                const plan = subscription?.subscription_plans;
                const usage = agent.agent_usage?.[0];

                const hasOverage =
                  usage &&
                  plan &&
                  (usage.current_properties > plan.max_properties ||
                    usage.current_tenants > plan.max_tenants ||
                    usage.current_agents > plan.max_agents);

                return (
                  <tr
                    key={agent.id}
                    className={hasOverage ? "bg-red-50" : ""}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {agent.display_name || agent.email}
                      </div>
                      <div className="text-sm text-gray-500">{agent.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {plan ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {plan.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${subscription?.monthly_price}/{subscription?.billing_cycle}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No plan assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {usage && plan ? (
                        <div className="text-xs space-y-1">
                          <div
                            className={
                              usage.current_properties > plan.max_properties
                                ? "text-red-600 font-semibold"
                                : ""
                            }
                          >
                            Properties: {usage.current_properties}/
                            {plan.max_properties}
                          </div>
                          <div
                            className={
                              usage.current_tenants > plan.max_tenants
                                ? "text-red-600 font-semibold"
                                : ""
                            }
                          >
                            Tenants: {usage.current_tenants}/{plan.max_tenants}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subscription ? (
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            subscription.status === "active"
                              ? "bg-green-100 text-green-800"
                              : subscription.status === "past_due"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {subscription.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          none
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subscription?.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/app/admin/subscriptions/${agent.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
