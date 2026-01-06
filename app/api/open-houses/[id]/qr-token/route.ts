import { NextRequest, NextResponse } from 'next/server';
import { generateQRToken } from '@/lib/security/qr-tokens';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Generate a secure QR code access token for an open house
 * GET /api/open-houses/[id]/qr-token
 *
 * Returns a signed token that grants access to the registration page
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await supabaseServer();

    // Verify the event exists and user has access
    const { data: event, error } = await supabase
      .from('open_house_events')
      .select('id, status, agent_id')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: 'Open house not found' },
        { status: 404 }
      );
    }

    // Generate token (valid for 72 hours by default)
    // You can customize the validity period via query param
    const validityHours = parseInt(req.nextUrl.searchParams.get('hours') || '72', 10);
    const token = generateQRToken(eventId, validityHours);

    // Generate the full URL with token
    const origin = req.nextUrl.origin;
    const url = `${origin}/oh/${eventId}?token=${token}`;

    return NextResponse.json({
      success: true,
      eventId,
      token,
      url,
      expiresIn: `${validityHours} hours`,
    });
  } catch (error: any) {
    console.error('[QR Token] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
