import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, User } from "lucide-react";
import WorkOrderUpdateForm from "./update-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PMWorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Get work order details
  const { data: workOrder, error } = await supabase
    .from("pm_work_orders")
    .select(`
      *,
      pm_properties(id, address, city, state_province),
      pm_units(id, unit_number),
      pm_leases(id, tenant_name, tenant_email, tenant_phone)
    `)
    .eq("id", id)
    .eq("agent_id", userData.user.id)
    .single();

  if (error || !workOrder) {
    redirect("/app/pm/work-orders");
  }

  const statusColors = {
    new: "bg-blue-100 text-blue-800",
    assigned: "bg-purple-100 text-purple-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    waiting: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    emergency: "bg-red-100 text-red-800",
  };

  const lease = Array.isArray(workOrder.pm_leases)
    ? workOrder.pm_leases[0]
    : workOrder.pm_leases;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/pm/work-orders">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{workOrder.title}</h2>
          <p className="text-muted-foreground">Work Order Details</p>
        </div>
        <div className="flex gap-2">
          <Badge className={statusColors[workOrder.status as keyof typeof statusColors]}>
            {workOrder.status.replace("_", " ").toUpperCase()}
          </Badge>
          <Badge className={priorityColors[workOrder.priority as keyof typeof priorityColors]}>
            {workOrder.priority.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{workOrder.description}</p>
            </CardContent>
          </Card>

          {/* Photos */}
          {workOrder.photos && workOrder.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {workOrder.photos.map((photo: string, index: number) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Update Form */}
          <WorkOrderUpdateForm workOrder={workOrder} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <div>{workOrder.pm_properties?.address}</div>
                  {workOrder.pm_units && (
                    <div className="text-muted-foreground">
                      Unit {workOrder.pm_units.unit_number}
                    </div>
                  )}
                  {workOrder.location && (
                    <div className="text-muted-foreground mt-1">
                      Location: {workOrder.location}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Info */}
          {lease && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tenant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{lease.tenant_name}</span>
                </div>
                {lease.tenant_email && (
                  <div className="text-muted-foreground">{lease.tenant_email}</div>
                )}
                {lease.tenant_phone && (
                  <div className="text-muted-foreground">{lease.tenant_phone}</div>
                )}
                {workOrder.tenant_availability && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Availability
                    </div>
                    <div>{workOrder.tenant_availability}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <div className="text-muted-foreground">Category</div>
                <div className="font-medium capitalize">{workOrder.category}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Priority</div>
                <div className="font-medium capitalize">{workOrder.priority}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Created</div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(workOrder.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {workOrder.completed_at && (
                <div>
                  <div className="text-muted-foreground">Completed</div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(workOrder.completed_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
