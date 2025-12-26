import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

/**
 * Tenant Invitation API
 *
 * Creates a tenant user account and sends invitation email
 * Triggered when a lease is activated (contract signed)
 *
 * POST /api/tenant/invite
 * Body: { lease_id: string }
 */

// Use service role for creating tenant users
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { lease_id } = await request.json();

    if (!lease_id) {
      return NextResponse.json(
        { error: "lease_id is required" },
        { status: 400 }
      );
    }

    // Get lease details
    const { data: lease, error: leaseError } = await supabase
      .from("pm_leases")
      .select(`
        id,
        agent_id,
        tenant_contact_id,
        lease_start_date,
        lease_end_date,
        monthly_rent,
        pm_properties (address),
        pm_units (unit_number)
      `)
      .eq("id", lease_id)
      .single();

    if (leaseError || !lease) {
      return NextResponse.json(
        { error: "Lease not found" },
        { status: 404 }
      );
    }

    // Get tenant contact info from GHL
    const { data: integration } = await supabase
      .from("integrations")
      .select("ghl_access_token")
      .eq("agent_id", lease.agent_id)
      .single();

    if (!integration?.ghl_access_token) {
      return NextResponse.json(
        { error: "GHL integration not found" },
        { status: 500 }
      );
    }

    // Fetch tenant contact from GHL
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${lease.tenant_contact_id}`,
      {
        headers: {
          Authorization: `Bearer ${integration.ghl_access_token}`,
          Version: "2021-07-28",
        },
      }
    );

    if (!ghlResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch tenant contact from GHL" },
        { status: 500 }
      );
    }

    const { contact } = await ghlResponse.json();
    const tenantEmail = contact.email;
    const tenantPhone = contact.phone;
    const tenantName = contact.name || `${contact.firstName} ${contact.lastName}`;

    if (!tenantEmail) {
      return NextResponse.json(
        { error: "Tenant contact has no email address" },
        { status: 400 }
      );
    }

    // Check if tenant user already exists
    const { data: existingTenant } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("lease_id", lease_id)
      .single();

    if (existingTenant) {
      return NextResponse.json(
        { error: "Tenant invitation already sent for this lease" },
        { status: 400 }
      );
    }

    // Generate invitation token
    const invitationToken = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    // Create auth user (will need to set password on first login)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: tenantEmail,
      email_confirm: true,
      user_metadata: {
        role: "tenant",
        name: tenantName,
        lease_id: lease_id,
      },
    });

    if (authError || !authUser.user) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json(
        { error: "Failed to create tenant account" },
        { status: 500 }
      );
    }

    // Create tenant user record
    const { error: tenantError } = await supabase
      .from("tenant_users")
      .insert({
        id: authUser.user.id,
        lease_id: lease_id,
        email: tenantEmail,
        phone: tenantPhone,
        invited_at: new Date().toISOString(),
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
      });

    if (tenantError) {
      console.error("Error creating tenant user:", tenantError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: "Failed to create tenant record" },
        { status: 500 }
      );
    }

    // Create default notification preferences
    await supabase
      .from("tenant_notification_preferences")
      .insert({
        tenant_user_id: authUser.user.id,
      });

    // Send invitation email
    const propertyAddress = lease.pm_units?.unit_number
      ? `${lease.pm_properties?.address}, Unit ${lease.pm_units.unit_number}`
      : lease.pm_properties?.address;

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tenant/register?token=${invitationToken}`;

    // TODO: Use actual email service (SendGrid, AWS SES, etc.)
    // For now, we'll log the invitation URL
    console.log("📧 Tenant Invitation:");
    console.log(`To: ${tenantEmail}`);
    console.log(`Property: ${propertyAddress}`);
    console.log(`Invite URL: ${inviteUrl}`);

    // In production, send email via your email service:
    /*
    await sendEmail({
      to: tenantEmail,
      subject: `Welcome to ${propertyAddress} - Set Up Your Tenant Portal`,
      template: 'tenant-invitation',
      data: {
        tenantName,
        propertyAddress,
        leaseStartDate: lease.lease_start_date,
        monthlyRent: lease.monthly_rent,
        inviteUrl,
      }
    });
    */

    return NextResponse.json({
      success: true,
      message: "Tenant invitation sent",
      tenant_user_id: authUser.user.id,
      invite_url: inviteUrl, // Only for testing, remove in production
    });
  } catch (error) {
    console.error("Error in tenant invite route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
