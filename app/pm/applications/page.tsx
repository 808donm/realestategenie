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
import { FileText, Calendar, Phone, Mail } from "lucide-react";

export default async function ApplicationsPage({
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
    .from("pm_applications")
    .select(
      `
      id,
      applicant_name,
      applicant_email,
      applicant_phone,
      status,
      move_in_date,
      annual_income,
      number_of_occupants,
      created_at,
      pm_property_id,
      pm_properties (
        address,
        city,
        state_province
      )
    `
    )
    .eq("agent_id", user.id)
    .order("created_at", { ascending: false });

  // Apply status filter if provided
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: applications, error } = await query;

  if (error) {
    console.error("Error fetching applications:", error);
  }

  // Count applications by status
  const { data: statusCounts } = await supabase
    .from("pm_applications")
    .select("status")
    .eq("agent_id", user.id);

  const counts = {
    all: statusCounts?.length || 0,
    pending: statusCounts?.filter((a) => a.status === "pending").length || 0,
    approved: statusCounts?.filter((a) => a.status === "approved").length || 0,
    rejected: statusCounts?.filter((a) => a.status === "rejected").length || 0,
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      default:
        return "secondary";
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
          <h1 className="text-3xl font-bold">Rental Applications</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage rental applications from open house events
          </p>
        </div>
      </div>

      {/* Status Filter Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Link href="/pm/applications?status=all">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              !statusFilter || statusFilter === "all" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.all}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pm/applications?status=pending">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              statusFilter === "pending" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.pending}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pm/applications?status=approved">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              statusFilter === "approved" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.approved}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pm/applications?status=rejected">
          <Card
            className={`cursor-pointer hover:bg-accent transition-colors ${
              statusFilter === "rejected" ? "border-primary" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.rejected}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter && statusFilter !== "all"
              ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Applications`
              : "All Applications"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!applications || applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No applications found</h3>
              <p className="text-muted-foreground">
                {statusFilter && statusFilter !== "all"
                  ? `No ${statusFilter} applications yet.`
                  : "Applications submitted through open house events will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Move-In Date</TableHead>
                    <TableHead>Annual Income</TableHead>
                    <TableHead>Occupants</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app: any) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        {app.applicant_name}
                      </TableCell>
                      <TableCell>
                        {app.pm_properties ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {app.pm_properties.address}
                            </div>
                            <div className="text-muted-foreground">
                              {app.pm_properties.city}, {app.pm_properties.state_province}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" />
                            <span className="text-muted-foreground truncate max-w-[150px]">
                              {app.applicant_email}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="h-3 w-3" />
                            <span className="text-muted-foreground">
                              {app.applicant_phone}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {app.move_in_date ? formatDate(app.move_in_date) : "N/A"}
                      </TableCell>
                      <TableCell>{formatCurrency(app.annual_income)}</TableCell>
                      <TableCell className="text-center">
                        {app.number_of_occupants || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(app.status)}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(app.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/pm/applications/${app.id}`}>
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
