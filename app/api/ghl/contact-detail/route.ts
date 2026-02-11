import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig } from "@/lib/integrations/ghl-token-refresh";

/**
 * Get detailed contact info including notes and conversations
 * Used by the Pipeline Kanban lead detail view
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactId = request.nextUrl.searchParams.get("contactId");
    if (!contactId) {
      return NextResponse.json({ error: "contactId is required" }, { status: 400 });
    }

    const ghlConfig = await getValidGHLConfig(userData.user.id);
    if (!ghlConfig) {
      return NextResponse.json(
        { error: "GHL integration not connected" },
        { status: 404 }
      );
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Fetch contact, notes, and conversations in parallel
    const [contact, notesResult, conversationsResult] = await Promise.allSettled([
      client.getContact(contactId),
      client.getNotes(contactId),
      client.getConversations(contactId),
    ]);

    const contactData = contact.status === "fulfilled" ? contact.value : null;
    const notes = notesResult.status === "fulfilled" ? notesResult.value.notes || [] : [];
    const conversations = conversationsResult.status === "fulfilled"
      ? conversationsResult.value.conversations || []
      : [];

    // For each conversation, fetch the latest messages
    const conversationsWithMessages = await Promise.all(
      conversations.slice(0, 5).map(async (conv: any) => {
        try {
          const messagesResult = await client.getConversationMessages(conv.id);
          return {
            ...conv,
            messages: (messagesResult.messages || []).slice(0, 20),
          };
        } catch {
          return { ...conv, messages: [] };
        }
      })
    );

    return NextResponse.json({
      contact: contactData,
      notes: notes.slice(0, 20),
      conversations: conversationsWithMessages,
    });
  } catch (error) {
    console.error("Contact detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch contact details" },
      { status: 500 }
    );
  }
}
