import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, MapPin, Clock } from "lucide-react";
import QRCodeDisplay from "./qr-code-display.client";
import { revalidatePath } from "next/cache";

export default async function ShowingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  // Get showing with property details
  const { data: showing, error } = await supabase
    .from("pm_showings")
    .select(`
      id,
      start_at,
      end_at,
      status,
      notes,
      created_at,
      pm_properties (
        address,
        city,
        state_province,
        zip_postal_code,
        bedrooms,
        bathrooms,
        square_feet,
        monthly_rent,
        security_deposit,
        pet_policy,
        description,
        property_photo_url
      )
    `)
    .eq("id", id)
    .eq("agent_id", userData.user.id)
    .single();

  if (error || !showing) {
    return (
      <div className="container max-w-4xl py-12">
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive">{error?.message || "Showing not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const property = showing.pm_properties as any;

  async function updateStatus(formData: FormData) {
    "use server";
    const status = formData.get("status") as string;
    const supabase = await supabaseServer();

    await supabase
      .from("pm_showings")
      .update({ status })
      .eq("id", id);

    revalidatePath(`/app/pm/showings/${id}`);
  }

  return (
    <div className="container max-w-4xl py-12 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Property Showing
            <Badge variant={showing.status === "published" ? "default" : "secondary"}>
              {showing.status}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Scheduled for {new Date(showing.start_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-2">
          <form action={updateStatus}>
            <select
              name="status"
              defaultValue={showing.status}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button size="sm" className="ml-2">Save Status</Button>
          </form>
        </div>
      </div>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Property Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xl font-semibold">{property.address}</div>
            <div className="text-muted-foreground">
              {property.city}, {property.state_province} {property.zip_postal_code}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y">
            <div>
              <div className="text-sm text-muted-foreground">Bedrooms</div>
              <div className="text-lg font-semibold">{property.bedrooms || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Bathrooms</div>
              <div className="text-lg font-semibold">{property.bathrooms || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Square Feet</div>
              <div className="text-lg font-semibold">{property.square_feet ? property.square_feet.toLocaleString() : "N/A"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Monthly Rent</div>
              <div className="text-lg font-semibold">${property.monthly_rent ? property.monthly_rent.toLocaleString() : "N/A"}</div>
            </div>
          </div>

          {property.description && (
            <div>
              <div className="text-sm font-medium mb-1">Description</div>
              <p className="text-sm text-muted-foreground">{property.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Showing Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Showing Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{new Date(showing.start_at).toLocaleString()}</span>
            <span className="text-muted-foreground">to</span>
            <span className="font-medium">{new Date(showing.end_at).toLocaleTimeString()}</span>
          </div>

          {showing.notes && (
            <div className="pt-3 border-t">
              <div className="text-sm font-medium mb-1">Notes</div>
              <p className="text-sm text-muted-foreground">{showing.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code */}
      <QRCodeDisplay
        showingId={showing.id}
        status={showing.status}
      />

      {/* Applications Link */}
      <Card>
        <CardHeader>
          <CardTitle>Applications from this Showing</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href={`/app/pm/applications?showing=${id}`}>
            <Button variant="outline">
              View Applications
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Back Link */}
      <div>
        <Link href="/app/pm/showings">
          <Button variant="ghost">← Back to Showings</Button>
        </Link>
      </div>
    </div>
  );
}
