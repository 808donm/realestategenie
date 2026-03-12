import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import GHLIntegrationCard from "./ghl-card";
import PayPalIntegrationCard from "./paypal-card";
import StripeIntegrationCard from "./stripe-card";
import TrestleIntegrationCard from "./trestle-card";
import RealieIntegrationCard from "./realie-card";
import FederalDataIntegrationCard from "./federal-data-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import IntegrationsNotifications from "./notifications";

export default async function IntegrationsPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Check if user is platform admin
  const { data: agent } = await supabase
    .from("agents")
    .select("role")
    .eq("id", user.id)
    .single();

  const isPlatformAdmin = agent?.role === "admin";

  // Fetch integrations
  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("agent_id", user.id);

  const ghlIntegration = integrations?.find((i) => i.provider === "ghl");
  const stripeIntegration = integrations?.find((i) => i.provider === "stripe");
  const paypalIntegration = integrations?.find((i) => i.provider === "paypal");
  const trestleIntegration = integrations?.find((i) => i.provider === "trestle");

  // Realie.ai is platform-wide — find any connected Realie integration across all agents
  const { data: realieIntegrations } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("provider", "realie")
    .limit(1);

  const realieIntegration = realieIntegrations?.[0] || null;

  // Federal Data is platform-wide — find any connected integration across all agents
  const { data: federalIntegrations } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("provider", "federal_data")
    .limit(1);

  const federalIntegration = federalIntegrations?.[0] || null;

  return (
    <div className="space-y-6">
      <IntegrationsNotifications />

      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your tools to automate lead management and follow-up
        </p>
      </div>

      {/* Primary Integrations — LeadConnector & Trestle */}
      <div className="grid gap-6 md:grid-cols-2">
        <GHLIntegrationCard integration={ghlIntegration} />
        <TrestleIntegrationCard integration={trestleIntegration || null} />
      </div>

      {/* Admin-only Integrations */}
      {isPlatformAdmin && (
        <div className="grid gap-6 md:grid-cols-2">
          <StripeIntegrationCard integration={stripeIntegration} />
          <PayPalIntegrationCard integration={paypalIntegration} />
          <RealieIntegrationCard integration={realieIntegration} isPlatformAdmin={isPlatformAdmin} />
          <FederalDataIntegrationCard integration={federalIntegration} isPlatformAdmin={isPlatformAdmin} />

          {/* Bridge Interactive / Zillow */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-10 w-10 rounded bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                    <path d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5z"/>
                    <path d="M10 14h4v5h-4z"/>
                  </svg>
                </div>
                <span>Bridge Interactive / Zillow</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full font-normal">
                  Coming Soon
                </span>
              </CardTitle>
              <CardDescription>
                Property valuations, rental estimates, and market data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button disabled className="w-full py-2 px-4 border rounded-md text-sm font-medium text-muted-foreground bg-muted/50 cursor-not-allowed">
                Connect Bridge Interactive
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
