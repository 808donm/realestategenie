/**
 * Lead Conversation Handoff API
 * POST: Agent manually takes over a conversation
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    // Fetch conversation
    const { data: convo, error: fetchError } = await admin
      .from("lead_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (fetchError || !convo) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (convo.current_phase === "handed_off") {
      return NextResponse.json({ message: "Already handed off" });
    }

    // Transition to handed_off
    const { data: updated, error } = await admin
      .from("lead_conversations")
      .update({
        current_phase: "handed_off",
        handed_off_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      conversation: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
