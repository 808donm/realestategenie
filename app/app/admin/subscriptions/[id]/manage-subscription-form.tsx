"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";

type Agent = {
  id: string;
  email: string;
  display_name: string | null;
};

type Subscription = {
  id: string;
  status: string;
  monthly_price: number;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string | null;
  subscription_plan_id: string;
};

type Plan = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  tier_level: number;
  max_agents: number;
  max_properties: number;
  max_tenants: number;
};

type ManageSubscriptionFormProps = {
  agent: Agent;
  subscription?: Subscription;
  currentPlan?: Plan;
  availablePlans: Plan[];
};

export default function ManageSubscriptionForm({
  agent,
  subscription,
  currentPlan,
  availablePlans,
}: ManageSubscriptionFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    plan_id: currentPlan?.id || "",
    status: subscription?.status || "active",
    billing_cycle: subscription?.billing_cycle || "monthly",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // For now, show a message that this requires backend implementation
      setSuccess(
        "Subscription management API endpoint needed. Please update subscriptions via Supabase dashboard."
      );
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Subscription Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alert Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Current Plan */}
          {currentPlan && subscription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Current Subscription</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Plan:</span>{" "}
                  <span className="font-medium">{currentPlan.name}</span>
                </div>
                <div>
                  <span className="text-blue-700">Status:</span>{" "}
                  <span className="font-medium capitalize">{subscription.status}</span>
                </div>
                <div>
                  <span className="text-blue-700">Price:</span>{" "}
                  <span className="font-medium">
                    ${subscription.monthly_price}/{subscription.billing_cycle}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Renewal:</span>{" "}
                  <span className="font-medium">
                    {subscription.next_billing_date
                      ? new Date(subscription.next_billing_date).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Plan *
            </label>
            <select
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a plan...</option>
              {availablePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ${plan.monthly_price}/month (Tier {plan.tier_level})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Billing Cycle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing Cycle *
            </label>
            <select
              value={formData.billing_cycle}
              onChange={(e) =>
                setFormData({ ...formData, billing_cycle: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          {/* Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
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
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">API Endpoint Required</p>
                <p>
                  Subscription management functionality requires a backend API endpoint. For now,
                  please use the Supabase dashboard to modify the{" "}
                  <code className="bg-yellow-100 px-1 rounded">agent_subscriptions</code> table
                  directly.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/app/admin/subscriptions")}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSaving || !formData.plan_id}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      `Send usage warning email to ${agent.email}? This will trigger the usage monitoring system.`
                    )
                  ) {
                    setSuccess("Email notification feature requires API implementation");
                  }
                }}
              >
                Send Usage Warning
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      `Reset usage tracking for ${agent.email}? This will recalculate their current usage.`
                    )
                  ) {
                    setSuccess("Usage reset feature requires API implementation");
                  }
                }}
              >
                Reset Usage Tracking
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
