import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAgentSubscriptionPlan } from "@/lib/subscriptions/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ArrowRight, Crown, Zap, Building2, Users, Home, UserCheck, Warehouse } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UpgradePage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const user = userData.user;

  // Get current subscription plan
  const currentPlan = await getAgentSubscriptionPlan(user.id);

  // Get all available plans
  const { data: plans } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .eq("is_custom", false)
    .order("tier_level", { ascending: true });

  // Get features for each plan
  const { data: planFeatures } = await supabaseAdmin
    .from("plan_features")
    .select(`
      plan_id,
      features (
        id,
        name,
        slug,
        description,
        category
      )
    `)
    .eq("is_enabled", true);

  // Get PM addon plans
  const { data: pmPlans } = await supabaseAdmin
    .from("pm_addon_plans")
    .select("*")
    .eq("is_active", true)
    .order("tier_level", { ascending: true });

  // Get current PM addon (if any)
  const { data: currentPmAddon } = await supabaseAdmin
    .from("pm_addon_subscriptions")
    .select("pm_addon_plan_id")
    .eq("agent_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  // Group features by plan
  const featuresByPlan = new Map<string, any[]>();
  planFeatures?.forEach((pf) => {
    if (!featuresByPlan.has(pf.plan_id)) {
      featuresByPlan.set(pf.plan_id, []);
    }
    featuresByPlan.get(pf.plan_id)?.push(pf.features);
  });

  const planIcons = {
    1: UserCheck,
    2: Zap,
    3: Building2,
    4: Users,
    5: Crown,
  };

  const planColors = {
    1: "from-gray-500 to-gray-600",
    2: "from-blue-500 to-blue-600",
    3: "from-purple-500 to-purple-600",
    4: "from-orange-500 to-orange-600",
    5: "from-yellow-500 to-yellow-600",
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-muted-foreground">
          Select the perfect plan for your real estate business. Upgrade or downgrade anytime.
        </p>
        {currentPlan && (
          <div className="mt-4">
            <Badge variant="outline" className="text-sm">
              Current Plan: {currentPlan.name}
            </Badge>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {plans?.map((plan) => {
          const Icon = planIcons[plan.tier_level as keyof typeof planIcons] || UserCheck;
          const gradient = planColors[plan.tier_level as keyof typeof planColors] || "from-gray-500 to-gray-600";
          const isCurrentPlan = currentPlan?.id === plan.id;
          const isUpgrade = currentPlan && plan.tier_level > currentPlan.tier_level;
          const isDowngrade = currentPlan && plan.tier_level < currentPlan.tier_level;
          const features = featuresByPlan.get(plan.id) || [];

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                isCurrentPlan ? "ring-2 ring-blue-500 shadow-lg" : ""
              } ${isUpgrade ? "border-purple-200" : ""}`}
            >
              {/* Plan Header */}
              <CardHeader className={`bg-gradient-to-r ${gradient} text-white rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <Icon className="h-8 w-8" />
                  {isCurrentPlan && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Current
                    </Badge>
                  )}
                  {plan.tier_level === 5 && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Popular
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl mt-4">{plan.name}</CardTitle>
                <CardDescription className="text-white/90">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 pt-6">
                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      ${plan.monthly_price}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {plan.annual_price && (
                    <p className="text-sm text-muted-foreground mt-1">
                      or ${plan.annual_price}/year (save{" "}
                      {Math.round((1 - plan.annual_price / (plan.monthly_price * 12)) * 100)}%)
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-3 mb-6 pb-6 border-b">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Agents</span>
                    <span className="font-semibold">
                      {plan.max_agents === 999999 ? "Unlimited" : plan.max_agents}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Properties</span>
                    <span className="font-semibold">
                      {plan.max_properties === 999999 ? "Unlimited" : plan.max_properties}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tenants</span>
                    <span className="font-semibold">
                      {plan.max_tenants === 999999 ? "Unlimited" : plan.max_tenants}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">
                    Includes:
                  </p>
                  {features.slice(0, 5).map((feature: any) => (
                    <div key={feature.id} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature.name}</span>
                    </div>
                  ))}
                  {features.length > 5 && (
                    <p className="text-sm text-muted-foreground pl-6">
                      + {features.length - 5} more features
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <div className="mt-auto">
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Link href={`/app/billing/checkout?plan=${plan.id}`} className="block">
                      <Button
                        className={`w-full ${
                          isUpgrade
                            ? "bg-purple-600 hover:bg-purple-700"
                            : isDowngrade
                            ? "bg-gray-600 hover:bg-gray-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Select Plan"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enterprise Custom */}
      <Card className="max-w-4xl mx-auto border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardContent className="p-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                <Crown className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">Need a Custom Plan?</h3>
              <p className="text-muted-foreground mb-4">
                For large brokerages with unique requirements, we offer custom enterprise plans with
                dedicated support, custom integrations, and volume pricing.
              </p>
              <div className="flex gap-3">
                <Link href="mailto:sales@realestategenie.app?subject=Enterprise Plan Inquiry">
                  <Button size="lg">
                    Contact Sales
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/app">
                  <Button variant="outline" size="lg">
                    Maybe Later
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Management Add-ons */}
      {pmPlans && pmPlans.length > 0 && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Property Management Add-ons</h2>
            <p className="text-muted-foreground">
              All plans include base PM capacity (10 properties, 50 tenants). Need more? Add a PM plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pmPlans.map((pm) => {
              const isCurrentAddon = currentPmAddon?.pm_addon_plan_id === pm.id;
              const pmIcons: Record<number, any> = { 1: Home, 2: Building2, 3: Warehouse, 4: Users };
              const pmGradients: Record<number, string> = {
                1: "from-emerald-500 to-emerald-600",
                2: "from-teal-500 to-teal-600",
                3: "from-cyan-500 to-cyan-600",
                4: "from-blue-500 to-blue-600",
              };
              const Icon = pmIcons[pm.tier_level] || Home;
              const gradient = pmGradients[pm.tier_level] || "from-gray-500 to-gray-600";

              return (
                <Card
                  key={pm.id}
                  className={`relative ${isCurrentAddon ? "ring-2 ring-green-500" : ""}`}
                >
                  <CardHeader className={`bg-gradient-to-r ${gradient} text-white rounded-t-lg py-4`}>
                    <div className="flex items-center justify-between">
                      <Icon className="h-6 w-6" />
                      {isCurrentAddon && (
                        <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">{pm.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-bold">${pm.monthly_price}</span>
                      <span className="text-muted-foreground text-sm">/mo</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Properties</span>
                        <span className="font-semibold">{pm.max_properties}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tenants</span>
                        <span className="font-semibold">{pm.max_tenants}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Link href="/app/billing/addons">
              <Button size="lg" variant="outline">
                View PM Add-on Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Can I change plans later?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect
              immediately for upgrades, or at the end of your billing cycle for downgrades.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What happens if I exceed my limits?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We believe in fair-use limits. If you exceed your plan's limits, you'll receive a
              notification suggesting an upgrade, but your service won't be interrupted. We'll work
              with you to find the right plan.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Do you offer annual billing?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Yes! Annual billing is available for most plans and includes a discount compared to
              monthly billing. Contact us to switch to annual billing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We accept all major credit cards, ACH transfers, and can set up invoicing for
              enterprise customers.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Back Link */}
      <div className="text-center">
        <Link href="/app/billing">
          <Button variant="outline">
            Back to Billing
          </Button>
        </Link>
      </div>
    </div>
  );
}
