import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import SignOutButton from "./signout-button";

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
    <div style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            Signed in as <code>{user.email}</code>
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        <Link href="/app/open-houses/new" style={btnStyle}>+ New Open House</Link>
        <Link href="/app/open-houses" style={btnStyle}>View Open Houses</Link>
        <Link href="/app/settings/profile" style={btnStyle}>Edit Profile</Link>
        <Link href="/app/settings/security" style={btnStyle}>Security (MFA)</Link>
      </div>

      {/* Profile status */}
      <div style={{ marginTop: 18, padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Profile status</h2>
          <Link href="/app/settings/profile">Update</Link>
        </div>

        {missing.length === 0 ? (
          <p style={{ marginTop: 10, color: "green" }}>✅ Profile looks complete.</p>
        ) : (
          <div style={{ marginTop: 10 }}>
            <p style={{ margin: 0 }}>
              ⚠️ You’re missing: <strong>{missing.join(", ")}</strong>
            </p>
            <p style={{ marginTop: 8, opacity: 0.75 }}>
              Your attendee pages look more legit when name + phone + license are filled in.
            </p>
          </div>
        )}
      </div>

      {/* Open houses */}
      <div style={{ marginTop: 18, padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Recent open houses</h2>
          <Link href="/app/open-houses">See all</Link>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {(openHouses ?? []).map((e) => (
            <Link
              key={e.id}
              href={`/app/open-houses/${e.id}`}
              style={{ padding: 12, border: "1px solid #eee", borderRadius: 12, display: "block" }}
            >
              <div style={{ fontWeight: 800 }}>{e.address}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {new Date(e.start_at).toLocaleString()} • <strong>{e.status}</strong>
              </div>
            </Link>
          ))}
          {(!openHouses || openHouses.length === 0) && (
            <p style={{ opacity: 0.7, margin: 0 }}>
              No open houses yet. Create one and generate a QR code.
            </p>
          )}
        </div>
      </div>

      {/* Leads */}
      <div style={{ marginTop: 18, padding: 16, border: "1px solid #ddd", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Recent check-ins</h2>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {(leads ?? []).map((l) => {
            const p: any = l.payload ?? {};
            return (
              <div key={l.id} style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                <div style={{ fontWeight: 800 }}>
                  {p.name || "Lead"}{" "}
                  <span style={{ fontWeight: 400, opacity: 0.7 }}>
                    • {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {p.email ? <code>{p.email}</code> : null}{" "}
                  {p.phone_e164 ? <>• <code>{p.phone_e164}</code></> : null}
                </div>
              </div>
            );
          })}
          {(!leads || leads.length === 0) && (
            <p style={{ opacity: 0.7, margin: 0 }}>
              No attendee check-ins yet. Publish an open house and scan the QR code.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 12,
  textDecoration: "none",
  display: "inline-block",
  fontWeight: 700,
};
