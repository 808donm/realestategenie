import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SignOutButton from "./signout-button";
import StatsTiles from "./stats-tiles";
import HeatScoreChart from "./heat-score-chart";
import IntegrationHealth from "./integration-health";
import ActivityFeed from "./activity-feed";

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  const user = userData.user;
  if (!user) {
    return <div style={{ padding: 24 }}>Not signed in.</div>;
  }

  // Agent profile (RLS scoped)
  const { data: agent } = await supabase
    .from("agents")
    .select("display_name, phone_e164, license_number, locations_served")
    .eq("id", user.id)
    .single();

  const profile = agent ?? {
    display_name: "",
    phone_e164: null,
    license_number: null,
    locations_served: [],
  };

  const missing: string[] = [];
  if (!profile.display_name?.trim()) missing.push("name");
  if (!profile.phone_e164) missing.push("phone");
  // license + locations are optional MVP, but still nice to nudge
  if (!profile.license_number) missing.push("license");
  if (!profile.locations_served || profile.locations_served.length === 0) missing.push("locations");

  // Recent open houses
  const { data: openHouses } = await supabase
    .from("open_house_events")
    .select("id,address,start_at,status")
    .order("start_at", { ascending: false })
    .limit(5);

  // Recent leads
  const { data: leads } = await supabase
    .from("lead_submissions")
    .select("id,event_id,created_at,payload")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <code className="text-sm">{user.email}</code>
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/app/open-houses/new">
          <Button>+ New Open House</Button>
        </Link>
        <Link href="/app/open-houses">
          <Button variant="outline">View Open Houses</Button>
        </Link>
        <Link href="/app/leads">
          <Button variant="outline">View Leads</Button>
        </Link>
        <Link href="/app/integrations">
          <Button variant="outline">Integrations</Button>
        </Link>
      </div>

      {/* Property Management Module */}
      <Card className="border-primary bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Property Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage rental properties, leases, applications, and maintenance
              </p>
            </div>
            <Link href="/app/pm">
              <Button size="lg">
                Go to PM
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Profile Status Alert */}
      {missing.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Complete Your Profile</CardTitle>
              <Link href="/app/settings/profile">
                <Button variant="outline" size="sm">
                  Update Profile
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              You're missing: <strong>{missing.join(", ")}</strong>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Your attendee pages look more professional when your profile is complete.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Tiles */}
      <StatsTiles />

      {/* Main Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Heat Score Chart */}
        <HeatScoreChart />

        {/* Integration Health */}
        <IntegrationHealth />
      </div>

      {/* Activity Feed */}
      <ActivityFeed />

      {/* Recent Open Houses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Open Houses</CardTitle>
            <Link href="/app/open-houses">
              <Button variant="outline" size="sm">
                See All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {(!openHouses || openHouses.length === 0) ? (
            <p className="text-center py-8 text-muted-foreground">
              No open houses yet. Create one to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {openHouses.map((e) => (
                <Link
                  key={e.id}
                  href={`/app/open-houses/${e.id}`}
                  className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="font-semibold">{e.address}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {new Date(e.start_at).toLocaleString()} • <strong>{e.status}</strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
