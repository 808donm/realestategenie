import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function AdminPlansPage() {
  await requireAdmin();

  const adminSupabase = await supabaseAdmin();

  // Get all plans with subscriber counts
  const { data: plans } = await adminSupabase
    .from("subscription_plans")
    .select(`
      *,
      agent_subscriptions (count)
    `)
    .order("tier_level", { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Subscription Plans</h1>
          <p className="text-gray-600">
            Manage pricing, limits, and plan settings
          </p>
        </div>
        <Link
          href="/app/admin"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
        >
          Back to Admin
        </Link>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plans?.map((plan) => {
          const subscriberCount = plan.agent_subscriptions?.[0]?.count || 0;

          return (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Tier {plan.tier_level} • {subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {plan.is_custom && (
                    <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-semibold">
                      Custom
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Description */}
                <p className="text-gray-600 mb-4">{plan.description}</p>

                {/* Pricing */}
                <div className="mb-6">
                  <div className="text-sm text-gray-500 mb-2">Pricing</div>
                  <div className="flex items-baseline gap-4">
                    <div>
                      <span className="text-3xl font-bold text-gray-900">
                        ${plan.monthly_price}
                      </span>
                      <span className="text-gray-500">/month</span>
                    </div>
                    {plan.annual_price && (
                      <div>
                        <span className="text-xl font-semibold text-gray-700">
                          ${plan.annual_price}
                        </span>
                        <span className="text-gray-500">/year</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-3 mb-6">
                  <div className="text-sm text-gray-500 mb-2">Plan Limits</div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Max Agents</span>
                    <span className="font-semibold text-gray-900">
                      {plan.max_agents === 999999 ? 'Unlimited' : plan.max_agents}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Max Properties</span>
                    <span className="font-semibold text-gray-900">
                      {plan.max_properties === 999999 ? 'Unlimited' : plan.max_properties}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Max Tenants</span>
                    <span className="font-semibold text-gray-900">
                      {plan.max_tenants === 999999 ? 'Unlimited' : plan.max_tenants}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      plan.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Link
                    href={`/app/admin/plans/${plan.id}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-center"
                  >
                    Edit Plan
                  </Link>
                  <Link
                    href={`/app/admin/plans/${plan.id}/features`}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 text-center"
                  >
                    Manage Features
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
