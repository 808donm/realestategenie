import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ArrowLeft, Home, Users, Building2, Warehouse } from "lucide-react";
import PmAddonCheckoutButton from "./pm-addon-checkout-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PmAddonsPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Get available PM addon plans
  const { data: pmPlans } = await supabaseAdmin
    .from("pm_addon_plans")
    .select("*")
    .eq("is_active", true)
    .order("tier_level", { ascending: true });

  // Get current PM addon subscription (if any)
  const { data: currentAddon } = await supabaseAdmin
    .from("pm_addon_subscriptions")
    .select("*, pm_addon_plans(*)")
    .eq("agent_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();

  // Get base plan limits for context
  const { data: subscription } = await supabase
    .from("agent_subscriptions")
    .select("*, subscription_plans(*)")
    .eq("agent_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();

  const basePlan = subscription?.subscription_plans;

  const tierIcons = {
    1: Home,
    2: Building2,
    3: Warehouse,
    4: Users,
  };

  const tierGradients = {
    1: "from-emerald-500 to-emerald-600",
    2: "from-teal-500 to-teal-600",
    3: "from-cyan-500 to-cyan-600",
    4: "from-blue-500 to-blue-600",
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <Link
          href="/app/billing"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Billing
        </Link>
        <h1 className="text-3xl font-bold mb-2">Property Management Add-ons</h1>
        <p className="text-muted-foreground">
          Expand your property management capacity beyond the base limits included with your plan.
        </p>
      </div>

      {/* Current Base Limits Info */}
      {basePlan && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Your <span className="font-semibold text-foreground">{basePlan.name}</span> plan
                  includes:
                </p>
                <p className="text-sm mt-1">
                  <span className="font-medium">{basePlan.max_properties}</span> properties &bull;{" "}
                  <span className="font-medium">{basePlan.max_tenants}</span> tenants
                </p>
              </div>
              {currentAddon && (
                <Badge className="bg-green-100 text-green-800">
                  Active: {currentAddon.pm_addon_plans?.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PM Addon Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pmPlans?.map((plan) => {
          const Icon = tierIcons[plan.tier_level as keyof typeof tierIcons] || Home;
          const gradient =
            tierGradients[plan.tier_level as keyof typeof tierGradients] ||
            "from-gray-500 to-gray-600";
          const isCurrentAddon = currentAddon?.pm_addon_plan_id === plan.id;
          const isUpgrade =
            currentAddon &&
            currentAddon.pm_addon_plans &&
            plan.tier_level > currentAddon.pm_addon_plans.tier_level;
          const isDowngrade =
            currentAddon &&
            currentAddon.pm_addon_plans &&
            plan.tier_level < currentAddon.pm_addon_plans.tier_level;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                isCurrentAddon ? "ring-2 ring-green-500 shadow-lg" : ""
              }`}
            >
              {/* Plan Header */}
              <CardHeader className={`bg-gradient-to-r ${gradient} text-white rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <Icon className="h-7 w-7" />
                  {isCurrentAddon && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Current
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl mt-3">{plan.name}</CardTitle>
                {plan.description && (
                  <CardDescription className="text-white/90">
                    {plan.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1 pt-6 flex flex-col">
                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.monthly_price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Added to your base plan cost
                  </p>
                </div>

                {/* Limits */}
                <div className="space-y-3 mb-6 pb-6 border-b">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Properties</span>
                    <span className="font-semibold">{plan.max_properties}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tenants</span>
                    <span className="font-semibold">{plan.max_tenants}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Lease management</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Tenant screening</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Maintenance tracking</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Rent collection</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-auto">
                  {isCurrentAddon ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Add-on
                    </Button>
                  ) : (
                    <PmAddonCheckoutButton
                      pmAddonPlanId={plan.id}
                      label={
                        isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Add to Plan"
                      }
                      variant={isDowngrade ? "outline" : "default"}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">How PM Add-ons Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            PM add-ons replace the base property and tenant limits from your main plan with higher
            capacity. They are billed as a separate monthly subscription on top of your base plan.
          </p>
          <p>
            If you upgrade your PM add-on, the new limits take effect immediately and the billing
            is prorated. You can cancel or change your PM add-on at any time.
          </p>
        </CardContent>
      </Card>

      {/* Back Link */}
      <div className="text-center">
        <Link href="/app/billing">
          <Button variant="outline">Back to Billing</Button>
        </Link>
      </div>
    </div>
  );
}
