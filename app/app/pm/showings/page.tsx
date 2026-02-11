import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, Plus, MapPin, Home } from "lucide-react";

type UnifiedShowing = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  source: "pm_showing" | "open_house";
  property: {
    address: string;
    city: string | null;
    state_province: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    monthly_rent: number | null;
  } | null;
};

export default async function PMShowingsPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  // Get all pm_showings with property info
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

  // Also get rental open house events (event_type = 'rental')
  const { data: rentalOpenHouses, error: ohError } = await supabase
    .from("open_house_events")
    .select(`
      id,
      address,
      start_at,
      end_at,
      status,
      pm_property_id,
      pm_properties:pm_property_id (
        address,
        city,
        state_province,
        bedrooms,
        bathrooms,
        monthly_rent
      )
    `)
    .eq("agent_id", userData.user.id)
    .eq("event_type", "rental")
    .order("start_at", { ascending: false });

  // Merge both sources into a unified list
  const unified: UnifiedShowing[] = [];

  for (const s of showings || []) {
    const prop = s.pm_properties as any;
    unified.push({
      id: s.id,
      start_at: s.start_at,
      end_at: s.end_at,
      status: s.status,
      notes: s.notes,
      source: "pm_showing",
      property: prop
        ? {
            address: prop.address,
            city: prop.city,
            state_province: prop.state_province,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms,
            monthly_rent: prop.monthly_rent,
          }
        : null,
    });
  }

  for (const oh of rentalOpenHouses || []) {
    const prop = oh.pm_properties as any;
    unified.push({
      id: oh.id,
      start_at: oh.start_at,
      end_at: oh.end_at,
      status: oh.status,
      notes: null,
      source: "open_house",
      property: prop
        ? {
            address: prop.address,
            city: prop.city,
            state_province: prop.state_province,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms,
            monthly_rent: prop.monthly_rent,
          }
        : { address: oh.address, city: null, state_province: null, bedrooms: null, bathrooms: null, monthly_rent: null },
    });
  }

  // Sort by start_at descending
  unified.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());

  const combinedError = error || ohError;

  const upcomingShowings = unified.filter(s => new Date(s.end_at) > new Date());
  const pastShowings = unified.filter(s => new Date(s.end_at) <= new Date());

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

      {combinedError && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive">Error loading showings: {combinedError.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Showings */}
      {upcomingShowings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Upcoming Showings</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingShowings.map((showing) => {
              const detailHref =
                showing.source === "open_house"
                  ? `/app/open-houses/${showing.id}`
                  : `/app/pm/showings/${showing.id}`;
              return (
                <Card key={`${showing.source}-${showing.id}`} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {showing.property?.address}
                        </CardTitle>
                        {showing.property?.city && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {showing.property.city}{showing.property.state_province ? `, ${showing.property.state_province}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {showing.source === "open_house" && (
                          <Badge variant="outline" className="text-xs">
                            <Home className="h-3 w-3 mr-1" />
                            Open House
                          </Badge>
                        )}
                        <Badge variant={showing.status === "published" ? "default" : "secondary"}>
                          {showing.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {new Date(showing.start_at).toLocaleString()} - {new Date(showing.end_at).toLocaleTimeString()}
                      </div>
                      {showing.property?.bedrooms && (
                        <div className="text-sm text-muted-foreground">
                          {showing.property.bedrooms} bed • {showing.property.bathrooms} bath{showing.property.monthly_rent ? ` • $${showing.property.monthly_rent}/mo` : ""}
                        </div>
                      )}
                      <div className="pt-3">
                        <Link href={detailHref}>
                          <Button variant="outline" size="sm" className="w-full">
                            View Details & QR Code
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Showings */}
      {pastShowings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Past Showings</h3>
          <div className="grid gap-3">
            {pastShowings.slice(0, 5).map((showing) => {
              const detailHref =
                showing.source === "open_house"
                  ? `/app/open-houses/${showing.id}`
                  : `/app/pm/showings/${showing.id}`;
              return (
                <Card key={`${showing.source}-${showing.id}`} className="opacity-75">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{showing.property?.address}</div>
                        {showing.source === "open_house" && (
                          <Badge variant="outline" className="text-xs">Open House</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          {new Date(showing.start_at).toLocaleDateString()}
                        </div>
                        <Link href={detailHref}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {unified.length === 0 ? (
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
