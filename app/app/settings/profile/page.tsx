import { supabaseServer } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    // Middleware should prevent this, but keep it safe.
    return <div style={{ padding: 24 }}>Not signed in.</div>;
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id,email,display_name,license_number,agency_name,phone_e164,locations_served,photo_url,landing_page,headshot_url,company_logo_url")
    .eq("id", userData.user.id)
    .single();

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Profile</h1>
        <p style={{ color: "crimson" }}>Failed to load profile: {error.message}</p>
      </div>
    );
  }

async function updateLandingPage(formData: FormData) {
  "use server";
  const landing_page = String(formData.get("landing_page") || "dashboard");

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  await supabase
    .from("agents")
    .update({ landing_page })
    .eq("id", data.user.id);
}


  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Agent Profile</h1>
      <p style={{ opacity: 0.75 }}>
        This info appears on your open house pages.
      </p>

      <form action={updateLandingPage} style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <label style={{ fontWeight: 800 }}>Landing page</label>
        <select name="landing_page" defaultValue={agent?.landing_page ?? "dashboard"} style={{ padding: 8 }}>
        <option value="dashboard">Dashboard</option>
        <option value="open-houses">Open Houses</option>
        </select>
        <button style={{ padding: "8px 10px", fontWeight: 800 }}>Save</button>
     </form>


      <ProfileForm agent={agent} />
    </div>
  );
}
