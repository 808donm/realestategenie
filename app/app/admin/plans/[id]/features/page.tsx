import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlanFeaturesPage({ params }: PageProps) {
  await requireAdmin();
  const { id: planId } = await params;

  // Get plan details
  const { data: plan } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan) {
    redirect("/app/admin/plans");
  }

  // Get all features
  const { data: features } = await supabaseAdmin
    .from("features")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  // Get plan-feature mappings for this plan
  const { data: planFeatures } = await supabaseAdmin
    .from("plan_features")
    .select("*")
    .eq("plan_id", planId);

  // Create a map for quick lookup
  const featureMap = new Map<string, { id: string; is_enabled: boolean }>();
  planFeatures?.forEach((pf) => {
    featureMap.set(pf.feature_id, { id: pf.id, is_enabled: pf.is_enabled });
  });

  // Group features by category
  type Feature = NonNullable<typeof features>[number];
  const groupedFeatures = features?.reduce((acc, feature) => {
    const category = feature.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const categoryLabels: Record<string, string> = {
    core: "Core Features",
    payments: "Payment Processing",
    marketing: "Marketing & Sales",
    integrations: "Integrations",
    team: "Team Management",
    analytics: "Analytics & Reporting",
    enterprise: "Enterprise Features",
    support: "Support & Services",
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Features</h1>
          <p className="text-muted-foreground">
            Configure which features are available in the <strong>{plan.name}</strong> plan
          </p>
        </div>
        <Link href={`/app/admin/plans/${planId}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plan
          </Button>
        </Link>
      </div>

      {/* Plan Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-blue-700">
                Tier {plan.tier_level} • ${plan.monthly_price}/month
              </p>
            </div>
            <div className="flex gap-2">
              {plan.is_active ? (
                <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-300">
                  Inactive
                </Badge>
              )}
              {plan.is_custom && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                  Custom
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {groupedFeatures &&
              (Object.entries(groupedFeatures) as [string, Feature[]][]).map(
                ([category, categoryFeatures]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {categoryLabels[category] || category}
                      </h3>
                      <div className="h-px bg-gray-200 mt-2"></div>
                    </div>

                    {/* Features in Category */}
                    <div className="space-y-2">
                      {categoryFeatures.map((feature) => {
                        const planFeature = featureMap.get(feature.id);
                        const isEnabled = planFeature?.is_enabled || false;

                        return (
                          <div
                            key={feature.id}
                            className={`p-4 border rounded-lg transition-colors ${
                              isEnabled
                                ? "bg-green-50 border-green-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900">{feature.name}</h4>
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {feature.slug}
                                  </Badge>
                                </div>
                                {feature.description && (
                                  <p className="text-sm text-gray-600">{feature.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                {isEnabled ? (
                                  <div className="flex items-center gap-2 text-green-700">
                                    <Check className="h-5 w-5" />
                                    <span className="text-sm font-medium">Enabled</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-gray-500">
                                    <X className="h-5 w-5" />
                                    <span className="text-sm font-medium">Disabled</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
          </div>
        </CardContent>
      </Card>

      {/* Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="h-5 w-5 text-blue-600"
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
            </div>
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Toggle Functionality Coming Soon</p>
              <p>
                Feature toggling requires a backend API endpoint. For now, use the{" "}
                <Link href="/app/admin/features" className="underline font-medium">
                  Features Management page
                </Link>{" "}
                to see the full feature matrix across all plans, or use the Supabase dashboard to
                modify the <code className="bg-blue-100 px-1 rounded">plan_features</code> table
                directly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex justify-between pt-4 border-t">
        <Link href="/app/admin/features">
          <Button variant="outline">View All Features</Button>
        </Link>

        <div className="flex gap-3">
          <Link href="/app/admin/plans">
            <Button variant="outline">Back to Plans</Button>
          </Link>
          <Link href={`/app/admin/plans/${planId}`}>
            <Button>Edit Plan Details</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
