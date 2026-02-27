import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import GHLIntegrationCard from "./ghl-card";
import QBOIntegrationCard from "./qbo-card";
import PayPalOAuthCard from "./paypal-card-oauth";
import StripeOAuthCard from "./stripe-card-oauth";
import PayPalIntegrationCard from "./paypal-card";
import StripeIntegrationCard from "./stripe-card";
import TrestleIntegrationCard from "./trestle-card";
import AttomIntegrationCard from "./attom-card";
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

  // ATTOM is platform-wide — find any connected ATTOM integration across all agents
  const { data: attomIntegrations } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("provider", "attom")
    .limit(1);

  const attomIntegration = attomIntegrations?.[0] || null;

  // Federal Data is platform-wide — find any connected integration across all agents
  const { data: federalIntegrations } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("provider", "federal_data")
    .limit(1);

  const federalIntegration = federalIntegrations?.[0] || null;

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

      {/* MLS & Property Data Integrations */}
      <div className="grid gap-6 md:grid-cols-2">
        <TrestleIntegrationCard integration={trestleIntegration || null} />
        <AttomIntegrationCard integration={attomIntegration} isPlatformAdmin={isPlatformAdmin} />
        <FederalDataIntegrationCard integration={federalIntegration} isPlatformAdmin={isPlatformAdmin} />
      </div>

      {/* Coming Soon Integrations */}
      <div className="grid gap-6 md:grid-cols-2">
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

        {/* Voice AI Agents */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </div>
              <span>Voice AI Agents</span>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full font-normal">
                Coming Soon
              </span>
            </CardTitle>
            <CardDescription>
              AI-powered voice agents for lead qualification and appointment scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button disabled className="w-full py-2 px-4 border rounded-md text-sm font-medium text-muted-foreground bg-muted/50 cursor-not-allowed">
              Connect Voice AI
            </button>
          </CardContent>
        </Card>

        {/* AI Employee */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="5"/>
                  <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  <path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
                </svg>
              </div>
              <span>AI Employee</span>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full font-normal">
                Coming Soon
              </span>
            </CardTitle>
            <CardDescription>
              Autonomous AI assistant for follow-ups, market reports, and client communications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button disabled className="w-full py-2 px-4 border rounded-md text-sm font-medium text-muted-foreground bg-muted/50 cursor-not-allowed">
              Connect AI Employee
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
