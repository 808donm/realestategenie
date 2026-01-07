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
        ghl_contact_id,
        tenant_name,
        tenant_email,
        tenant_phone,
        pm_application_id,
        lease_start_date,
        lease_end_date,
        monthly_rent,
        pm_properties!left (address),
        pm_units!left (unit_number)
      `)
      .eq("id", lease_id)
      .single();

    if (leaseError || !lease) {
      console.error("Failed to fetch lease:", leaseError);
      return NextResponse.json(
        { error: `Lease not found: ${leaseError?.message || 'Unknown error'}` },
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

    const { GHLClient } = await import("@/lib/integrations/ghl-client");
    const ghlClient = new GHLClient(ghlAccessToken, ghlLocationId);

    let contact;
    let tenantEmail: string = '';
    let tenantPhone: string | null = null;
    let tenantName: string = '';
    let contactId: string = '';

    // Try to get tenant contact from GHL
    if (lease.ghl_contact_id || lease.tenant_contact_id) {
      try {
        contact = await ghlClient.getContact(lease.ghl_contact_id || lease.tenant_contact_id);
        tenantEmail = contact.email!;
        tenantPhone = contact.phone || null;
        tenantName = contact.name || `${contact.firstName} ${contact.lastName}`;
        contactId = contact.id!;
      } catch (error) {
        console.error("Failed to fetch contact from GHL:", error);
        // Contact ID is set but contact doesn't exist - will create new one below
        contact = null;
      }
    }

    // If no contact exists, get tenant info from lease or application and create contact
    if (!contact) {
      // Get application data if available
      const { data: application } = await supabase
        .from("pm_applications")
        .select("applicant_name, applicant_email, applicant_phone")
        .eq("id", lease.pm_application_id!)
        .single();

      tenantEmail = lease.tenant_email || application?.applicant_email;
      tenantPhone = lease.tenant_phone || application?.applicant_phone || null;
      tenantName = lease.tenant_name || application?.applicant_name || tenantEmail;

      if (!tenantEmail) {
        return NextResponse.json(
          { error: "No tenant email found. Please set tenant email on the lease." },
          { status: 400 }
        );
      }

      // Create contact in GHL or use existing if duplicate
      console.log(`Creating GHL contact for tenant: ${tenantEmail}`);
      try {
        contact = await ghlClient.createContact({
          locationId: ghlLocationId,
          email: tenantEmail,
          phone: tenantPhone || undefined,
          name: tenantName,
          tags: ["tenant"],
        });

        contactId = contact.id!;
        console.log(`✅ Created new GHL contact ${contactId}`);
      } catch (createError: any) {
        // Check if it's a duplicate contact error
        if (createError.message?.includes('duplicated contacts') || createError.message?.includes('duplicate')) {
          // Extract contact ID from error response
          // GHL returns: {"meta":{"contactId":"qI2df57vN9E9zEBfjQRk",...}}
          const errorMatch = createError.message.match(/"contactId":"([^"]+)"/);
          if (errorMatch && errorMatch[1]) {
            contactId = errorMatch[1];
            console.log(`✅ Using existing GHL contact ${contactId} (duplicate found)`);

            // Fetch the existing contact to get full details
            contact = await ghlClient.getContact(contactId);
            tenantEmail = contact.email!;
            tenantPhone = contact.phone || null;
            tenantName = contact.name || `${contact.firstName} ${contact.lastName}`;
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      }

      // Update lease with contact ID
      await supabase
        .from("pm_leases")
        .update({
          ghl_contact_id: contactId,
          tenant_email: tenantEmail,
          tenant_name: tenantName,
          tenant_phone: tenantPhone,
        })
        .eq("id", lease_id);

      console.log(`✅ Updated lease with GHL contact ${contactId}`);
    }

    if (!tenantEmail) {
      return NextResponse.json(
        { error: "Tenant contact has no email address" },
        { status: 400 }
      );
    }

    // Check if tenant user already exists for this lease
    const { data: existingTenant } = await supabase
      .from("tenant_users")
      .select("id, invitation_token")
      .eq("lease_id", lease_id)
      .maybeSingle();

    if (existingTenant) {
      console.log(`✅ Tenant user already exists for lease ${lease_id}, resending invitation`);

      // Generate new invitation token
      const invitationToken = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Update invitation token
      await supabase
        .from("tenant_users")
        .update({
          invitation_token: invitationToken,
          invitation_expires_at: expiresAt.toISOString(),
          invited_at: new Date().toISOString(),
        })
        .eq("id", existingTenant.id);

      // Continue to send email below with new token
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tenant/register?token=${invitationToken}`;

      // Get property info for email
      const unit = Array.isArray(lease.pm_units) ? lease.pm_units[0] : lease.pm_units;
      const property = Array.isArray(lease.pm_properties) ? lease.pm_properties[0] : lease.pm_properties;
      const propertyAddress = unit?.unit_number
        ? `${property?.address}, Unit ${unit.unit_number}`
        : property?.address;

      // Get agent info
      const { data: agent } = await supabase
        .from("agents")
        .select("display_name, email")
        .eq("id", lease.agent_id)
        .single();

      const landlordName = agent?.display_name || "Your Property Manager";

      // Send email (code below)
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-top: 0;">Welcome to Your Tenant Portal</h1>

    <p>Hello ${tenantName},</p>

    <p>You've been invited to access your tenant portal for:</p>
    <p style="font-size: 18px; font-weight: bold; color: #1e40af; margin: 20px 0;">
      ${propertyAddress}
    </p>

    <p>Your tenant portal allows you to:</p>
    <ul style="margin: 20px 0;">
      <li>Pay rent online securely</li>
      <li>Submit maintenance requests</li>
      <li>View your lease agreement and documents</li>
      <li>Message ${landlordName} directly</li>
      <li>Track payment history</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}"
         style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Create Your Account
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      This invitation expires in 7 days. If you have any questions, please contact ${landlordName}.
    </p>

    <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      If you're having trouble clicking the button, copy and paste this link into your browser:<br>
      <span style="word-break: break-all;">${inviteUrl}</span>
    </p>
  </div>
</body>
</html>
      `;

      try {
        const { GHLClient } = await import("@/lib/integrations/ghl-client");
        const ghlClient = new GHLClient(ghlAccessToken, ghlLocationId);

        const { messageId } = await ghlClient.sendEmail({
          contactId: contactId,
          subject: `Welcome to Your Tenant Portal - ${propertyAddress}`,
          html: emailHtml,
        });

        console.log(`✅ Tenant invitation email resent to ${tenantEmail} via GHL (messageId: ${messageId})`);

        return NextResponse.json({
          success: true,
          message: "Tenant invitation resent successfully",
        });
      } catch (emailError) {
        console.error("❌ Failed to send tenant invitation email:", emailError);
        return NextResponse.json(
          { error: "Failed to send invitation email" },
          { status: 500 }
        );
      }
    }

    // Generate invitation token
    const invitationToken = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    // Try to create auth user, or use existing if creation fails
    let authUserId: string;
    let createdNewAuthUser = false;

    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: tenantEmail,
        email_confirm: true,
        user_metadata: {
          role: "tenant",
          name: tenantName,
          lease_id: lease_id,
        },
      });

      if (authError) {
        // Check if error is due to user already existing
        if (authError.message?.includes('already') || authError.message?.includes('duplicate') || authError.code === 'user_already_exists') {
          console.log(`ℹ️ Auth user already exists for ${tenantEmail}, looking up existing user`);

          // Find existing user by email
          const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
          const existingAuthUser = existingAuthUsers?.users?.find(u => u.email?.toLowerCase() === tenantEmail.toLowerCase());

          if (!existingAuthUser) {
            throw new Error(`Auth user exists but could not be found: ${authError.message}`);
          }

          // Check if this user is already a tenant for another lease
          const { data: otherTenantRecord } = await supabase
            .from("tenant_users")
            .select("lease_id")
            .eq("id", existingAuthUser.id)
            .maybeSingle();

          if (otherTenantRecord && otherTenantRecord.lease_id !== lease_id) {
            console.error(`❌ Auth user exists for email ${tenantEmail} but is already a tenant for a different lease`);
            return NextResponse.json(
              { error: "This email is already registered as a tenant for another property" },
              { status: 400 }
            );
          }

          authUserId = existingAuthUser.id;
          console.log(`✅ Using existing auth user: ${authUserId}`);
        } else {
          // Different error, throw it
          throw authError;
        }
      } else if (authUser.user) {
        authUserId = authUser.user.id;
        createdNewAuthUser = true;
        console.log(`✅ Created new auth user: ${authUserId}`);
      } else {
        throw new Error('Failed to create auth user: no user returned');
      }
    } catch (err) {
      console.error("Error with auth user:", err);
      return NextResponse.json(
        { error: "Failed to create or find tenant account" },
        { status: 500 }
      );
    }

    // Create tenant user record
    const { error: tenantError } = await supabase
      .from("tenant_users")
      .insert({
        id: authUserId,
        lease_id: lease_id,
        email: tenantEmail,
        phone: tenantPhone,
        invited_at: new Date().toISOString(),
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
      });

    if (tenantError) {
      console.error("Error creating tenant user:", tenantError);
      // Only rollback if we created a new auth user
      if (createdNewAuthUser) {
        await supabase.auth.admin.deleteUser(authUserId);
      }
      return NextResponse.json(
        { error: "Failed to create tenant record" },
        { status: 500 }
      );
    }

    // Create default notification preferences (ignore if already exists)
    await supabase
      .from("tenant_notification_preferences")
      .upsert({
        tenant_user_id: authUserId,
      }, {
        onConflict: "tenant_user_id",
        ignoreDuplicates: true,
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
      const { GHLClient } = await import("@/lib/integrations/ghl-client");
      const ghlClient = new GHLClient(ghlAccessToken, ghlLocationId);

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

      // Send email via GHL using the proper API
      const { messageId } = await ghlClient.sendEmail({
        contactId: contactId,
        subject: `Welcome to Your Tenant Portal - ${propertyAddress}`,
        html: emailHtml,
      });

      console.log(`✅ Tenant invitation email sent to ${tenantEmail} via GHL (messageId: ${messageId})`);
    } catch (emailError) {
      console.error("❌ Failed to send tenant invitation email:", emailError);
      // Log the URL for manual sending if email fails
      console.log(`📧 Invitation URL (manual fallback): ${inviteUrl}`);
      // Don't throw - we still want to return success if the account was created
    }

    return NextResponse.json({
      success: true,
      message: "Tenant invitation sent",
      tenant_user_id: authUserId,
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
