import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig, resolveGHLAgentId } from "@/lib/integrations/ghl-token-refresh";

/**
 * GET /api/messaging/conversations?contactId=xxx
 * Returns a unified conversation timeline for a contact across all channels
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

    const ghlAgentId = await resolveGHLAgentId(userData.user.id);
    const ghlConfig = await getValidGHLConfig(ghlAgentId);
    if (!ghlConfig) {
      return NextResponse.json({ error: "GHL not connected" }, { status: 400 });
    }

    const client = new GHLClient(ghlConfig.access_token, ghlConfig.location_id);

    // Fetch conversations and notes in parallel
    const [convoResult, notesResult] = await Promise.allSettled([
      client.getConversations(contactId),
      client.getNotes(contactId),
    ]);

    const conversations = convoResult.status === "fulfilled" ? convoResult.value.conversations || [] : [];
    const notes = notesResult.status === "fulfilled" ? notesResult.value.notes || [] : [];

    // Fetch messages for each conversation
    const allMessages: Array<{
      id: string;
      type: "email" | "sms" | "call" | "note" | "other";
      direction: "inbound" | "outbound" | "internal";
      body: string;
      subject?: string;
      timestamp: string;
      channel: string;
      status?: string;
    }> = [];

    // Add notes as timeline events
    for (const note of notes) {
      allMessages.push({
        id: note.id || `note-${note.dateAdded}`,
        type: "note",
        direction: "internal",
        body: note.body,
        timestamp: note.dateAdded || new Date().toISOString(),
        channel: "note",
      });
    }

    // Fetch messages from each conversation
    for (const conv of conversations.slice(0, 10)) {
      try {
        const msgResult = await client.getConversationMessages(conv.id);
        const messages = msgResult.messages || [];
        for (const msg of messages) {
          const msgType = (msg.type || conv.type || "").toLowerCase();
          allMessages.push({
            id: msg.id,
            type: msgType === "sms" ? "sms" : msgType === "email" ? "email" : msgType === "call" ? "call" : "other",
            direction: msg.direction === "outbound" ? "outbound" : "inbound",
            body: msg.body || msg.text || "",
            subject: msg.subject,
            timestamp: msg.dateAdded || msg.createdAt || conv.dateAdded || new Date().toISOString(),
            channel: msgType || "unknown",
            status: msg.status,
          });
        }
      } catch {
        // Skip failed conversation fetches
      }
    }

    // Sort by timestamp descending (most recent first)
    allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      timeline: allMessages.slice(0, 100),
      totalConversations: conversations.length,
      totalNotes: notes.length,
    });
  } catch (error) {
    console.error("Conversations timeline error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load conversations" },
      { status: 500 }
    );
  }
}
