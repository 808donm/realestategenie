import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getReapiClient, mapReapiSkipTrace } from "@/lib/integrations/reapi-client";
import { logSkipTraceUsage } from "@/lib/billing/skip-trace-billing";

/**
 * POST /api/bird-dog/skip-trace
 * Run skip trace on a Bird Dog result (manual, one at a time)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { resultId } = await request.json();
    if (!resultId) return NextResponse.json({ error: "resultId is required" }, { status: 400 });

    // Check if already skip traced
    const { data: existing } = await supabase
      .from("bird_dog_contacts")
      .select("id")
      .eq("result_id", resultId)
      .maybeSingle();

    if (existing) {
      // Return cached skip trace data (no charge)
      const { data: contact } = await supabase
        .from("bird_dog_contacts")
        .select("*")
        .eq("result_id", resultId)
        .single();
      logSkipTraceUsage({ agentId: user.id, address: contact?.address, ownerName: contact?.owner_name, source: "bird_dog", cached: true }).catch(() => {});
      return NextResponse.json({ contact, cached: true });
    }

    // Load the result to get property info
    const { data: result, error: resultError } = await supabase
      .from("bird_dog_results")
      .select("*")
      .eq("id", resultId)
      .eq("agent_id", user.id)
      .single();

    if (resultError || !result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const reapi = getReapiClient();
    if (!reapi) {
      return NextResponse.json({ error: "REAPI not configured" }, { status: 503 });
    }

    // Run skip trace
    const skipParams: any = { address: result.address };
    if (result.city) skipParams.city = result.city;
    if (result.state) skipParams.state = result.state;
    if (result.zip) skipParams.zip = result.zip;

    // Pass owner name for better match
    if (result.owner_name) {
      const nameParts = result.owner_name.split(" ");
      if (nameParts.length >= 2) {
        skipParams.first_name = nameParts[0];
        skipParams.last_name = nameParts[nameParts.length - 1];
      }
    }

    const raw = await reapi.skipTrace(skipParams) as any;
    const persons = (raw as any).persons || raw.data || [];
    const personArray = Array.isArray(persons) ? persons : [persons];
    const mappedPerson = personArray.length > 0 ? mapReapiSkipTrace(personArray[0]) : null;

    // Check v1 response format
    const identity = raw.output?.identity;
    const contact: any = {
      result_id: resultId,
      agent_id: user.id,
      reapi_property_id: result.reapi_property_id,
      owner_name: result.owner_name,
      phones: identity?.phones?.map((ph: any) => ({ number: ph.phoneDisplay || ph.phone, type: ph.phoneType, connected: ph.isConnected, doNotCall: ph.doNotCall }))
        || mappedPerson?.phones || [],
      emails: identity?.emails?.map((em: any) => ({ address: em.email, type: em.emailType }))
        || mappedPerson?.emails || [],
      addresses: mappedPerson?.addresses || [],
      social_profiles: mappedPerson?.socialProfiles || [],
      demographics: mappedPerson?.demographics || {},
      raw_data: raw.output || raw,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("bird_dog_contacts")
      .insert(contact)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Log billable skip trace
    logSkipTraceUsage({ agentId: user.id, address: result.address, ownerName: result.owner_name, source: "bird_dog", cached: false }).catch(() => {});

    return NextResponse.json({ contact: inserted, cached: false });
  } catch (error: any) {
    console.error("[BirdDog] Skip trace error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
