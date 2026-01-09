import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPlanPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  // Get plan details
  const { data: plan } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (!plan) {
    redirect("/app/admin/plans");
  }

  // Get subscriber count
  const { count: subscriberCount } = await supabaseAdmin
    .from("agent_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("subscription_plan_id", id)
    .eq("status", "active");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Edit Plan: {plan.name}</h1>
            {plan.is_custom && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                Custom
              </Badge>
            )}
            {plan.is_active ? (
              <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-300">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {subscriberCount || 0} active subscriber{subscriberCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/app/admin/plans">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plans
          </Button>
        </Link>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Name
                </label>
                <input
                  type="text"
                  defaultValue={plan.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Solo Agent Pro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  defaultValue={plan.slug}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., solo-agent-pro"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                defaultValue={plan.description || ""}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the plan"
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Price ($)
                </label>
                <input
                  type="number"
                  defaultValue={plan.monthly_price}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Price ($)
                </label>
                <input
                  type="number"
                  defaultValue={plan.annual_price || ""}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tier Level
                </label>
                <input
                  type="number"
                  defaultValue={plan.tier_level}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Limits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Agents
                </label>
                <input
                  type="number"
                  defaultValue={plan.max_agents}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Use 999999 for unlimited</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Properties
                </label>
                <input
                  type="number"
                  defaultValue={plan.max_properties}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Use 999999 for unlimited</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tenants
                </label>
                <input
                  type="number"
                  defaultValue={plan.max_tenants}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Use 999999 for unlimited</p>
              </div>
            </div>

            {/* Flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  defaultChecked={plan.is_active}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Active (visible to customers)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_custom"
                  defaultChecked={plan.is_custom}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_custom" className="ml-2 block text-sm text-gray-700">
                  Custom Plan (enterprise/special)
                </label>
              </div>
            </div>
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
              <p className="font-semibold mb-1">Editing Disabled</p>
              <p>
                Plan editing functionality requires a backend API endpoint. For now, please use the
                Supabase dashboard or SQL queries to modify plan details. This UI shows current plan
                information for reference.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex gap-3">
          <Link href={`/app/admin/plans/${plan.id}/features`}>
            <Button variant="outline">
              Manage Features
            </Button>
          </Link>
          <Link href="/app/admin/features">
            <Button variant="outline">
              View All Features
            </Button>
          </Link>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" disabled>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Plan
          </Button>
          <Button disabled>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
