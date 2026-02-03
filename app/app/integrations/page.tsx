import { supabaseServer } from "@/lib/supabase/server";
import GHLIntegrationCard from "./ghl-card";
import QBOIntegrationCard from "./qbo-card";
import PayPalOAuthCard from "./paypal-card-oauth";
import StripeOAuthCard from "./stripe-card-oauth";
import PayPalIntegrationCard from "./paypal-card";
import StripeIntegrationCard from "./stripe-card";
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

      {/* MLS / IDX Integrations - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>MLS / IDX Integrations</span>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full font-normal">
              Coming Soon
            </span>
          </CardTitle>
          <CardDescription>
            Connect to MLS data feeds for property listings, 1031 exchange searches, and market analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">RC</span>
              </div>
              <h3 className="font-semibold text-muted-foreground">RealtyCandy</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              IDX plugin for property search and listings display on your website
            </p>
            <button
              disabled
              className="w-full py-2 px-4 border rounded-md text-sm font-medium text-muted-foreground bg-muted/50 cursor-not-allowed"
            >
              Connect
            </button>
          </div>
          <div className="p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">IDX</span>
              </div>
              <h3 className="font-semibold text-muted-foreground">IDX Broker</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Full-featured IDX solution with advanced search and lead capture
            </p>
            <button
              disabled
              className="w-full py-2 px-4 border rounded-md text-sm font-medium text-muted-foreground bg-muted/50 cursor-not-allowed"
            >
              Connect
            </button>
          </div>
          <div className="p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">OSI</span>
              </div>
              <h3 className="font-semibold text-muted-foreground">OSI IDX Broker</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Open source IDX integration with flexible customization options
            </p>
            <button
              disabled
              className="w-full py-2 px-4 border rounded-md text-sm font-medium text-muted-foreground bg-muted/50 cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
