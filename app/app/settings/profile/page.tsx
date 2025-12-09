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
    .select("id,email,display_name,license_number,phone_e164,locations_served,photo_url")
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

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Agent Profile</h1>
      <p style={{ opacity: 0.75 }}>
        This info appears on your open house pages.
      </p>

      <ProfileForm agent={agent} />
    </div>
  );
}
