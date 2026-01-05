import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

export default async function PMWorkOrdersPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  const { data: workOrders, error } = await supabase
    .from("pm_work_orders")
    .select(`
      *,
      pm_properties(address),
      pm_units(unit_number)
    `)
    .eq("agent_id", userData.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Work Orders</h2>
        <p className="text-muted-foreground">Track maintenance requests and repairs</p>
      </div>

      {/* Work Orders List */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive">Error loading work orders: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {!error && (!workOrders || workOrders.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No work orders yet</h3>
            <p className="text-muted-foreground">
              Maintenance requests will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workOrders?.map((workOrder) => (
            <Card key={workOrder.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{workOrder.title}</h3>
                      <Badge variant={
                        workOrder.status === 'completed' ? 'success' :
                        workOrder.priority === 'emergency' ? 'danger' :
                        workOrder.priority === 'high' ? 'warning' :
                        'default'
                      }>
                        {workOrder.status}
                      </Badge>
                      <Badge variant="outline">
                        {workOrder.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Property: {workOrder.pm_properties?.address}
                        {workOrder.pm_units && ` - Unit ${workOrder.pm_units.unit_number}`}
                      </div>
                      <div>Category: {workOrder.category}</div>
                      {workOrder.description && (
                        <div className="mt-2">{workOrder.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground ml-4">
                    {new Date(workOrder.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
