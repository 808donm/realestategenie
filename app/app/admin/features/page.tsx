import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import FeaturesManager from "./features-manager";

export default async function AdminFeaturesPage() {
  await requireAdmin();

  const adminSupabase = supabaseAdmin;

  // Get all features and plans
  const [{ data: features }, { data: plans }] = await Promise.all([
    adminSupabase
      .from("features")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    adminSupabase
      .from("subscription_plans")
      .select("id, name, slug, tier_level")
      .eq("is_active", true)
      .order("tier_level", { ascending: true }),
  ]);

  // Get all plan-feature mappings
  const { data: planFeatures } = await adminSupabase
    .from("plan_features")
    .select("*");

  // Create a map for quick lookup
  const featureMap = new Map<string, Set<string>>();
  planFeatures?.forEach((pf) => {
    if (!featureMap.has(pf.feature_id)) {
      featureMap.set(pf.feature_id, new Set());
    }
    if (pf.is_enabled) {
      featureMap.get(pf.feature_id)?.add(pf.plan_id);
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Feature Management</h1>
          <p className="text-gray-600">
            Add, edit, and manage features available across subscription plans
          </p>
        </div>
        <Link
          href="/app/admin"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
        >
          Back to Admin
        </Link>
      </div>

      <FeaturesManager
        initialFeatures={features || []}
        plans={plans || []}
        featureMap={featureMap}
      />

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
              Click "Edit" to modify feature details, or "Add New Feature" to create additional features.
              To control which plans have access to each feature, visit the individual plan's feature management page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
