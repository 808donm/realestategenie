import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2 } from "lucide-react";
import PMDashboardClient from "./pm-dashboard.client";

export default async function PMOverviewPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  // Check if agent has any properties (user.id = agent.id)
  const { data: properties } = await supabase
    .from("pm_properties")
    .select("id")
    .eq("agent_id", userData.user.id)
    .limit(1);

  const hasProperties = properties && properties.length > 0;

  return (
    <div className="space-y-6">
      {/* Show dashboard if they have properties, otherwise show getting started */}
      {hasProperties ? (
        <PMDashboardClient />
      ) : (
        <>
          {/* Getting Started Guide (show if no properties) */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started with Property Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Welcome to the Property Management module! Here's how to get started:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Add your first rental property</li>
                <li>Create a rental open house event (if showing the property)</li>
                <li>Collect rental applications through open house check-ins</li>
                <li>Review and approve applications</li>
                <li>Create leases for approved applicants</li>
                <li>Automated rent invoicing will begin once leases are active</li>
              </ol>
              <Link href="/app/pm/properties">
                <Button className="mt-4">
                  <Building2 className="mr-2 h-4 w-4" />
                  Add Your First Property
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
