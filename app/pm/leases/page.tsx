import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Calendar, DollarSign } from "lucide-react";

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await supabaseServer();
  const { status: statusFilter } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Build query
  let query = supabase
    .from("pm_leases")
    .select(
      `
      id,
      lease_start_date,
      lease_end_date,
      monthly_rent,
      status,
      created_at,
      pm_properties (
        address,
        city,
        state_province
      ),
      pm_tenants (
        name,
        email,
        phone_e164
      )
    `
    )
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });

  // Apply status filter if provided
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: leases, error } = await query;

  if (error) {
    console.error("Error fetching leases:", error);
  }

  // Count leases by status
  const { data: statusCounts } = await supabase
    .from("pm_leases")
    .select("status")
    .eq("agent_id", user.id);

  const counts = {
    all: statusCounts?.length || 0,
    draft: statusCounts?.filter((l) => l.status === "draft").length || 0,
    "pending-signature":
      statusCounts?.filter((l) => l.status === "pending-signature").length || 0,
    active: statusCounts?.filter((l) => l.status === "active").length || 0,
    expiring: statusCounts?.filter((l) => l.status === "expiring").length || 0,
    expired: statusCounts?.filter((l) => l.status === "expired").length || 0,
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "pending-signature":
        return "warning";
      case "active":
        return "success";
      case "expiring":
        return "warning";
      case "expired":
        return "danger";
      default:
        return "default";
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Leases</h1>
          <p className="text-muted-foreground mt-1">
            Manage rental leases and tenant agreements
          </p>
        </div>
        <Link href="/pm/leases/new">
          <Button size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Create Lease
          </Button>
        </Link>
      </div>

      {/* Status Filter Cards */}
      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Link href="/pm/leases?status=all">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              !statusFilter || statusFilter === "all" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Leases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.all}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pm/leases?status=draft">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              statusFilter === "draft" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.draft}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pm/leases?status=pending-signature">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              statusFilter === "pending-signature" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts["pending-signature"]}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pm/leases?status=active">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              statusFilter === "active" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.active}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pm/leases?status=expiring">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              statusFilter === "expiring" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.expiring}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pm/leases?status=expired">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              statusFilter === "expired" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.expired}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Leases Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter && statusFilter !== "all"
              ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace("-", " ")} Leases`
              : "All Leases"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!leases || leases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leases found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter && statusFilter !== "all"
                  ? `No ${statusFilter} leases yet.`
                  : "Create your first lease to get started."}
              </p>
              <Link href="/pm/leases/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Lease
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Lease Period</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases.map((lease: any) => (
                    <TableRow key={lease.id}>
                      <TableCell>
                        {lease.pm_properties ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {lease.pm_properties.address}
                            </div>
                            <div className="text-muted-foreground">
                              {lease.pm_properties.city}, {lease.pm_properties.state_province}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lease.pm_tenants ? (
                          <div className="text-sm">
                            <div className="font-medium">{lease.pm_tenants.name}</div>
                            <div className="text-muted-foreground text-xs">
                              {lease.pm_tenants.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(lease.lease_start_date)}</div>
                          <div className="text-muted-foreground">
                            to {formatDate(lease.lease_end_date)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(lease.monthly_rent)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(lease.status)}>
                          {lease.status.replace("-", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/pm/leases/${lease.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
