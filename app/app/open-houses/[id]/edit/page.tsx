import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PropertyDetailsForm from "./property-details-form";

export default async function EditPropertyDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: evt, error } = await supabase
    .from("open_house_events")
    .select(
      "id,address,beds,baths,sqft,price,listing_description,key_features,agent_id,property_photo_url"
    )
    .eq("id", id)
    .single();

  if (error || !evt) {
    redirect("/app/open-houses");
  }

  // Verify ownership
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== evt.agent_id) {
    redirect("/app/open-houses");
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edit Property Details</h1>
            <p className="text-muted-foreground mt-1">{evt.address}</p>
          </div>
          <Link
            href={`/app/open-houses/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Open House
          </Link>
        </div>
      </div>

      <PropertyDetailsForm
        eventId={id}
        initialData={{
          beds: evt.beds,
          baths: evt.baths,
          sqft: evt.sqft,
          price: evt.price,
          listing_description: evt.listing_description,
          key_features: evt.key_features,
          property_photo_url: evt.property_photo_url,
        }}
      />

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tip</h3>
        <p className="text-sm text-blue-800">
          After saving these details, your professional flyer will automatically include all this
          information. Download it from the open house detail page!
        </p>
      </div>
    </div>
  );
}
