import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DollarSign, Wrench, FileText, MessageSquare, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TenantDashboardPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/tenant/login");
  }

  // Verify this is a tenant account
  const userMetadata = userData.user.user_metadata;
  if (userMetadata?.role !== "tenant") {
    redirect("/tenant/login");
  }

  // Get tenant user record
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select(`
      *,
      pm_leases (
        id,
        monthly_rent,
        rent_due_day,
        lease_start_date,
        lease_end_date,
        status,
        pm_properties (address),
        pm_units (unit_number)
      )
    `)
    .eq("id", userData.user.id)
    .single();

  if (!tenantUser || !tenantUser.pm_leases) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Active Lease</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your lease information is not available. Please contact your property manager.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lease = tenantUser.pm_leases;
  const property = lease.pm_properties;
  const unit = lease.pm_units;

  const fullAddress = unit?.unit_number
    ? `${property?.address}, Unit ${unit.unit_number}`
    : property?.address || "Your Property";

  // Calculate next rent due date
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  let nextDueDate = new Date(currentYear, currentMonth, lease.rent_due_day);

  // If due date has passed this month, use next month
  if (nextDueDate < today) {
    nextDueDate = new Date(currentYear, currentMonth + 1, lease.rent_due_day);
  }

  const daysUntilDue = Math.ceil(
    (nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get current month's payment status
  const { data: currentPayment } = await supabase
    .from("pm_rent_payments")
    .select("*")
    .eq("lease_id", lease.id)
    .eq("month", nextDueDate.getMonth() + 1)
    .eq("year", nextDueDate.getFullYear())
    .single();

  // Get active work orders
  const { data: workOrders } = await supabase
    .from("pm_work_orders")
    .select("id, title, status, priority, created_at")
    .eq("pm_lease_id", lease.id)
    .in("status", ["new", "assigned", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(5);

  // Get unread messages count
  const { count: unreadCount } = await supabase
    .from("pm_messages")
    .select("*", { count: "exact", head: true })
    .eq("to_user_id", userData.user.id)
    .is("read_at", null);

  // Calculate lease expiration
  const leaseEndDate = new Date(lease.lease_end_date);
  const daysUntilExpiration = Math.ceil(
    (leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">{fullAddress}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Rent Due Card */}
        <Card className={currentPayment?.status === "paid" ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Rent Payment
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {nextDueDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              {currentPayment?.status === "paid" ? (
                <Badge className="bg-green-600">Paid</Badge>
              ) : (
                <Badge className="bg-orange-600">
                  Due in {daysUntilDue} {daysUntilDue === 1 ? "day" : "days"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  ${lease.monthly_rent.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Due {nextDueDate.toLocaleDateString()}
                </p>
                {currentPayment?.late_fee_amount && currentPayment.late_fee_amount > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    + ${currentPayment.late_fee_amount.toFixed(2)} late fee
                  </p>
                )}
              </div>
              {currentPayment?.status !== "paid" && (
                <Link href="/tenant/invoices">
                  <Button size="lg">Pay Now</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/tenant/work-orders/new">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Wrench className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="font-semibold">Submit Request</div>
                    <div className="text-xs text-muted-foreground">
                      Maintenance & Repairs
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tenant/messages">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-semibold">
                      Messages {unreadCount && unreadCount > 0 ? `(${unreadCount})` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Contact Manager
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tenant/lease">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="font-semibold">My Lease</div>
                    <div className="text-xs text-muted-foreground">
                      View Documents
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tenant/invoices">
            <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-orange-600" />
                  <div>
                    <div className="font-semibold">Payment History</div>
                    <div className="text-xs text-muted-foreground">
                      View Statements
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Lease Expiration Notice */}
        {daysUntilExpiration > 0 && daysUntilExpiration <= 60 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-semibold">
                    Your lease expires in {daysUntilExpiration} days
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Lease end date: {leaseEndDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Work Orders */}
        {workOrders && workOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Active Maintenance Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workOrders.map((wo) => {
                  const statusColors = {
                    new: "bg-blue-100 text-blue-800",
                    assigned: "bg-purple-100 text-purple-800",
                    in_progress: "bg-yellow-100 text-yellow-800",
                  };

                  return (
                    <Link
                      key={wo.id}
                      href={`/tenant/work-orders/${wo.id}`}
                      className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{wo.title}</div>
                          <div className="text-sm text-muted-foreground">
                            Submitted {new Date(wo.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge className={statusColors[wo.status as keyof typeof statusColors]}>
                          {wo.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <Link href="/tenant/work-orders">
                <Button variant="outline" className="w-full mt-4">
                  View All Requests
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {currentPayment?.paid_at && (
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-600 mt-1.5" />
                  <div>
                    <div className="font-medium">
                      Rent payment received
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(currentPayment.paid_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
              {workOrders?.slice(0, 2).map((wo) => (
                <div key={wo.id} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-600 mt-1.5" />
                  <div>
                    <div className="font-medium">
                      Work order: {wo.title}
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(wo.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
