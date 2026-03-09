import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  UserCheck,
  Flame,
  ThermometerSun,
} from "lucide-react";
import { checkFeatureAccess } from "@/lib/subscriptions/server-utils";

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
    .select("role, display_name")
    .eq("id", userData.user.id)
    .single();

  if (!agent || (agent.role !== "broker" && agent.role !== "admin")) {
    redirect("/app/dashboard");
  }

  // Check if user has access to broker dashboard feature
  const hasBrokerDashboard = await checkFeatureAccess("broker-dashboard");
  if (!hasBrokerDashboard) {
    redirect("/app/billing?feature=broker-dashboard");
  }

  // Get all agents under this broker
  const { data: brokerAgents } = await supabase.rpc("get_broker_agents", {
    broker_uuid: userData.user.id,
  });

  const agentIds = brokerAgents?.map((a: any) => a.agent_id) || [];
  agentIds.push(userData.user.id); // Include broker's own data

  // ============================================================================
  // OPEN HOUSE METRICS
  // ============================================================================

  const { data: openHouses } = await supabase
    .from("open_house_events")
    .select("id, status, start_at, address")
    .in("agent_id", agentIds)
    .order("start_at", { ascending: false });

  const totalOpenHouses = openHouses?.length || 0;
  const publishedOpenHouses =
    openHouses?.filter((oh) => oh.status === "published").length || 0;

  // Get leads for open houses
  const openHouseIds = openHouses?.map((oh) => oh.id) || [];

  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id, heat_score, event_id, agent_id")
    .in("event_id", openHouseIds);

  const totalLeads = leads?.length || 0;
  const hotLeads = leads?.filter((l) => l.heat_score >= 80).length || 0;
  const warmLeads = leads?.filter((l) => l.heat_score >= 50 && l.heat_score < 80).length || 0;

  // Average leads per open house
  const avgLeadsPerOpenHouse = totalOpenHouses > 0 ? totalLeads / totalOpenHouses : 0;
  const avgHotLeadsPerOpenHouse = totalOpenHouses > 0 ? hotLeads / totalOpenHouses : 0;
  const avgWarmLeadsPerOpenHouse = totalOpenHouses > 0 ? warmLeads / totalOpenHouses : 0;

  // ============================================================================
  // AGENT PERFORMANCE
  // ============================================================================

  const agentPerformance = await Promise.all(
    (brokerAgents || []).map(async (ba: any) => {
      const { data: agentOpenHouses } = await supabase
        .from("open_house_events")
        .select("id")
        .eq("agent_id", ba.agent_id);

      const { data: agentLeads } = await supabase
        .from("lead_submissions")
        .select("heat_score")
        .eq("agent_id", ba.agent_id);

      return {
        ...ba,
        openHouses: agentOpenHouses?.length || 0,
        totalLeads: agentLeads?.length || 0,
        hotLeads: agentLeads?.filter((l) => l.heat_score >= 80).length || 0,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold">Broker Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Overview of team performance and lead generation
        </p>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agentIds.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Open Houses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOpenHouses}</div>
            <p className="text-xs text-muted-foreground mt-1">{publishedOpenHouses} published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-500" />
              Hot Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{hotLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Score 80+</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-orange-500" />
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {avgLeadsPerOpenHouse.toFixed(1)} per open house
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Open House Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Open House Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total Open Houses</div>
              <div className="text-2xl font-bold">{totalOpenHouses}</div>
              <div className="text-xs text-muted-foreground">
                {publishedOpenHouses} published
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total Leads</div>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <div className="text-xs text-muted-foreground">
                {avgLeadsPerOpenHouse.toFixed(1)} per open house
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Flame className="h-3 w-3 text-red-500" />
                Hot Leads
              </div>
              <div className="text-2xl font-bold text-red-600">{hotLeads}</div>
              <div className="text-xs text-muted-foreground">
                {avgHotLeadsPerOpenHouse.toFixed(1)} per open house
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <ThermometerSun className="h-3 w-3 text-orange-500" />
                Warm Leads
              </div>
              <div className="text-2xl font-bold text-orange-600">{warmLeads}</div>
              <div className="text-xs text-muted-foreground">
                {avgWarmLeadsPerOpenHouse.toFixed(1)} per open house
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Agent Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agentPerformance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No agents in your team yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Agent</th>
                    <th className="text-left py-3 px-4 font-semibold">Team</th>
                    <th className="text-right py-3 px-4 font-semibold">Open Houses</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Leads</th>
                    <th className="text-right py-3 px-4 font-semibold">Hot Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((agent: any) => (
                    <tr key={agent.agent_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{agent.agent_name}</div>
                          <div className="text-xs text-muted-foreground">{agent.agent_email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{agent.team_name || "Direct"}</Badge>
                      </td>
                      <td className="text-right py-3 px-4">{agent.openHouses}</td>
                      <td className="text-right py-3 px-4">{agent.totalLeads}</td>
                      <td className="text-right py-3 px-4">
                        <span className="font-semibold text-red-600">{agent.hotLeads}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="py-3 px-4" colSpan={2}>
                      TOTALS
                    </td>
                    <td className="text-right py-3 px-4">
                      {agentPerformance.reduce((sum: number, a: any) => sum + a.openHouses, 0)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {agentPerformance.reduce((sum: number, a: any) => sum + a.totalLeads, 0)}
                    </td>
                    <td className="text-right py-3 px-4 text-red-600">
                      {agentPerformance.reduce((sum: number, a: any) => sum + a.hotLeads, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
