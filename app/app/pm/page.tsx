import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, FileText, FileSignature, Wrench, DollarSign } from "lucide-react";

export default async function PMOverviewPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  // Get PM stats
  const { data: properties } = await supabase
    .from("pm_properties")
    .select("id, status")
    .eq("agent_id", userData.user.id);

  const { data: applications } = await supabase
    .from("pm_applications")
    .select("id, status")
    .eq("agent_id", userData.user.id);

  const { data: leases } = await supabase
    .from("pm_leases")
    .select("id, status")
    .eq("agent_id", userData.user.id);

  const { data: workOrders } = await supabase
    .from("pm_work_orders")
    .select("id, status")
    .eq("agent_id", userData.user.id);

  const stats = {
    properties: {
      total: properties?.length || 0,
      available: properties?.filter(p => p.status === 'available').length || 0,
      rented: properties?.filter(p => p.status === 'rented').length || 0,
    },
    applications: {
      total: applications?.length || 0,
      pending: applications?.filter(a => a.status === 'pending').length || 0,
      approved: applications?.filter(a => a.status === 'approved').length || 0,
    },
    leases: {
      total: leases?.length || 0,
      active: leases?.filter(l => l.status === 'active').length || 0,
    },
    workOrders: {
      total: workOrders?.length || 0,
      open: workOrders?.filter(w => ['new', 'assigned', 'in_progress'].includes(w.status)).length || 0,
    },
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.properties.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.properties.available} available • {stats.properties.rented} rented
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.applications.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.applications.pending} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leases.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.leases.total} total leases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Orders</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workOrders.open}</div>
            <p className="text-xs text-muted-foreground">
              {stats.workOrders.total} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Link href="/app/pm/properties">
            <Button>
              <Building2 className="mr-2 h-4 w-4" />
              Manage Properties
            </Button>
          </Link>
          <Link href="/app/pm/applications">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              View Applications
            </Button>
          </Link>
          <Link href="/app/pm/leases">
            <Button variant="outline">
              <FileSignature className="mr-2 h-4 w-4" />
              View Leases
            </Button>
          </Link>
          <Link href="/app/pm/work-orders">
            <Button variant="outline">
              <Wrench className="mr-2 h-4 w-4" />
              View Work Orders
            </Button>
          </Link>
          <Link href="/app/pm/payments">
            <Button variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Rent Payments
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Getting Started Guide (show if no properties) */}
      {stats.properties.total === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started with Property Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Welcome to the Property Management module! Here's how to get started:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Add your first rental property</li>
              <li>Create a rental open house event (if showing the property)</li>
              <li>Collect rental applications through open house check-ins</li>
              <li>Review and approve applications</li>
              <li>Create leases for approved applicants</li>
              <li>Automated rent invoicing will begin once leases are active</li>
            </ol>
            <Link href="/app/pm/properties">
              <Button className="mt-4">
                <Building2 className="mr-2 h-4 w-4" />
                Add Your First Property
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
