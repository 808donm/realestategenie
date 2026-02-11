import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SignOutButton from "./signout-button";
import { Users, Home, GitBranch, BarChart3, Calculator, Building2, Contact } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const dashboardCards = [
  { title: "Total Leads", href: "/app/leads", icon: Users },
  { title: "Open Houses", href: "/app/open-houses", icon: Home },
  { title: "Pipeline", href: "/app/pipeline", icon: GitBranch },
  { title: "Reports", href: "/app/reports", icon: BarChart3 },
  { title: "Analyzers", href: "/app/analyzers", icon: Calculator },
  { title: "MLS", href: "/app/mls", icon: Building2 },
  { title: "Contacts", href: "/app/contacts", icon: Contact },
];

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
  if (!profile.license_number) missing.push("license");
  if (!profile.locations_served || profile.locations_served.length === 0) missing.push("locations");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {profile.display_name?.trim() || user.email}
          </p>
        </div>
        <SignOutButton />
      </div>

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

      {/* Dashboard Cards Grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="block">
              <Card className="h-full aspect-square cursor-pointer transition-all hover:shadow-md hover:border-primary/40">
                <CardContent className="flex flex-col items-center justify-center h-full p-4 gap-3">
                  <Icon className="w-8 h-8 text-primary" />
                  <span className="text-lg font-semibold text-center">{card.title}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
