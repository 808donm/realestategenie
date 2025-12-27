import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, Plus, MapPin } from "lucide-react";

export default async function PMShowingsPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  // Get all showings with property info
  const { data: showings, error } = await supabase
    .from("pm_showings")
    .select(`
      id,
      start_at,
      end_at,
      status,
      notes,
      pm_properties (
        address,
        city,
        state_province,
        bedrooms,
        bathrooms,
        monthly_rent
      )
    `)
    .eq("agent_id", userData.user.id)
    .order("start_at", { ascending: false });

  const upcomingShowings = showings?.filter(s => new Date(s.end_at) > new Date()) || [];
  const pastShowings = showings?.filter(s => new Date(s.end_at) <= new Date()) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Property Showings</h2>
          <p className="text-muted-foreground">Manage rental property showings and collect applications</p>
        </div>
        <Link href="/app/pm/showings/new">
          <Button size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Schedule Showing
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive">Error loading showings: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Showings */}
      {upcomingShowings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Upcoming Showings</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingShowings.map((showing: any) => (
              <Card key={showing.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {showing.pm_properties?.address}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {showing.pm_properties?.city}, {showing.pm_properties?.state_province}
                      </p>
                    </div>
                    <Badge variant={showing.status === "published" ? "default" : "secondary"}>
                      {showing.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      {new Date(showing.start_at).toLocaleString()} - {new Date(showing.end_at).toLocaleTimeString()}
                    </div>
                    {showing.pm_properties && (
                      <div className="text-sm text-muted-foreground">
                        {showing.pm_properties.bedrooms} bed • {showing.pm_properties.bathrooms} bath • ${showing.pm_properties.monthly_rent}/mo
                      </div>
                    )}
                    <div className="pt-3">
                      <Link href={`/app/pm/showings/${showing.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details & QR Code
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Showings */}
      {pastShowings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Past Showings</h3>
          <div className="grid gap-3">
            {pastShowings.slice(0, 5).map((showing: any) => (
              <Card key={showing.id} className="opacity-75">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{showing.pm_properties?.address}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(showing.start_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Link href={`/app/pm/showings/${showing.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showings || showings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No showings yet</h3>
            <p className="text-muted-foreground mb-4">
              Schedule your first rental property showing to start collecting applications
            </p>
            <Link href="/app/pm/showings/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule First Showing
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
