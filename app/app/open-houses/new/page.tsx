import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { geocodeAddress } from "@/lib/geocoding";
import OpenHouseForm from "./open-house-form";

export default async function NewOpenHousePage() {
  async function create(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user || !user.id) {
      console.error("No authenticated user or user ID");
      throw new Error("You must be signed in to create an open house");
    }

    console.log("User ID:", user.id);

    // Ensure agent profile exists
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id")
      .eq("id", user.id)
      .single();

    if (agentError || !agent) {
      console.log("Agent profile not found, creating...");
      // Create agent profile if it doesn't exist
      const { error: createError } = await supabase.from("agents").insert({
        id: user.id,
        email: user.email || "",
        display_name: user.user_metadata?.full_name || user.email || "",
      });

      if (createError) {
        console.error("Error creating agent profile:", createError);
        throw new Error("Failed to create agent profile. Please try again.");
      }
    }

    const address = String(formData.get("address") || "").trim();
    const start_at = String(formData.get("start_at") || "");
    const end_at = String(formData.get("end_at") || "");

    if (!address || !start_at || !end_at) {
      console.error("Missing required fields");
      throw new Error("Please fill in all required fields");
    }

    console.log("Creating open house with agent_id:", user.id);

    // Check if MLS fields were provided (from MLS lookup)
    const mlsLatitude = formData.get("latitude");
    const mlsLongitude = formData.get("longitude");
    const hasMlsCoords = mlsLatitude && mlsLongitude;

    // Only geocode if MLS didn't provide coordinates
    const geoResult = hasMlsCoords ? null : await geocodeAddress(address);

    // Extract optional MLS fields
    const beds = formData.get("beds") ? Number(formData.get("beds")) : null;
    const baths = formData.get("baths") ? Number(formData.get("baths")) : null;
    const sqft = formData.get("sqft") ? Number(formData.get("sqft")) : null;
    const price = formData.get("price") ? Number(formData.get("price")) : null;
    const listing_description = formData.get("listing_description") ? String(formData.get("listing_description")) : null;
    const key_features_raw = formData.get("key_features") ? String(formData.get("key_features")) : null;
    const key_features = key_features_raw ? JSON.parse(key_features_raw) : null;
    const property_photo_url = formData.get("property_photo_url") ? String(formData.get("property_photo_url")) : null;
    const mls_listing_key = formData.get("mls_listing_key") ? String(formData.get("mls_listing_key")) : null;
    const mls_listing_id = formData.get("mls_listing_id") ? String(formData.get("mls_listing_id")) : null;
    const mls_source = formData.get("mls_source") ? String(formData.get("mls_source")) : null;

    const insertData: Record<string, any> = {
      agent_id: user.id,
      address,
      start_at,
      end_at,
      status: "draft",
      pdf_download_enabled: false,
      details_page_enabled: true,
      latitude: hasMlsCoords ? Number(mlsLatitude) : (geoResult?.latitude ?? null),
      longitude: hasMlsCoords ? Number(mlsLongitude) : (geoResult?.longitude ?? null),
      event_type: "sales",
      pm_property_id: null,
    };

    // Add MLS-sourced fields if present
    if (beds != null) insertData.beds = beds;
    if (baths != null) insertData.baths = baths;
    if (sqft != null) insertData.sqft = sqft;
    if (price != null) insertData.price = price;
    if (listing_description) insertData.listing_description = listing_description;
    if (key_features) insertData.key_features = key_features;
    if (property_photo_url) insertData.property_photo_url = property_photo_url;
    if (mls_listing_key) insertData.mls_listing_key = mls_listing_key;
    if (mls_listing_id) insertData.mls_listing_id = mls_listing_id;
    if (mls_source) insertData.mls_source = mls_source;

    const { data, error } = await supabase
      .from("open_house_events")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      console.error("Error creating open house:", error);
      throw new Error(`Failed to create open house: ${error.message}`);
    }

    if (!data) {
      console.error("No data returned from insert");
      throw new Error("Failed to create open house. Please try again.");
    }

    console.log("Open house created successfully:", data.id);
    redirect(`/app/open-houses/${data.id}`);
  }

  // simple defaults: now + 2 hours
  const now = new Date();
  const startDefault = new Date(now.getTime() + 15 * 60 * 1000);
  const endDefault = new Date(startDefault.getTime() + 2 * 60 * 60 * 1000);

  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0 }}>New Open House</h1>

      <OpenHouseForm
        startDefault={toLocalInput(startDefault)}
        endDefault={toLocalInput(endDefault)}
        onSubmit={create}
      />
    </div>
  );
}
