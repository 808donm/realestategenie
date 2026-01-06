import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Set GHL lease template ID in integration config
 * POST /api/debug/set-ghl-template
 * Body: { agentId: string, templateId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, templateId } = body;

    if (!agentId || !templateId) {
      return NextResponse.json({
        error: 'agentId and templateId required',
        example: {
          agentId: 'b80d448f-d58a-4cb6-bb13-f5a6d38b30ae',
          templateId: 'abc123xyz',
        },
      }, { status: 400 });
    }

    // Update GHL integration config
    const { data: integration, error: updateError } = await admin
      .from('integrations')
      .update({
        config: admin.from('integrations').select('config').eq('agent_id', agentId).eq('provider', 'ghl').single().then((res: any) => {
          const currentConfig = res.data?.config || {};
          return {
            ...currentConfig,
            ghl_lease_template_id: templateId,
          };
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)
      .eq('provider', 'ghl')
      .select()
      .single();

    if (updateError) {
      // Try a different approach using raw SQL via RPC
      const { data: currentIntegration } = await admin
        .from('integrations')
        .select('config')
        .eq('agent_id', agentId)
        .eq('provider', 'ghl')
        .single();

      if (!currentIntegration) {
        return NextResponse.json({
          error: 'No GHL integration found for this agent',
        }, { status: 404 });
      }

      const updatedConfig = {
        ...(currentIntegration.config || {}),
        ghl_lease_template_id: templateId,
      };

      const { error: finalError } = await admin
        .from('integrations')
        .update({
          config: updatedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('agent_id', agentId)
        .eq('provider', 'ghl');

      if (finalError) {
        return NextResponse.json({
          error: `Failed to update: ${finalError.message}`,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Template ID configured successfully',
        agentId,
        templateId,
        config: updatedConfig,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Template ID configured successfully',
      agentId,
      templateId,
      integration,
    });

  } catch (error: any) {
    console.error('[Set GHL Template] Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

/**
 * Get current GHL template ID
 * GET /api/debug/set-ghl-template?agentId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({
        error: 'agentId query parameter required',
      }, { status: 400 });
    }

    const { data: integration, error } = await admin
      .from('integrations')
      .select('config')
      .eq('agent_id', agentId)
      .eq('provider', 'ghl')
      .single();

    if (error || !integration) {
      return NextResponse.json({
        error: 'No GHL integration found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      agentId,
      templateId: integration.config?.ghl_lease_template_id || null,
      hasTemplate: !!integration.config?.ghl_lease_template_id,
      config: integration.config,
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}
