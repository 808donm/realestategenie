import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import LeaseCreateForm from "./lease-create-form";

export default async function LeaseCreatePage({
  searchParams,
}: {
  searchParams: { application_id?: string };
}) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  let application = null;
  let property = null;
  let unit = null;

  // If creating from an application, load application data
  if (searchParams.application_id) {
    const { data: appData } = await supabase
      .from("pm_applications")
      .select(`
        *,
        pm_properties (*),
        pm_units (*)
      `)
      .eq("id", searchParams.application_id)
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
    property = appData.pm_properties;
    unit = appData.pm_units;
  }

  // Load all properties for dropdown if not creating from application
  const { data: properties } = await supabase
    .from("pm_properties")
    .select("*, pm_units(*)")
    .eq("agent_id", userData.user.id)
    .order("address");

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
      />
    </div>
  );
}
