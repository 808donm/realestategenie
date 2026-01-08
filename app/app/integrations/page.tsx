import { supabaseServer } from "@/lib/supabase/server";
import GHLIntegrationCard from "./ghl-card";
import QBOIntegrationCard from "./qbo-card";
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

  // Fetch integrations
  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("agent_id", user.id);

  const ghlIntegration = integrations?.find((i) => i.provider === "ghl");
  const qboIntegration = integrations?.find((i) => i.provider === "qbo");
  const paypalIntegration = integrations?.find((i) => i.provider === "paypal");
  const stripeIntegration = integrations?.find((i) => i.provider === "stripe");

  return (
    <div className="space-y-6">
      <IntegrationsNotifications />

      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your tools to automate lead management and follow-up
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GHLIntegrationCard integration={ghlIntegration} />
        <QBOIntegrationCard integration={qboIntegration} />
        <PayPalIntegrationCard integration={paypalIntegration} />
        <StripeIntegrationCard integration={stripeIntegration} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            More integrations are on the way
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-lg opacity-50">
            <h3 className="font-semibold mb-1">IDX Broker</h3>
            <p className="text-sm text-muted-foreground">
              Sync listings and property data
            </p>
          </div>
          <div className="p-4 border rounded-lg opacity-50">
            <h3 className="font-semibold mb-1">Mailchimp</h3>
            <p className="text-sm text-muted-foreground">
              Email marketing automation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
