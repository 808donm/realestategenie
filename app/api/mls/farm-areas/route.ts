import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Farm Areas CRUD
 *
 * GET    — List agent's farm areas with watch rules
 * POST   — Create a new farm area with optional watch rules
 * PATCH  — Update a farm area
 * DELETE — Delete a farm area
 */

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: farmAreas, error } = await supabase
      .from("mls_farm_areas")
      .select("*, mls_watch_rules(*)")
      .eq("agent_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get unread alert counts per farm area
    const farmIds = (farmAreas || []).map((f: any) => f.id);
    let alertCounts: Record<string, number> = {};

    if (farmIds.length > 0) {
      const { data: counts } = await supabase
        .from("mls_watchdog_alerts")
        .select("farm_area_id")
        .eq("agent_id", userData.user.id)
        .eq("status", "new")
        .in("farm_area_id", farmIds);

      if (counts) {
        for (const row of counts) {
          alertCounts[row.farm_area_id] = (alertCounts[row.farm_area_id] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      farmAreas: (farmAreas || []).map((fa: any) => ({
        ...fa,
        unread_alerts: alertCounts[fa.id] || 0,
      })),
    });
  } catch (error) {
    console.error("Farm areas GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load farm areas" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      search_type,
      postal_codes,
      center_lat,
      center_lng,
      radius_miles,
      tmk_prefix,
      property_types,
      min_price,
      max_price,
      min_beds,
      min_baths,
      statuses,
      watch_rules,
    } = body;

    if (!name || !search_type) {
      return NextResponse.json({ error: "name and search_type are required" }, { status: 400 });
    }

    // Validate search_type has required fields
    if (search_type === "zip" && (!postal_codes || postal_codes.length === 0)) {
      return NextResponse.json({ error: "postal_codes required for zip search" }, { status: 400 });
    }
    if (search_type === "radius" && (!center_lat || !center_lng)) {
      return NextResponse.json({ error: "center_lat and center_lng required for radius search" }, { status: 400 });
    }
    if (search_type === "tmk" && !tmk_prefix) {
      return NextResponse.json({ error: "tmk_prefix required for TMK search" }, { status: 400 });
    }

    // Create farm area
    const { data: farmArea, error: farmError } = await supabase
      .from("mls_farm_areas")
      .insert({
        agent_id: userData.user.id,
        name,
        search_type,
        postal_codes: postal_codes || null,
        center_lat: center_lat || null,
        center_lng: center_lng || null,
        radius_miles: radius_miles || 2,
        tmk_prefix: tmk_prefix || null,
        property_types: property_types || [],
        min_price: min_price || null,
        max_price: max_price || null,
        min_beds: min_beds || null,
        min_baths: min_baths || null,
        statuses: statuses || ["Active"],
      })
      .select()
      .single();

    if (farmError) throw farmError;

    // Create watch rules if provided
    if (watch_rules && watch_rules.length > 0) {
      const rules = watch_rules.map((rule: any) => ({
        farm_area_id: farmArea.id,
        agent_id: userData.user.id,
        trigger_type: rule.trigger_type,
        threshold_value: rule.threshold_value || null,
        status_triggers: rule.status_triggers || [],
        notify_push: rule.notify_push ?? true,
        notify_email: rule.notify_email ?? true,
        notify_sms: rule.notify_sms ?? false,
      }));

      const { error: rulesError } = await supabase.from("mls_watch_rules").insert(rules);

      if (rulesError) {
        console.error("Watch rules insert error:", rulesError);
      }
    }

    // Re-fetch with rules
    const { data: result } = await supabase
      .from("mls_farm_areas")
      .select("*, mls_watch_rules(*)")
      .eq("id", farmArea.id)
      .single();

    return NextResponse.json({ farmArea: result }, { status: 201 });
  } catch (error) {
    console.error("Farm areas POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create farm area" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, watch_rules, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Update farm area fields
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("mls_farm_areas")
        .update(updates)
        .eq("id", id)
        .eq("agent_id", userData.user.id);

      if (error) throw error;
    }

    // Replace watch rules if provided
    if (watch_rules !== undefined) {
      // Delete existing rules
      await supabase.from("mls_watch_rules").delete().eq("farm_area_id", id).eq("agent_id", userData.user.id);

      // Insert new rules
      if (watch_rules.length > 0) {
        const rules = watch_rules.map((rule: any) => ({
          farm_area_id: id,
          agent_id: userData.user.id,
          trigger_type: rule.trigger_type,
          threshold_value: rule.threshold_value || null,
          status_triggers: rule.status_triggers || [],
          notify_push: rule.notify_push ?? true,
          notify_email: rule.notify_email ?? true,
          notify_sms: rule.notify_sms ?? false,
        }));

        await supabase.from("mls_watch_rules").insert(rules);
      }
    }

    const { data: result } = await supabase
      .from("mls_farm_areas")
      .select("*, mls_watch_rules(*)")
      .eq("id", id)
      .single();

    return NextResponse.json({ farmArea: result });
  } catch (error) {
    console.error("Farm areas PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update farm area" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase.from("mls_farm_areas").delete().eq("id", id).eq("agent_id", userData.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Farm areas DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete farm area" },
      { status: 500 },
    );
  }
}
