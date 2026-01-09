import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAgentSubscriptionPlan } from "@/lib/subscriptions/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ArrowRight, AlertCircle, CreditCard, Calendar, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const user = userData.user;
  const params = await searchParams;
  const planId = params.plan;

  if (!planId) {
    redirect("/app/billing/upgrade");
  }

  // Get selected plan
  const { data: selectedPlan } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!selectedPlan) {
    redirect("/app/billing/upgrade");
  }

  // Get current subscription plan
  const currentPlan = await getAgentSubscriptionPlan(user.id);

  // Get current subscription details
  const { data: currentSubscription } = await supabase
    .from("agent_subscriptions")
    .select("*")
    .eq("agent_id", user.id)
    .eq("status", "active")
    .single();

  // Calculate pricing
  const isUpgrade = currentPlan && selectedPlan.tier_level > currentPlan.tier_level;
  const isDowngrade = currentPlan && selectedPlan.tier_level < currentPlan.tier_level;
  const isSamePlan = currentPlan?.id === selectedPlan.id;

  if (isSamePlan) {
    redirect("/app/billing");
  }

  // Get features for selected plan
  const { data: planFeatures } = await supabaseAdmin
    .from("plan_features")
    .select(`
      features (
        id,
        name,
        description,
        category
      )
    `)
    .eq("plan_id", planId)
    .eq("is_enabled", true);

  const features = planFeatures?.map((pf) => pf.features) || [];

  // Calculate prorated amount if upgrading mid-cycle
  let proratedAmount = selectedPlan.monthly_price;
  let proratedDays = 0;

  if (isUpgrade && currentSubscription && currentPlan) {
    const now = new Date();
    const periodEnd = new Date(currentSubscription.current_period_end);
    const periodStart = new Date(currentSubscription.current_period_start);
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    proratedDays = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (proratedDays > 0) {
      const unusedAmount = (currentPlan.monthly_price / totalDays) * proratedDays;
      const newAmount = (selectedPlan.monthly_price / totalDays) * proratedDays;
      proratedAmount = Math.max(0, newAmount - unusedAmount);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Change"} Your Plan
        </h1>
        <p className="text-muted-foreground">
          Review your plan change and confirm
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Change Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Change Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentPlan && (
                  <>
                    <div className="flex items-center justify-between pb-4 border-b">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Plan</p>
                        <p className="text-lg font-semibold">{currentPlan.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          ${currentPlan.monthly_price}/mo
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center py-2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">New Plan</p>
                    <p className="text-lg font-semibold">{selectedPlan.name}</p>
                    {isUpgrade && (
                      <Badge variant="default" className="mt-1 bg-purple-600">
                        Upgrade
                      </Badge>
                    )}
                    {isDowngrade && (
                      <Badge variant="outline" className="mt-1">
                        Downgrade
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      ${selectedPlan.monthly_price}/mo
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Your New Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Maximum Agents</span>
                  <div className="text-right">
                    {currentPlan && (
                      <span className="text-sm text-muted-foreground mr-2 line-through">
                        {currentPlan.max_agents === 999999 ? "Unlimited" : currentPlan.max_agents}
                      </span>
                    )}
                    <span className="font-semibold text-green-600">
                      {selectedPlan.max_agents === 999999 ? "Unlimited" : selectedPlan.max_agents}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-muted-foreground">Maximum Properties</span>
                  <div className="text-right">
                    {currentPlan && (
                      <span className="text-sm text-muted-foreground mr-2 line-through">
                        {currentPlan.max_properties === 999999 ? "Unlimited" : currentPlan.max_properties}
                      </span>
                    )}
                    <span className="font-semibold text-green-600">
                      {selectedPlan.max_properties === 999999 ? "Unlimited" : selectedPlan.max_properties}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Maximum Tenants</span>
                  <div className="text-right">
                    {currentPlan && (
                      <span className="text-sm text-muted-foreground mr-2 line-through">
                        {currentPlan.max_tenants === 999999 ? "Unlimited" : currentPlan.max_tenants}
                      </span>
                    )}
                    <span className="font-semibold text-green-600">
                      {selectedPlan.max_tenants === 999999 ? "Unlimited" : selectedPlan.max_tenants}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Included Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.slice(0, 8).map((feature: any) => (
                  <div key={feature.id} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature.name}</span>
                  </div>
                ))}
              </div>
              {features.length > 8 && (
                <p className="text-sm text-muted-foreground mt-4">
                  + {features.length - 8} more features
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Billing Cycle</span>
                  <span className="font-medium">Monthly</span>
                </div>

                {isUpgrade && proratedDays > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Due Today (Prorated)</span>
                      <span className="font-medium">${proratedAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prorated for {proratedDays} days remaining in current billing cycle
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex justify-between">
                    <span className="font-semibold">
                      {isUpgrade && proratedDays > 0 ? "Starting Next Cycle" : "Monthly Total"}
                    </span>
                    <span className="font-semibold text-lg">
                      ${selectedPlan.monthly_price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {currentSubscription?.next_billing_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {isUpgrade ? "Effective" : "Changes"} on{" "}
                      {new Date(currentSubscription.next_billing_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Link href="mailto:billing@realestategenie.app?subject=Plan Change Request" className="block">
                  <Button className="w-full" size="lg">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Contact Billing to Complete
                  </Button>
                </Link>

                <Link href="/app/billing/upgrade">
                  <Button variant="outline" className="w-full">
                    Back to Plans
                  </Button>
                </Link>
              </div>

              {/* Notice */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">Payment Integration Coming Soon</p>
                      <p className="text-xs">
                        Click the button above to contact our billing team. They'll process your
                        plan change and send you a payment link.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Guarantees */}
          <Card className="mt-6">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {isUpgrade ? "Upgrade" : "Change"} takes effect immediately
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Cancel or change plans anytime
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Secure payment processing with Stripe
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  24/7 billing support available
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
