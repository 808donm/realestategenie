import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import RatingForm from "./rating-form";
import TenantNav from "../../components/tenant-nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/tenant/login");
  }

  // Get work order details
  const { data: workOrder, error } = await supabase
    .from("pm_work_orders")
    .select(`
      *,
      pm_leases (
        id,
        pm_properties (address),
        pm_units (unit_number)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !workOrder) {
    redirect("/tenant/work-orders");
  }

  // Verify tenant owns this work order
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("lease_id")
    .eq("id", userData.user.id)
    .single();

  if (!tenantUser || tenantUser.lease_id !== workOrder.pm_lease_id) {
    redirect("/tenant/work-orders");
  }

  const statusColors = {
    new: "bg-blue-100 text-blue-800",
    assigned: "bg-purple-100 text-purple-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const priorityColors = {
    normal: "bg-gray-100 text-gray-800",
    urgent: "bg-orange-100 text-orange-800",
    emergency: "bg-red-100 text-red-800",
  };

  const property = workOrder.pm_leases?.pm_properties;
  const unit = workOrder.pm_leases?.pm_units;
  const fullAddress = unit?.unit_number
    ? `${property?.address}, Unit ${unit.unit_number}`
    : property?.address;

  const canRate = workOrder.status === "completed" && !workOrder.tenant_rating;

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantNav />

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/tenant/work-orders">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{workOrder.title}</h1>
              <p className="text-muted-foreground text-sm">{fullAddress}</p>
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
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Request Details */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
              <div className="text-sm whitespace-pre-wrap">{workOrder.description}</div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Category</div>
                <div className="text-sm capitalize">{workOrder.category}</div>
              </div>
              {workOrder.location && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Location</div>
                  <div className="text-sm">{workOrder.location}</div>
                </div>
              )}
            </div>

            {workOrder.tenant_availability && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Your Availability</div>
                <div className="text-sm">{workOrder.tenant_availability}</div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Submitted</div>
                <div className="text-sm">{new Date(workOrder.created_at).toLocaleString()}</div>
              </div>
              {workOrder.completed_at && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Completed</div>
                  <div className="text-sm">{new Date(workOrder.completed_at).toLocaleString()}</div>
                </div>
              )}
            </div>
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
                  <a
                    key={index}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Photos */}
        {workOrder.completion_photos && workOrder.completion_photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completion Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {workOrder.completion_photos.map((photo: string, index: number) => (
                  <a
                    key={index}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={photo}
                      alt={`Completion photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Status Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />
                <div>
                  <div className="font-medium">Request Submitted</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(workOrder.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {workOrder.status === "assigned" && (
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-purple-600 mt-2" />
                  <div>
                    <div className="font-medium">Assigned to Technician</div>
                    <div className="text-sm text-muted-foreground">
                      Your request has been assigned
                    </div>
                  </div>
                </div>
              )}

              {workOrder.status === "in_progress" && (
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-600 mt-2" />
                  <div>
                    <div className="font-medium">Work In Progress</div>
                    <div className="text-sm text-muted-foreground">
                      Technician is working on your request
                    </div>
                  </div>
                </div>
              )}

              {workOrder.completed_at && (
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-600 mt-2" />
                  <div>
                    <div className="font-medium">Completed</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(workOrder.completed_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes from Property Manager */}
        {workOrder.notes && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Notes from Property Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-blue-900">{workOrder.notes}</p>
              {workOrder.updated_at !== workOrder.created_at && (
                <div className="text-xs text-blue-700 mt-3 pt-3 border-t border-blue-200">
                  Last updated: {new Date(workOrder.updated_at).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rating Form */}
        {canRate && (
          <Card>
            <CardHeader>
              <CardTitle>Rate This Service</CardTitle>
            </CardHeader>
            <CardContent>
              <RatingForm workOrderId={workOrder.id} />
            </CardContent>
          </Card>
        )}

        {/* Existing Rating */}
        {workOrder.tenant_rating && (
          <Card>
            <CardHeader>
              <CardTitle>Your Rating</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{workOrder.tenant_rating}</div>
                <div className="text-yellow-500">
                  {"★".repeat(workOrder.tenant_rating)}
                  {"☆".repeat(5 - workOrder.tenant_rating)}
                </div>
              </div>
              {workOrder.tenant_feedback && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Your Feedback</div>
                  <div className="text-sm">{workOrder.tenant_feedback}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
