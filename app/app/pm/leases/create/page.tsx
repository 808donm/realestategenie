import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import LeaseCreateForm from "./lease-create-form";

export default async function LeaseCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ application_id?: string }>;
}) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  // Await searchParams to get the query parameters
  const resolvedSearchParams = await searchParams;

  let application = null;
  let property = null;
  let unit = null;

  // If creating from an application, load application data
  if (resolvedSearchParams.application_id) {
    const { data: appData } = await supabase
      .from("pm_applications")
      .select(`
        *,
        pm_properties (*),
        pm_units (*)
      `)
      .eq("id", resolvedSearchParams.application_id)
      .eq("agent_id", userData.user.id)
      .single();

    if (!appData) {
      notFound();
    }

    if (appData.status !== "approved") {
      // Redirect back to application if not approved
      redirect(`/app/pm/applications/${appData.id}`);
    }

    application = appData;
    // Supabase returns related data as arrays, extract first element
    property = Array.isArray(appData.pm_properties) ? appData.pm_properties[0] : appData.pm_properties;
    unit = Array.isArray(appData.pm_units) ? appData.pm_units[0] : appData.pm_units;

    console.log('[Lease Create] Application loaded:', {
      applicant_name: application.applicant_name,
      property_address: property?.address,
      unit_number: unit?.unit_number
    });
  }

  // Load all properties for dropdown if not creating from application
  const { data: properties } = await supabase
    .from("pm_properties")
    .select("*, pm_units(*)")
    .eq("agent_id", userData.user.id)
    .order("address");

  // Fetch agent data for PandaDoc embedded form
  const { data: agent } = await supabase
    .from("agents")
    .select("display_name, email")
    .eq("id", userData.user.id)
    .single();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Lease</h1>
        <p className="text-muted-foreground mt-1">
          {application
            ? `Create lease for ${application.applicant_name}`
            : "Create a new lease agreement"}
        </p>
      </div>

      <LeaseCreateForm
        application={application}
        property={property}
        unit={unit}
        properties={properties || []}
        agentId={userData.user.id}
        agentName={agent?.display_name || ""}
        agentEmail={agent?.email || ""}
      />
    </div>
  );
}
