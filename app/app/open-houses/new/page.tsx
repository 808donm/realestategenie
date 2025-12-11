import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { geocodeAddress } from "@/lib/geocoding";

export default async function NewOpenHousePage() {
  const supabase = await supabaseServer();

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

    // Geocode the address to get coordinates
    const geoResult = await geocodeAddress(address);

    const { data, error } = await supabase
      .from("open_house_events")
      .insert({
        agent_id: user.id,
        address,
        start_at,
        end_at,
        status: "draft",
        pdf_download_enabled: false,
        details_page_enabled: true,
        latitude: geoResult?.latitude ?? null,
        longitude: geoResult?.longitude ?? null,
      })
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

      <form action={create} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Address</label>
          <input name="address" style={{ width: "100%", padding: 10 }} placeholder="123 Main St, Honolulu, HI" required />
          <p style={{ fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
            We'll automatically geocode this address to show a map on your open house page.
          </p>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Start</label>
            <input name="start_at" type="datetime-local" defaultValue={toLocalInput(startDefault)} style={{ width: "100%", padding: 10 }} required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>End</label>
            <input name="end_at" type="datetime-local" defaultValue={toLocalInput(endDefault)} style={{ width: "100%", padding: 10 }} required />
          </div>
        </div>

        <button style={{ padding: 12, fontWeight: 900 }}>Create</button>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
          After creating, you’ll publish it and generate the QR check-in link.
        </p>
      </form>
    </div>
  );
}
