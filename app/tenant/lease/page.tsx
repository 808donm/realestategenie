import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Home,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Clock,
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function TenantLeasePage() {
  const supabase = await createClient();

  // Get current tenant user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/tenant/login");
  }

  // Fetch tenant user data and lease information
  const { data: tenantUser, error: tenantError } = await supabase
    .from("tenant_users")
    .select("*, lease:pm_leases(*)")
    .eq("id", user.id)
    .single();

  if (tenantError || !tenantUser || !tenantUser.lease) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load lease information. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const lease = tenantUser.lease as any;

  // Fetch property and unit information
  const { data: property } = await supabase
    .from("pm_properties")
    .select("*")
    .eq("id", lease.pm_property_id)
    .single();

  const { data: unit } = lease.pm_unit_id
    ? await supabase.from("pm_units").select("*").eq("id", lease.pm_unit_id).single()
    : { data: null };

  // Calculate days remaining
  const today = new Date();
  const endDate = new Date(lease.lease_end_date);
  const daysRemaining = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Lease Information</h1>
        <p className="text-muted-foreground">
          View your lease terms and property details
        </p>
      </div>

      {/* Days Remaining Alert */}
      {daysRemaining <= 60 && daysRemaining > 0 && (
        <Alert className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Your lease expires in {daysRemaining} days on {formatDate(lease.lease_end_date)}.
            {lease.notice_period_days && (
              <> Please provide {lease.notice_period_days} days notice if you plan to move out.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Address
              </label>
              <p className="text-lg">
                {property?.address}
                {property?.city && `, ${property.city}`}
                {property?.state_province && `, ${property.state_province}`}
                {property?.zip_postal_code && ` ${property.zip_postal_code}`}
              </p>
            </div>
            {unit && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Unit
                </label>
                <p className="text-lg">
                  Unit {unit.unit_number}
                  {unit.bedrooms && unit.bathrooms && (
                    <span className="text-muted-foreground ml-2">
                      • {unit.bedrooms} bed, {unit.bathrooms} bath
                    </span>
                  )}
                  {unit.sqft && (
                    <span className="text-muted-foreground ml-2">
                      • {unit.sqft.toLocaleString()} sq ft
                    </span>
                  )}
                </p>
              </div>
            )}
            {property?.property_type && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Property Type
                </label>
                <p className="text-lg capitalize">
                  {property.property_type.replace(/_/g, " ")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lease Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lease Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Lease Start Date
                </label>
                <p className="text-lg">{formatDate(lease.lease_start_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Lease End Date
                </label>
                <p className="text-lg">{formatDate(lease.lease_end_date)}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Days Remaining
              </label>
              <div className="flex items-center gap-2">
                <p className="text-lg">{daysRemaining > 0 ? daysRemaining : 0} days</p>
                {daysRemaining > 0 && (
                  <Badge variant={daysRemaining <= 30 ? "destructive" : "secondary"}>
                    {daysRemaining <= 30 ? "Expiring Soon" : "Active"}
                  </Badge>
                )}
                {daysRemaining <= 0 && <Badge variant="outline">Expired</Badge>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Lease Status
              </label>
              <p className="text-lg capitalize">
                {lease.status.replace(/_/g, " ")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Monthly Rent
                </label>
                <p className="text-2xl font-bold">
                  {formatCurrency(parseFloat(lease.monthly_rent))}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Rent Due Day
                </label>
                <p className="text-lg">
                  {lease.rent_due_day}
                  {lease.rent_due_day === 1
                    ? "st"
                    : lease.rent_due_day === 2
                    ? "nd"
                    : lease.rent_due_day === 3
                    ? "rd"
                    : "th"}{" "}
                  of each month
                </p>
              </div>
            </div>
            {lease.security_deposit && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Security Deposit
                </label>
                <p className="text-lg">
                  {formatCurrency(parseFloat(lease.security_deposit))}
                </p>
              </div>
            )}
            {lease.pet_deposit && parseFloat(lease.pet_deposit) > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Pet Deposit
                </label>
                <p className="text-lg">
                  {formatCurrency(parseFloat(lease.pet_deposit))}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Move-Out Information */}
        {(lease.notice_period_days || lease.move_out_requirements) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Move-Out Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lease.notice_period_days && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Notice Period
                  </label>
                  <p className="text-lg">
                    {lease.notice_period_days} days written notice required before
                    move-out
                  </p>
                </div>
              )}
              {lease.move_out_requirements && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Move-Out Requirements
                  </label>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    {Array.isArray(lease.move_out_requirements) ? (
                      <ul className="list-disc list-inside space-y-1">
                        {lease.move_out_requirements.map(
                          (req: string, idx: number) => (
                            <li key={idx}>{req}</li>
                          )
                        )}
                      </ul>
                    ) : typeof lease.move_out_requirements === "object" ? (
                      Object.entries(lease.move_out_requirements).map(
                        ([key, value]: [string, any]) => (
                          <div key={key}>
                            <strong className="capitalize">
                              {key.replace(/_/g, " ")}:
                            </strong>{" "}
                            {String(value)}
                          </div>
                        )
                      )
                    ) : (
                      <p>{String(lease.move_out_requirements)}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lease Document */}
        {lease.lease_document_url && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lease Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Download a copy of your signed lease agreement
              </p>
              <Button asChild>
                <a
                  href={lease.lease_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Lease Agreement
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
