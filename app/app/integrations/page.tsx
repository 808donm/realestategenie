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

    </div>
  );
}
