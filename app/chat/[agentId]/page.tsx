import { createClient } from "@supabase/supabase-js";
import ChatWidget from "./chat-widget";

export const dynamic = "force-dynamic";

// Public page -- no auth required
export default async function WebChatPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  // Fetch agent info for branding
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: agent } = await admin
    .from("agents")
    .select("id, display_name, email, phone_e164, photo_url, headshot_url, company_logo_url, agency_name, license_number")
    .eq("id", agentId)
    .single();

  if (!agent) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280", fontFamily: "system-ui" }}>
        Agent not found.
      </div>
    );
  }

  return (
    <ChatWidget
      agentId={agent.id}
      agentName={agent.display_name || "Agent"}
      agentPhoto={agent.headshot_url || agent.photo_url || null}
      agentPhone={agent.phone_e164 || null}
      agentEmail={agent.email}
      brokerageName={agent.agency_name || null}
      logoUrl={agent.company_logo_url || null}
    />
  );
}
