import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSignature } from "lucide-react";

export default async function PMLeasesPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  const { data: leases, error } = await supabase
    .from("pm_leases")
    .select(`
      *,
      pm_properties(address),
      pm_units(unit_number)
    `)
    .eq("agent_id", userData.user.id)
    .order("lease_start_date", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Leases</h2>
        <p className="text-muted-foreground">Manage active and past leases</p>
      </div>

      {/* Leases List */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive">Error loading leases: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {!error && (!leases || leases.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leases yet</h3>
            <p className="text-muted-foreground">
              Create leases from approved rental applications
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {leases?.map((lease) => (
            <Card key={lease.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">
                        {lease.pm_properties?.address}
                        {lease.pm_units && ` - Unit ${lease.pm_units.unit_number}`}
                      </h3>
                      <Badge variant={
                        lease.status === 'active' ? 'success' :
                        lease.status === 'ended' ? 'secondary' :
                        'default'
                      }>
                        {lease.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      <div>
                        Lease Period: {new Date(lease.lease_start_date).toLocaleDateString()} - {new Date(lease.lease_end_date).toLocaleDateString()}
                      </div>
                      <div>
                        Monthly Rent: ${lease.monthly_rent?.toLocaleString()}
                        {lease.rent_due_day && ` • Due: ${lease.rent_due_day}${lease.rent_due_day === 1 ? 'st' : lease.rent_due_day === 2 ? 'nd' : lease.rent_due_day === 3 ? 'rd' : 'th'} of month`}
                      </div>
                    </div>
                  </div>
                  {lease.auto_invoice_enabled && (
                    <Badge variant="outline" className="ml-4">
                      Auto-Invoice Enabled
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
