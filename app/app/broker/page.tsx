import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Home,
  Users,
  TrendingUp,
  DollarSign,
  Building2,
  Calendar,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Flame,
  ThermometerSun,
} from "lucide-react";

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

  // Get all agents under this broker
  const { data: brokerAgents } = await supabase.rpc("get_broker_agents", {
    broker_uuid: userData.user.id,
  });

  const agentIds = brokerAgents?.map((a: any) => a.agent_id) || [];
  agentIds.push(userData.user.id); // Include broker's own data

  // ============================================================================
  // PROPERTY MANAGEMENT METRICS
  // ============================================================================

  // Total properties
  const { data: properties } = await supabase
    .from("pm_properties")
    .select("id, status, units_count")
    .in("agent_id", agentIds);

  const totalProperties = properties?.length || 0;
  const totalUnits =
    properties?.reduce((sum, p) => sum + (p.units_count || 1), 0) || 0;

  // Get all units
  const { data: units } = await supabase
    .from("pm_units")
    .select("id, status")
    .in("agent_id", agentIds);

  const unitsOccupied = units?.filter((u) => u.status === "rented").length || 0;
  const unitsVacant = units?.filter((u) => u.status === "available").length || 0;
  const occupancyRate = totalUnits > 0 ? (unitsOccupied / totalUnits) * 100 : 0;

  // Active leases
  const { data: activeLeases } = await supabase
    .from("pm_leases")
    .select("id, lease_end_date, lease_start_date, monthly_rent")
    .in("agent_id", agentIds)
    .in("status", ["active", "month_to_month"]);

  const totalActiveLeases = activeLeases?.length || 0;

  // Leases terminating (next 60 days)
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  const leasesTerminating =
    activeLeases?.filter((l) => {
      const endDate = new Date(l.lease_end_date);
      return endDate <= sixtyDaysFromNow && endDate >= new Date();
    }).length || 0;

  // Leases starting (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const { data: upcomingLeases } = await supabase
    .from("pm_leases")
    .select("id")
    .in("agent_id", agentIds)
    .eq("status", "pending_start")
    .gte("lease_start_date", new Date().toISOString())
    .lte("lease_start_date", thirtyDaysFromNow.toISOString());

  const leasesStarting = upcomingLeases?.length || 0;

  // Monthly rental income
  const monthlyRentalIncome =
    activeLeases?.reduce((sum, l) => sum + parseFloat(l.monthly_rent.toString()), 0) || 0;

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
    .select("id, heat_score, event_id")
    .in("event_id", openHouseIds);

  const totalLeads = leads?.length || 0;
  const hotLeads = leads?.filter((l) => l.heat_score >= 80).length || 0;
  const warmLeads = leads?.filter((l) => l.heat_score >= 50 && l.heat_score < 80).length || 0;
  const coldLeads = leads?.filter((l) => l.heat_score < 50).length || 0;

  // Average leads per open house
  const avgLeadsPerOpenHouse = totalOpenHouses > 0 ? totalLeads / totalOpenHouses : 0;
  const avgHotLeadsPerOpenHouse = totalOpenHouses > 0 ? hotLeads / totalOpenHouses : 0;
  const avgWarmLeadsPerOpenHouse = totalOpenHouses > 0 ? warmLeads / totalOpenHouses : 0;

  // ============================================================================
  // REVENUE METRICS
  // ============================================================================

  // Rent payments (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data: payments } = await supabase
    .from("pm_rent_payments")
    .select("amount, status, paid_at")
    .in("agent_id", agentIds)
    .eq("status", "paid")
    .gte("paid_at", twelveMonthsAgo.toISOString());

  const totalRevenueLast12Months =
    payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

  // Current month revenue
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const currentMonthRevenue =
    payments
      ?.filter((p) => new Date(p.paid_at) >= firstDayOfMonth)
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

  // ============================================================================
  // AGENT PERFORMANCE
  // ============================================================================

  const agentPerformance = await Promise.all(
    (brokerAgents || []).map(async (ba: any) => {
      // Get agent's open houses
      const { data: agentOpenHouses } = await supabase
        .from("open_house_events")
        .select("id")
        .eq("agent_id", ba.agent_id);

      // Get agent's leads
      const { data: agentLeads } = await supabase
        .from("lead_submissions")
        .select("heat_score")
        .eq("agent_id", ba.agent_id);

      // Get agent's leases
      const { data: agentLeases } = await supabase
        .from("pm_leases")
        .select("monthly_rent")
        .eq("agent_id", ba.agent_id)
        .in("status", ["active", "month_to_month"]);

      const agentRevenue =
        agentLeases?.reduce((sum, l) => sum + parseFloat(l.monthly_rent.toString()), 0) || 0;

      return {
        ...ba,
        openHouses: agentOpenHouses?.length || 0,
        totalLeads: agentLeads?.length || 0,
        hotLeads: agentLeads?.filter((l) => l.heat_score >= 80).length || 0,
        activeLeases: agentLeases?.length || 0,
        monthlyRevenue: agentRevenue,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold">Broker Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Complete overview of all operations and team performance
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
              <Home className="h-4 w-4" />
              Total Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProperties}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalUnits} total units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Active Leases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalActiveLeases}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {occupancyRate.toFixed(1)}% occupancy
            </p>
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
              ${monthlyRentalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recurring rental income</p>
          </CardContent>
        </Card>
      </div>

      {/* Property Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Management Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Units Occupied</div>
              <div className="text-2xl font-bold text-green-600">{unitsOccupied}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Units Vacant</div>
              <div className="text-2xl font-bold text-orange-600">{unitsVacant}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Occupancy Rate</div>
              <div className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Leases Terminating
              </div>
              <div className="text-2xl font-bold text-red-600">{leasesTerminating}</div>
              <div className="text-xs text-muted-foreground">Next 60 days</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Leases Starting
              </div>
              <div className="text-2xl font-bold text-blue-600">{leasesStarting}</div>
              <div className="text-xs text-muted-foreground">Next 30 days</div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Revenue Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Current Month</div>
              <div className="text-2xl font-bold text-green-600">
                ${currentMonthRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Collected this month</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Last 12 Months</div>
              <div className="text-2xl font-bold">
                ${totalRevenueLast12Months.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total collected</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Monthly Recurring</div>
              <div className="text-2xl font-bold text-blue-600">
                ${monthlyRentalIncome.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Expected monthly</div>
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
                    <th className="text-right py-3 px-4 font-semibold">Active Leases</th>
                    <th className="text-right py-3 px-4 font-semibold">Monthly Revenue</th>
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
                      <td className="text-right py-3 px-4">{agent.activeLeases}</td>
                      <td className="text-right py-3 px-4 font-semibold text-green-600">
                        ${agent.monthlyRevenue.toLocaleString()}
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
                    <td className="text-right py-3 px-4">
                      {agentPerformance.reduce((sum: number, a: any) => sum + a.activeLeases, 0)}
                    </td>
                    <td className="text-right py-3 px-4 text-green-600">
                      $
                      {agentPerformance
                        .reduce((sum: number, a: any) => sum + a.monthlyRevenue, 0)
                        .toLocaleString()}
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
