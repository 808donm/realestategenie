import ContactsClient from "./contacts.client";
import PageHelp from "../components/page-help";
import { getEffectiveClient } from "@/lib/supabase/effective-client";

export default async function ContactsPage() {
  const { supabase, userId } = await getEffectiveClient();

  // Check if GHL is connected
  const { data: integration } = await supabase
    .from("integrations")
    .select("id, config")
    .eq("agent_id", userId)
    .eq("provider", "ghl")
    .single();

  const isGHLConnected = !!integration?.config?.ghl_access_token;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Contacts</h1>
          <PageHelp
            title="Contacts"
            description="Your CRM contacts synced from GoHighLevel. Search, view details, and take action on any contact."
            tips={[
              "Use Call, Text, or Email buttons for quick outreach",
              "Click a contact to view full details and history",
            ]}
          />
        </div>
        <p style={{ opacity: 0.7, marginTop: 4 }}>Manage your contacts</p>
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
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>CRM Not Connected</h2>
          <p style={{ marginBottom: 16, color: "#92400e" }}>Connect your CRM account to sync and manage contacts.</p>
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
