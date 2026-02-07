import { supabaseServer } from "@/lib/supabase/server";
import GHLIntegrationCard from "./ghl-card";
import QBOIntegrationCard from "./qbo-card";
import PayPalOAuthCard from "./paypal-card-oauth";
import StripeOAuthCard from "./stripe-card-oauth";
import PayPalIntegrationCard from "./paypal-card";
import StripeIntegrationCard from "./stripe-card";
import TrestleIntegrationCard from "./trestle-card";
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

  // Fetch old integrations (GHL, QBO, and platform-level Stripe/PayPal for admins)
  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("agent_id", user.id);

  const ghlIntegration = integrations?.find((i) => i.provider === "ghl");
  const qboIntegration = integrations?.find((i) => i.provider === "qbo");
  const stripeIntegration = integrations?.find((i) => i.provider === "stripe");
  const paypalIntegration = integrations?.find((i) => i.provider === "paypal");
  const trestleIntegration = integrations?.find((i) => i.provider === "trestle");

  // Fetch new OAuth-based connections (for regular agents)
  const { data: connections } = await supabase
    .from("integration_connections")
    .select("*")
    .eq("agent_id", user.id);

  const stripeConnection = connections?.find((c) => c.integration_type === "stripe");
  const paypalConnection = connections?.find((c) => c.integration_type === "paypal");

  return (
    <div className="space-y-6">
      <IntegrationsNotifications />

      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          {isPlatformAdmin
            ? "Manage platform billing and agent tools"
            : "Connect your tools to automate lead management and follow-up"}
        </p>
      </div>

      {isPlatformAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-1">Platform Admin View</h3>
          <p className="text-sm text-blue-800">
            You're seeing API key integrations for platform billing (subscriptions, invoicing).
            Agents see OAuth connections for receiving tenant payments.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <GHLIntegrationCard integration={ghlIntegration} />
        <QBOIntegrationCard integration={qboIntegration} />

        {/* Show API key cards for platform admin, OAuth cards for agents */}
        {isPlatformAdmin ? (
          <>
            <StripeIntegrationCard integration={stripeIntegration} />
            <PayPalIntegrationCard integration={paypalIntegration} />
          </>
        ) : (
          <>
            <StripeOAuthCard connection={stripeConnection} />
            <PayPalOAuthCard connection={paypalConnection} />
          </>
        )}
      </div>

      {/* Trestle MLS Integration */}
      <TrestleIntegrationCard integration={trestleIntegration || null} />

      {/* Bridge Interactive / Zillow - Coming Soon */}
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
            Connect to Zillow's Bridge Interactive API for property valuations, rental estimates, and market data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 border rounded-lg bg-muted/20">
                <h4 className="font-medium text-muted-foreground text-sm">Zestimate Data</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Access Zillow's automated valuation estimates for properties
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/20">
                <h4 className="font-medium text-muted-foreground text-sm">Rental Estimates</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Get rental value predictions for investment analysis
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/20">
                <h4 className="font-medium text-muted-foreground text-sm">Property Details</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Comprehensive property information and tax data
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/20">
                <h4 className="font-medium text-muted-foreground text-sm">Market Trends</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Historical price trends and market forecasts
                </p>
              </div>
            </div>
            <button
              disabled
              className="w-full py-2 px-4 border rounded-md text-sm font-medium text-muted-foreground bg-muted/50 cursor-not-allowed"
            >
              Connect Bridge Interactive
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
