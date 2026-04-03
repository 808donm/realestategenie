import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkFeatureAccess } from "@/lib/subscriptions/server-utils";
import AgencyDashboard from "./agency-dashboard.client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BrokerDashboardPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Check if user is broker or admin
  const { data: agent } = await supabase
    .from("agents")
    .select("role, display_name, is_admin")
    .eq("id", userData.user.id)
    .single();

  if (!agent || (agent.role !== "broker" && agent.role !== "admin" && !agent.is_admin)) {
    redirect("/app/dashboard");
  }

  // Check if user has access to broker dashboard feature
  const hasBrokerDashboard = await checkFeatureAccess("broker-dashboard");
  if (!hasBrokerDashboard) {
    redirect("/app/billing?feature=broker-dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Agency Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Team performance, lead analytics, and agent activity
        </p>
      </div>
      <AgencyDashboard />
    </div>
  );
}
