import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NewShowingForm from "./new-showing-form.client";

export default async function NewShowingPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  // Get agent's PM properties
  const { data: properties, error } = await supabase
    .from("pm_properties")
    .select("id, address, city, state_province, bedrooms, bathrooms, monthly_rent, property_photo_url")
    .eq("agent_id", userData.user.id)
    .order("address");

  if (error) {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive">Error loading properties: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>No Properties Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to create at least one rental property before scheduling a showing.
            </p>
            <a href="/app/pm/properties/new" className="text-primary hover:underline">
              Create a rental property →
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Schedule Property Showing</h1>
        <p className="text-muted-foreground mt-2">
          Create a new rental property showing and generate a QR code for attendees
        </p>
      </div>

      <NewShowingForm properties={properties} />
    </div>
  );
}
