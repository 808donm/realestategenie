import { createClient } from "@supabase/supabase-js";
import ChatWidgetEmbed from "./chat-embed.client";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

/**
 * Embeddable chat page for real estate agent websites.
 *
 * Usage:
 *   <iframe src="https://app.realestategenie.com/embed/chat/AGENT_ID" />
 *
 * Or with a script tag (see embed instructions).
 */
export default async function EmbedChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ color?: string; greeting?: string }>;
}) {
  const { agentId } = await params;
  const { color, greeting } = await searchParams;

  // Look up agent
  const { data: agent } = await admin.from("agents").select("id, display_name").eq("id", agentId).single();

  if (!agent) {
    return (
      <html>
        <body style={{ fontFamily: "sans-serif", padding: 40, color: "#666" }}>
          <p>Chat widget not available.</p>
        </body>
      </html>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: "transparent" }}>
        <ChatWidgetEmbed
          agentId={agent.id}
          agentName={agent.display_name || "us"}
          primaryColor={color ? `#${color}` : undefined}
          greeting={greeting}
          apiUrl={appUrl}
        />
      </body>
    </html>
  );
}
