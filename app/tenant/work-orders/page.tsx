import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import TenantNav from "../components/tenant-nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkOrdersPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/tenant/login");
  }

  // Get tenant's lease
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("lease_id")
    .eq("id", userData.user.id)
    .single();

  if (!tenantUser) {
    redirect("/tenant/dashboard");
  }

  // Get all work orders for this lease
  const { data: workOrders } = await supabase
    .from("pm_work_orders")
    .select("*")
    .eq("pm_lease_id", tenantUser.lease_id)
    .order("created_at", { ascending: false });

  const statusColors = {
    new: "bg-blue-100 text-blue-800",
    assigned: "bg-purple-100 text-purple-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    emergency: "bg-red-100 text-red-800",
  };

  const activeCount = workOrders?.filter((wo) =>
    ["new", "assigned", "in_progress"].includes(wo.status)
  ).length || 0;

  const completedCount = workOrders?.filter((wo) => wo.status === "completed").length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantNav />

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Maintenance Requests</h1>
              <p className="text-muted-foreground text-sm">
                Track your repair requests
              </p>
            </div>
            <Link href="/tenant/work-orders/new">
              <Button>+ New Request</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In progress or pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Work Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>All Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {!workOrders || workOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No maintenance requests yet</p>
                <Link href="/tenant/work-orders/new">
                  <Button>Submit Your First Request</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {workOrders.map((wo) => (
                  <Link
                    key={wo.id}
                    href={`/tenant/work-orders/${wo.id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold">{wo.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {wo.location && `${wo.location} • `}
                          Category: {wo.category}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge className={statusColors[wo.status as keyof typeof statusColors]}>
                          {wo.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge className={priorityColors[wo.priority as keyof typeof priorityColors]}>
                          {wo.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Submitted {new Date(wo.created_at).toLocaleDateString()}
                      {wo.completed_at &&
                        ` • Completed ${new Date(wo.completed_at).toLocaleDateString()}`}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
