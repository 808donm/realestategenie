import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Edit, MapPin, Building2, DollarSign, Home, FileText } from "lucide-react";
import { notFound } from "next/navigation";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not signed in.</div>;
  }

  const { data: property, error } = await supabase
    .from("pm_properties")
    .select("*")
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (error || !property) {
    notFound();
  }

  // Get units count for multi-unit properties
  const { data: units } = await supabase
    .from("pm_units")
    .select("*")
    .eq("pm_property_id", id);

  // Get active leases for this property
  const { data: leases } = await supabase
    .from("pm_leases")
    .select("*")
    .eq("pm_property_id", id)
    .eq("status", "active");

  // Get work orders for this property
  const { data: workOrders } = await supabase
    .from("pm_work_orders")
    .select("*")
    .eq("pm_property_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get applications for this property
  const { data: applications } = await supabase
    .from("pm_applications")
    .select("*")
    .eq("pm_property_id", id)
    .order("created_at", { ascending: false });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "available":
        return "success";
      case "rented":
        return "default";
      case "maintenance":
        return "warning";
      case "unavailable":
        return "secondary";
      default:
        return "default";
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      single_family: "Single Family Home",
      condo: "Condo",
      townhome: "Townhome",
      duplex: "Duplex",
      multi_unit: "Multi-Unit",
    };
    return types[type] || type;
  };

  const getApplicationStatusVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "screening":
        return "default";
      case "withdrawn":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/pm/properties">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{property.address}</h2>
            <p className="text-muted-foreground">
              {property.city}, {property.state_province} {property.zip_postal_code}
            </p>
          </div>
        </div>
        <Link href={`/app/pm/properties/${id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Property
          </Button>
        </Link>
      </div>

      {/* Property Photo */}
      {property.property_photo_url && (
        <Card>
          <CardContent className="p-0">
            <img
              src={property.property_photo_url}
              alt={property.address}
              className="w-full h-64 object-cover rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusVariant(property.status)}>
              {property.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Property Type</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {getPropertyTypeLabel(property.property_type)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{property.units_count}</div>
            <p className="text-xs text-muted-foreground">
              {leases?.length || 0} active lease{leases?.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {property.monthly_rent ? `$${property.monthly_rent.toLocaleString()}` : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Rent</span>
              <span className="font-semibold">
                {property.monthly_rent ? `$${property.monthly_rent.toLocaleString()}` : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Security Deposit</span>
              <span className="font-semibold">
                {property.security_deposit ? `$${property.security_deposit.toLocaleString()}` : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pet Deposit</span>
              <span className="font-semibold">
                {property.pet_deposit ? `$${property.pet_deposit.toLocaleString()}` : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Pet Policy</div>
              <div className="text-sm">
                {property.pet_policy || "No policy specified"}
              </div>
            </div>
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Amenities</div>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Applications for this Property */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Applications</CardTitle>
            <Badge variant="outline">{applications?.length || 0} Total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {applications && applications.length > 0 ? (
            <div className="space-y-3">
              {applications.map((application) => (
                <Link
                  key={application.id}
                  href={`/app/pm/applications/${application.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/50 rounded-lg p-3 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{application.applicant_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {application.applicant_email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Applied: {new Date(application.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant={getApplicationStatusVariant(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No applications yet for this property</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Work Orders */}
      {workOrders && workOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="font-medium">{order.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={order.status === "completed" ? "success" : "default"}>
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
            <Link href="/app/pm/work-orders">
              <Button variant="outline" className="w-full mt-4">
                View All Work Orders
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Units (if multi-unit) */}
      {property.units_count > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Units</CardTitle>
          </CardHeader>
          <CardContent>
            {units && units.length > 0 ? (
              <div className="space-y-2">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{unit.unit_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {unit.bedrooms} bed • {unit.bathrooms} bath
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${unit.monthly_rent.toLocaleString()}/mo</div>
                      <Badge variant={unit.status === "available" ? "success" : "default"}>
                        {unit.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No units added yet
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
