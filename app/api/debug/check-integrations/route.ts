import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all integrations for the user
  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("agent_id", userData.user.id);

  const ghlIntegration = integrations?.find((i) => i.provider === "ghl");
  const pandadocIntegration = integrations?.find((i) => i.provider === "pandadoc");

  const hasGHLIntegration = !!(ghlIntegration?.config?.ghl_access_token && ghlIntegration?.config?.ghl_location_id);
  const hasPandaDocIntegration = !!(pandadocIntegration?.config?.api_key && pandadocIntegration?.status === "connected");

  return NextResponse.json({
    user_id: userData.user.id,
    ghl: {
      exists: !!ghlIntegration,
      hasAccessToken: !!ghlIntegration?.config?.ghl_access_token,
      hasLocationId: !!ghlIntegration?.config?.ghl_location_id,
      isValid: hasGHLIntegration,
      status: ghlIntegration?.status,
    },
    pandadoc: {
      exists: !!pandadocIntegration,
      hasApiKey: !!pandadocIntegration?.config?.api_key,
      isConnected: pandadocIntegration?.status === "connected",
      isValid: hasPandaDocIntegration,
      status: pandadocIntegration?.status,
    },
    recommendation: hasGHLIntegration
      ? "GHL is configured - should use GHL by default"
      : hasPandaDocIntegration
        ? "Only PandaDoc configured - will use PandaDoc"
        : "No integrations configured",
  });
}
