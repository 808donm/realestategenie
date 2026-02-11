import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * List available GHL document templates
 * GET /api/debug/list-document-templates?agentId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({
        error: 'agentId query parameter required',
        example: '/api/debug/list-document-templates?agentId=b80d448f-d58a-4cb6-bb13-f5a6d38b30ae',
      }, { status: 400 });
    }

    // Fetch GHL integration
    const { data: integration, error: integrationError } = await admin
      .from('integrations')
      .select('*')
      .eq('agent_id', agentId)
      .eq('provider', 'ghl')
      .eq('status', 'connected')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({
        error: 'No connected GHL integration found',
      }, { status: 404 });
    }

    const accessToken = integration.access_token;
    const locationId = integration.location_id;

    if (!accessToken || !locationId) {
      return NextResponse.json({
        error: 'Missing access token or location ID',
      }, { status: 400 });
    }

    // Fetch document templates from GHL
    // Try both possible endpoints
    const endpoints = [
      `/locations/${locationId}/templates`,
      `/templates?locationId=${locationId}`,
      `/documents/templates?locationId=${locationId}`,
    ];

    let templates: any = null;
    let usedEndpoint: string = '';

    for (const endpoint of endpoints) {
      try {
        console.log(`[GHL Templates] Trying endpoint: ${endpoint}`);

        const response = await fetch(`https://services.leadconnectorhq.com${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          templates = await response.json();
          usedEndpoint = endpoint;
          console.log(`[GHL Templates] Success with endpoint: ${endpoint}`);
          break;
        } else {
          console.log(`[GHL Templates] Failed with ${endpoint}: ${response.status} ${response.statusText}`);
        }
      } catch (err: any) {
        console.log(`[GHL Templates] Error with ${endpoint}:`, err.message);
      }
    }

    if (!templates) {
      return NextResponse.json({
        error: 'Could not fetch templates from any endpoint',
        triedEndpoints: endpoints,
        suggestion: 'GHL may not have a public templates API, or templates might need to be configured in the GHL UI first',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      locationId,
      usedEndpoint,
      templates,
    });

  } catch (error: any) {
    console.error('[GHL Templates] Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
