import { supabaseServer } from "@/lib/supabase/server";
import ContactsClient from "./contacts.client";

export default async function ContactsPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div style={{ padding: 24, color: "crimson" }}>Not authenticated</div>;
  }

  // Check if GHL is connected
  const { data: integration } = await supabase
    .from("integrations")
    .select("id, config")
    .eq("agent_id", user.id)
    .eq("provider", "ghl")
    .single();

  const isGHLConnected = !!integration?.config?.ghl_access_token;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Contacts</h1>
        <p style={{ opacity: 0.7, marginTop: 4 }}>
          Manage your contacts synced with GoHighLevel CRM
        </p>
      </div>

      {!isGHLConnected ? (
        <div
          style={{
            padding: 32,
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            GoHighLevel Not Connected
          </h2>
          <p style={{ marginBottom: 16, color: "#92400e" }}>
            Connect your GoHighLevel account to sync and manage contacts.
          </p>
          <a
            href="/app/integrations"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              background: "#f59e0b",
              color: "#fff",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Go to Integrations
          </a>
        </div>
      ) : (
        <ContactsClient />
      )}
    </div>
  );
}
