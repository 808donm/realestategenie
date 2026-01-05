import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import LeaseCreationForm from "./lease-creation-form.client";

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string; propertyId?: string }>;
}) {
  const supabase = await supabaseServer();
  const { applicationId, propertyId } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let applicationData = null;
  let propertyData = null;

  // If creating from application, fetch application details
  if (applicationId) {
    const { data: application } = await supabase
      .from("pm_applications")
      .select(
        `
        id,
        applicant_name,
        applicant_email,
        applicant_phone,
        move_in_date,
        pm_property_id,
        pm_properties (
          id,
          address,
          city,
          state_province,
          postal_code,
          monthly_rent,
          security_deposit
        )
      `
      )
      .eq("id", applicationId)
      .eq("agent_id", user.id)
      .single();

    if (application && application.pm_properties) {
      applicationData = application;
      propertyData = application.pm_properties as any;
    }
  }
  // Otherwise, if propertyId is provided, fetch property details
  else if (propertyId) {
    const { data: property } = await supabase
      .from("pm_properties")
      .select("id, address, city, state_province, postal_code, monthly_rent, security_deposit")
      .eq("id", propertyId)
      .eq("agent_id", user.id)
      .single();

    if (property) {
      propertyData = property;
    }
  }

  // If no property data, we need to let them select a property
  if (!propertyData) {
    // Fetch all properties for selection
    const { data: properties } = await supabase
      .from("pm_properties")
      .select("id, address, city, state_province, monthly_rent")
      .eq("agent_id", user.id)
      .order("address");

    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Link href="/pm/leases">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leases
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-6">Create New Lease</h1>

        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-6">
          <p className="text-amber-800 dark:text-amber-200">
            Please select a property first or create a lease from an approved application.
          </p>
        </div>

        {properties && properties.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Select a Property</h2>
            {properties.map((property: any) => (
              <Link
                key={property.id}
                href={`/pm/leases/new?propertyId=${property.id}`}
                className="block"
              >
                <div className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer">
                  <div className="font-medium">{property.address}</div>
                  <div className="text-sm text-muted-foreground">
                    {property.city}, {property.state_province} • $
                    {property.monthly_rent?.toLocaleString() || "N/A"}/mo
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No properties found. Create a property first.
            </p>
            <Link href="/pm/properties/new">
              <Button>Create Property</Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Link href={applicationId ? `/pm/applications/${applicationId}` : "/pm/leases"}>
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {applicationId ? "Back to Application" : "Back to Leases"}
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-6">Create New Lease</h1>

      <LeaseCreationForm
        applicationId={applicationId || null}
        propertyId={propertyData.id}
        propertyAddress={propertyData.address}
        propertyCity={propertyData.city}
        propertyState={propertyData.state_province}
        defaultMonthlyRent={propertyData.monthly_rent}
        defaultSecurityDeposit={propertyData.security_deposit}
        applicantName={applicationData?.applicant_name || ""}
        applicantEmail={applicationData?.applicant_email || ""}
        applicantPhone={applicationData?.applicant_phone || ""}
        defaultMoveInDate={applicationData?.move_in_date || ""}
      />
    </div>
  );
}
