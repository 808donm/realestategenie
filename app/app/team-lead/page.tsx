import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  UserCheck,
  Flame,
  ThermometerSun,
  Target,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamLeadDashboardPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Check if user is team lead
  const { data: agent } = await supabase
    .from("agents")
    .select("role, display_name")
    .eq("id", userData.user.id)
    .single();

  if (!agent || agent.role !== "team_lead") {
    redirect("/app/dashboard");
  }

  // Get team lead's team
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, description")
    .eq("team_lead_id", userData.user.id)
    .single();

  if (!team) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Team Lead Dashboard</h2>
          <p className="text-muted-foreground mt-1">No team assigned yet</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              You don't have a team assigned yet. Contact your broker to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get team members
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select(
      `
      *,
      agents (id, display_name, email)
    `
    )
    .eq("team_id", team.id)
    .eq("is_active", true);

  const agentIds = teamMembers?.map((tm: any) => tm.agent_id) || [];

  // Get team performance data
  const { data: openHouses } = await supabase
    .from("open_house_events")
    .select("id, status, agent_id")
    .in("agent_id", agentIds);

  const totalOpenHouses = openHouses?.length || 0;

  // Get leads
  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id, heat_score, agent_id")
    .in("agent_id", agentIds);

  const totalLeads = leads?.length || 0;
  const hotLeads = leads?.filter((l) => l.heat_score >= 80).length || 0;
  const warmLeads = leads?.filter((l) => l.heat_score >= 50 && l.heat_score < 80).length || 0;

  // Get leases
  const { data: leases } = await supabase
    .from("pm_leases")
    .select("id, monthly_rent, agent_id")
    .in("agent_id", agentIds)
    .in("status", ["active", "month_to_month"]);

  const totalActiveLeases = leases?.length || 0;
  const totalMonthlyRevenue =
    leases?.reduce((sum, l) => sum + parseFloat(l.monthly_rent.toString()), 0) || 0;

  // Calculate individual agent performance
  const agentPerformance = await Promise.all(
    (teamMembers || []).map(async (tm: any) => {
      const agentId = tm.agent_id;

      // Open houses
      const agentOpenHouses = openHouses?.filter((oh) => oh.agent_id === agentId).length || 0;

      // Leads
      const agentLeads = leads?.filter((l) => l.agent_id === agentId) || [];
      const agentHotLeads = agentLeads.filter((l) => l.heat_score >= 80).length;

      // Leases and revenue
      const agentLeases = leases?.filter((l) => l.agent_id === agentId) || [];
      const agentRevenue = agentLeases.reduce(
        (sum, l) => sum + parseFloat(l.monthly_rent.toString()),
        0
      );

      return {
        agent_id: agentId,
        agent_name: tm.agents.display_name,
        agent_email: tm.agents.email,
        openHouses: agentOpenHouses,
        totalLeads: agentLeads.length,
        hotLeads: agentHotLeads,
        activeLeases: agentLeases.length,
        monthlyRevenue: agentRevenue,
      };
    })
  );

  // Sort by performance (hot leads + revenue)
  agentPerformance.sort((a, b) => {
    const scoreA = a.hotLeads * 1000 + a.monthlyRevenue;
    const scoreB = b.hotLeads * 1000 + b.monthlyRevenue;
    return scoreB - scoreA;
  });

  // Get top performer
  const topPerformer = agentPerformance[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold">Team Lead Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Managing <span className="font-semibold">{team.name}</span>
        </p>
      </div>

      {/* Team Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{teamMembers?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active agents</p>
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
            <p className="text-xs text-muted-foreground mt-1">
              {(totalOpenHouses / (teamMembers?.length || 1)).toFixed(1)} per agent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Hot Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{hotLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalLeads} total leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${totalMonthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalActiveLeases} leases</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Team Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total Leads</div>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <div className="text-xs text-muted-foreground">
                {(totalLeads / (totalOpenHouses || 1)).toFixed(1)} per open house
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Flame className="h-3 w-3 text-red-500" />
                Hot Leads
              </div>
              <div className="text-2xl font-bold text-red-600">{hotLeads}</div>
              <div className="text-xs text-muted-foreground">
                {totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : 0}% conversion
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <ThermometerSun className="h-3 w-3 text-orange-500" />
                Warm Leads
              </div>
              <div className="text-2xl font-bold text-orange-600">{warmLeads}</div>
              <div className="text-xs text-muted-foreground">
                {totalLeads > 0 ? ((warmLeads / totalLeads) * 100).toFixed(1) : 0}% of total
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performer */}
      {topPerformer && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-yellow-600" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{topPerformer.agent_name}</div>
                <div className="text-sm text-muted-foreground">{topPerformer.agent_email}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ${topPerformer.monthlyRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {topPerformer.hotLeads} hot leads • {topPerformer.openHouses} open houses
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <th className="text-right py-3 px-4 font-semibold">Open Houses</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Leads</th>
                    <th className="text-right py-3 px-4 font-semibold">Hot Leads</th>
                    <th className="text-right py-3 px-4 font-semibold">Active Leases</th>
                    <th className="text-right py-3 px-4 font-semibold">Monthly Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((agent, index) => (
                    <tr
                      key={agent.agent_id}
                      className={`border-b hover:bg-gray-50 ${index === 0 ? "bg-yellow-50" : ""}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <Badge className="bg-yellow-500 text-white">★</Badge>
                          )}
                          <div>
                            <div className="font-medium">{agent.agent_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {agent.agent_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">{agent.openHouses}</td>
                      <td className="text-right py-3 px-4">{agent.totalLeads}</td>
                      <td className="text-right py-3 px-4">
                        <span className="font-semibold text-red-600">{agent.hotLeads}</span>
                      </td>
                      <td className="text-right py-3 px-4">{agent.activeLeases}</td>
                      <td className="text-right py-3 px-4 font-semibold text-green-600">
                        ${agent.monthlyRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="py-3 px-4">TEAM TOTALS</td>
                    <td className="text-right py-3 px-4">{totalOpenHouses}</td>
                    <td className="text-right py-3 px-4">{totalLeads}</td>
                    <td className="text-right py-3 px-4 text-red-600">{hotLeads}</td>
                    <td className="text-right py-3 px-4">{totalActiveLeases}</td>
                    <td className="text-right py-3 px-4 text-green-600">
                      ${totalMonthlyRevenue.toLocaleString()}
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
