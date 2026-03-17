import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { GHLClient } from "@/lib/integrations/ghl-client";
import { getValidGHLConfig, resolveGHLAgentId } from "@/lib/integrations/ghl-token-refresh";

/** GET /api/ghl/contacts/notes?contactId=xxx — fetch notes for a GHL contact */
export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contactId = new URL(req.url).searchParams.get("contactId");
    if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

    const ghlAgentId = await resolveGHLAgentId(user.id);
    const config = await getValidGHLConfig(ghlAgentId);
    if (!config) return NextResponse.json({ error: "CRM not connected" }, { status: 400 });

    const client = new GHLClient(config.access_token, config.location_id);
    const { notes } = await client.getNotes(contactId);

    return NextResponse.json({ notes: notes || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST /api/ghl/contacts/notes — add a note to a GHL contact */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { contactId, body: noteBody } = await req.json();
    if (!contactId || !noteBody?.trim()) {
      return NextResponse.json({ error: "contactId and body required" }, { status: 400 });
    }

    const ghlAgentId = await resolveGHLAgentId(user.id);
    const config = await getValidGHLConfig(ghlAgentId);
    if (!config) return NextResponse.json({ error: "CRM not connected" }, { status: 400 });

    const client = new GHLClient(config.access_token, config.location_id);
    await client.addNote({ contactId, body: noteBody.trim() });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
