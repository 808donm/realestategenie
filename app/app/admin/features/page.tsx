import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function AdminFeaturesPage() {
  await requireAdmin();

  const adminSupabase = supabaseAdmin;

  // Get all features and plans
  const [{ data: features }, { data: plans }] = await Promise.all([
    adminSupabase
      .from("features")
      .select("*")
      .order("category", { ascending: true }),
    adminSupabase
      .from("subscription_plans")
      .select("id, name, slug, tier_level")
      .eq("is_active", true)
      .order("tier_level", { ascending: true })
  ]);

  // Get all plan-feature mappings
  const { data: planFeatures } = await adminSupabase
    .from("plan_features")
    .select("*");

  // Create a map for quick lookup
  const featureMap = new Map<string, Set<string>>();
  planFeatures?.forEach(pf => {
    if (!featureMap.has(pf.feature_id)) {
      featureMap.set(pf.feature_id, new Set());
    }
    if (pf.is_enabled) {
      featureMap.get(pf.feature_id)?.add(pf.plan_id);
    }
  });

  // Group features by category
  const groupedFeatures = features?.reduce((acc, feature) => {
    const category = feature.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, typeof features>);

  const categoryLabels: Record<string, string> = {
    core: 'Core Features',
    payments: 'Payment Processing',
    marketing: 'Marketing & Sales',
    integrations: 'Integrations',
    team: 'Team Management',
    analytics: 'Analytics & Reporting',
    enterprise: 'Enterprise Features',
    support: 'Support & Services'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Feature Management</h1>
          <p className="text-gray-600">
            Control which features are available in each plan
          </p>
        </div>
        <Link
          href="/app/admin"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
        >
          Back to Admin
        </Link>
      </div>

      {/* Feature Matrix */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Feature
                </th>
                {plans?.map((plan) => (
                  <th
                    key={plan.id}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedFeatures && Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                <>
                  {/* Category Header */}
                  <tr key={`category-${category}`} className="bg-gray-100">
                    <td
                      colSpan={plans ? plans.length + 1 : 1}
                      className="px-6 py-3 text-sm font-bold text-gray-700 sticky left-0 bg-gray-100"
                    >
                      {categoryLabels[category] || category}
                    </td>
                  </tr>

                  {/* Features in this category */}
                  {categoryFeatures?.map((feature) => {
                    const enabledPlans = featureMap.get(feature.id) || new Set();

                    return (
                      <tr key={feature.id}>
                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white">
                          <div className="text-sm font-medium text-gray-900">
                            {feature.name}
                          </div>
                          {feature.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {feature.description}
                            </div>
                          )}
                        </td>
                        {plans?.map((plan) => {
                          const isEnabled = enabledPlans.has(plan.id);

                          return (
                            <td
                              key={plan.id}
                              className="px-6 py-4 text-center"
                            >
                              {isEnabled ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                                  <svg
                                    className="w-4 h-4 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                                  <svg
                                    className="w-4 h-4 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">About Feature Management</p>
            <p>
              This matrix shows which features are enabled for each subscription plan.
              Features are automatically made available to users based on their active subscription.
              Lower-tier features are typically greyed out (not removed) for users on higher plans to encourage upgrades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
