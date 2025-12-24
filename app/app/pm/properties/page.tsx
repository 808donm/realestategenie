import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

export default async function PMPropertiesPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  const { data: properties, error } = await supabase
    .from("pm_properties")
    .select("*")
    .eq("agent_id", userData.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rental Properties</h2>
          <p className="text-muted-foreground">Manage your rental property portfolio</p>
        </div>
        <Button size="lg" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Property (Coming Soon)
        </Button>
      </div>

      {/* Properties List */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive">Error loading properties: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {!error && (!properties || properties.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first rental property to start managing leases and applications
            </p>
            <Button size="lg" disabled>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Property (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties?.map((property) => (
            <Card key={property.id}>
              <CardHeader>
                <CardTitle className="text-lg">{property.address}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {property.city}, {property.state_province}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={property.status === 'available' ? 'success' : 'default'}>
                    {property.status}
                  </Badge>
                </div>
                {property.monthly_rent && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Rent</span>
                    <span className="font-semibold">${property.monthly_rent.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Units</span>
                  <span className="font-semibold">{property.units_count}</span>
                </div>
                <Button variant="outline" className="w-full mt-2" disabled>
                  View Details (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
