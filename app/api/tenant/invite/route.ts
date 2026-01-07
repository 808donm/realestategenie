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

    // Get tenant contact info and GHL integration
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("agent_id", lease.agent_id)
      .eq("provider", "ghl")
      .single();

    if (!integration?.config?.ghl_access_token) {
      return NextResponse.json(
        { error: "GHL integration not found" },
        { status: 500 }
      );
    }

    const ghlAccessToken = integration.config.ghl_access_token;
    const ghlLocationId = integration.config.ghl_location_id;

    // Fetch tenant contact from GHL
    const ghlResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${lease.tenant_contact_id}`,
      {
        headers: {
          Authorization: `Bearer ${ghlAccessToken}`,
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
    // Handle Supabase joins that may return arrays
    const unit = Array.isArray(lease.pm_units) ? lease.pm_units[0] : lease.pm_units;
    const property = Array.isArray(lease.pm_properties) ? lease.pm_properties[0] : lease.pm_properties;

    const propertyAddress = unit?.unit_number
      ? `${property?.address}, Unit ${unit.unit_number}`
      : property?.address;

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tenant/register?token=${invitationToken}`;

    // Get agent name and email for email
    const { data: agent } = await supabase
      .from("agents")
      .select("display_name, email")
      .eq("id", lease.agent_id)
      .single();

    const landlordName = agent?.display_name || "Your Property Manager";

    // Send invitation email via GHL
    try {
      const leaseStartDate = new Date(lease.lease_start_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .details { background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Your Tenant Portal!</h1>
    </div>
    <div class="content">
      <p>Hi ${tenantName},</p>

      <p>${landlordName} has invited you to access your tenant portal for <strong>${propertyAddress}</strong>.</p>

      <div class="details">
        <p><strong>Lease Start Date:</strong> ${leaseStartDate}</p>
        <p><strong>Monthly Rent:</strong> $${lease.monthly_rent?.toLocaleString()}</p>
      </div>

      <p>With your tenant portal, you can:</p>
      <ul>
        <li>Pay rent online</li>
        <li>Submit maintenance requests</li>
        <li>View your lease documents</li>
        <li>Message your property manager</li>
        <li>Track your payment history</li>
      </ul>

      <p style="text-align: center;">
        <a href="${inviteUrl}" class="button">Set Up Your Account</a>
      </p>

      <p style="font-size: 14px; color: #6b7280;">
        This invitation link will expire on ${expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
        If you need a new invitation, please contact your property manager.
      </p>
    </div>
    <div class="footer">
      <p>This email was sent by ${landlordName}</p>
      <p>If you have any questions, please reply to this email.</p>
    </div>
  </div>
</body>
</html>
      `;

      // Send email via GHL
      const emailResponse = await fetch(
        `https://services.leadconnectorhq.com/conversations/messages/email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ghlAccessToken}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify({
            locationId: ghlLocationId,
            contactId: lease.tenant_contact_id,
            subject: `Welcome to Your Tenant Portal - ${propertyAddress}`,
            html: emailHtml,
            emailFrom: agent?.email || undefined,
          }),
        }
      );

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error("❌ Failed to send email via GHL:", errorData);
        throw new Error("GHL email API failed");
      }

      console.log(`✅ Tenant invitation email sent to ${tenantEmail} via GHL`);
    } catch (emailError) {
      console.error("❌ Failed to send tenant invitation email:", emailError);
      // Log the URL for manual sending if email fails
      console.log(`📧 Invitation URL (manual fallback): ${inviteUrl}`);
      // Don't throw - we still want to return success if the account was created
    }

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
