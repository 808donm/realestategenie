// Lazy initialize Resend client only when needed
let resendClient: any = null;

async function getResendClient(): Promise<any> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured. Add it to your environment variables.");
  }

  if (!resendClient) {
    // Dynamic import to prevent build-time initialization
    const { Resend } = await import("resend");
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

export interface SendInvitationEmailParams {
  to: string;
  invitationUrl: string;
  invitedBy: string;
  expiresAt: Date;
}

export interface SendVerificationCodeParams {
  to: string;
  code: string;
  expiresInMinutes: number;
}

export interface SendTenantInvitationParams {
  to: string;
  tenantName: string;
  landlordName: string;
  propertyAddress: string;
  leaseStartDate: string;
  monthlyRent: number;
  inviteUrl: string;
  expiresAt: Date;
}

export interface SendOpenHouseEmailParams {
  to: string;
  name: string;
  propertyAddress: string;
  flyerUrl: string;
  isReturnVisit?: boolean;
  visitCount?: number;
}

export interface SendAccessRequestNotificationParams {
  to: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  company?: string;
  message?: string;
  requestId: string;
}

export async function sendInvitationEmail(params: SendInvitationEmailParams) {
  const { to, invitationUrl, invitedBy, expiresAt } = params;

  // Get Resend client (will throw if API key not configured)
  const resend = await getResendClient();

  // Format expiration date
  const expirationDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const { data, error } = await resend.emails.send({
      from: "Real Estate Genie <support@realestategenie.app>",
      to: [to],
      subject: "You've been invited to Real Estate Genie",
      html: getInvitationEmailHtml({
        invitationUrl,
        invitedBy,
        expirationDate,
      }),
      text: getInvitationEmailText({
        invitationUrl,
        invitedBy,
        expirationDate,
      }),
    });

    if (error) {
      console.error("Resend email error:", error);
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }

    console.log("Invitation email sent successfully:", data?.id);
    return data;
  } catch (error: any) {
    console.error("Failed to send invitation email:", error);
    throw error;
  }
}

export async function sendVerificationCode(params: SendVerificationCodeParams) {
  const { to, code, expiresInMinutes } = params;

  // Get Resend client (will throw if API key not configured)
  const resend = await getResendClient();

  try {
    const { data, error } = await resend.emails.send({
      from: "Real Estate Genie <support@realestategenie.app>",
      to: [to],
      subject: "Verify your email - Real Estate Genie",
      html: getVerificationEmailHtml({ code, expiresInMinutes }),
      text: getVerificationEmailText({ code, expiresInMinutes }),
    });

    if (error) {
      console.error("Resend verification code error:", error);
      throw new Error(`Failed to send verification code: ${error.message}`);
    }

    console.log("Verification code sent successfully:", data?.id);
    return data;
  } catch (error: any) {
    console.error("Failed to send verification code:", error);
    throw error;
  }
}

export async function sendTenantInvitationEmail(params: SendTenantInvitationParams) {
  const { to, tenantName, landlordName, propertyAddress, leaseStartDate, monthlyRent, inviteUrl, expiresAt } = params;

  // Get Resend client (will throw if API key not configured)
  const resend = await getResendClient();

  // Format expiration date
  const expirationDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const { data, error } = await resend.emails.send({
      from: "Real Estate Genie <support@realestategenie.app>",
      to: [to],
      subject: `Welcome to Your Tenant Portal - ${propertyAddress}`,
      html: getTenantInvitationEmailHtml({
        tenantName,
        landlordName,
        propertyAddress,
        leaseStartDate,
        monthlyRent,
        inviteUrl,
        expirationDate,
      }),
      text: getTenantInvitationEmailText({
        tenantName,
        landlordName,
        propertyAddress,
        leaseStartDate,
        monthlyRent,
        inviteUrl,
        expirationDate,
      }),
    });

    if (error) {
      console.error("Resend tenant invitation error:", error);
      throw new Error(`Failed to send tenant invitation email: ${error.message}`);
    }

    console.log("Tenant invitation email sent successfully:", data?.id);
    return data;
  } catch (error: any) {
    console.error("Failed to send tenant invitation email:", error);
    throw error;
  }
}

export async function sendOpenHouseEmail(params: SendOpenHouseEmailParams) {
  const { to, name, propertyAddress, flyerUrl, isReturnVisit, visitCount } = params;

  // Get Resend client (will throw if API key not configured)
  const resend = await getResendClient();

  const subject = isReturnVisit
    ? `🔥 Welcome Back! ${propertyAddress}`
    : `Thank You for Visiting ${propertyAddress}`;

  try {
    const { data, error } = await resend.emails.send({
      from: "Real Estate Genie <support@realestategenie.app>",
      to: [to],
      subject,
      html: isReturnVisit
        ? getReturnVisitEmailHtml({ name, propertyAddress, flyerUrl, visitCount: visitCount || 2 })
        : getFirstVisitEmailHtml({ name, propertyAddress, flyerUrl }),
      text: isReturnVisit
        ? getReturnVisitEmailText({ name, propertyAddress, flyerUrl, visitCount: visitCount || 2 })
        : getFirstVisitEmailText({ name, propertyAddress, flyerUrl }),
    });

    if (error) {
      console.error("Resend open house email error:", error);
      throw new Error(`Failed to send open house email: ${error.message}`);
    }

    console.log("Open house email sent successfully via Resend:", data?.id);
    return data;
  } catch (error: any) {
    console.error("Failed to send open house email via Resend:", error);
    throw error;
  }
}

export async function sendAccessRequestNotification(params: SendAccessRequestNotificationParams) {
  const { to, applicantName, applicantEmail, applicantPhone, company, message, requestId } = params;

  // Get Resend client (will throw if API key not configured)
  const resend = await getResendClient();

  try {
    const { data, error } = await resend.emails.send({
      from: "Real Estate Genie <support@realestategenie.app>",
      to: [to],
      subject: `🎯 New Access Request from ${applicantName}`,
      html: getAccessRequestNotificationHtml({
        applicantName,
        applicantEmail,
        applicantPhone,
        company,
        message,
        requestId,
      }),
      text: getAccessRequestNotificationText({
        applicantName,
        applicantEmail,
        applicantPhone,
        company,
        message,
        requestId,
      }),
    });

    if (error) {
      console.error("Resend access request notification error:", error);
      throw new Error(`Failed to send access request notification: ${error.message}`);
    }

    console.log("Access request notification sent successfully:", data?.id);
    return data;
  } catch (error: any) {
    console.error("Failed to send access request notification:", error);
    throw error;
  }
}

function getVerificationEmailHtml({
  code,
  expiresInMinutes,
}: {
  code: string;
  expiresInMinutes: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">
                The Real Estate Genie<sup style="font-size: 14px;">™</sup>
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Verify Your Email
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi there! 👋
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                To complete your registration, please enter this verification code:
              </p>

              <!-- Verification Code -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <div style="display: inline-block; padding: 20px 40px; background: #f3f4f6; border-radius: 8px; border: 2px dashed #9ca3af;">
                      <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1f2937; font-family: monospace;">
                        ${code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                      ⏱️ <strong>This code expires in ${expiresInMinutes} minutes.</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Manage your open houses and leads like a pro.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getInvitationEmailHtml({
  invitationUrl,
  invitedBy,
  expirationDate,
}: {
  invitationUrl: string;
  invitedBy: string;
  expirationDate: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Real Estate Genie</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">
                The Real Estate Genie<sup style="font-size: 14px;">™</sup>
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                You've Been Invited!
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi there! 👋
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                <strong>${invitedBy}</strong> has invited you to join <strong>Real Estate Genie</strong>,
                the powerful platform for managing open houses and capturing leads.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                Click the button below to create your account and get started:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${invitationUrl}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f3f4f6; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563; font-family: monospace;">
                ${invitationUrl}
              </p>

              <!-- Expiration Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                      ⚠️ <strong>This invitation expires on ${expirationDate}.</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Manage your open houses and leads like a pro.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getVerificationEmailText({
  code,
  expiresInMinutes,
}: {
  code: string;
  expiresInMinutes: number;
}) {
  return `
The Real Estate Genie
Verify Your Email

Hi there!

To complete your registration, please enter this verification code:

${code}

This code expires in ${expiresInMinutes} minutes.

If you didn't request this code, you can safely ignore this email.

© ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
Manage your open houses and leads like a pro.
  `.trim();
}

function getInvitationEmailText({
  invitationUrl,
  invitedBy,
  expirationDate,
}: {
  invitationUrl: string;
  invitedBy: string;
  expirationDate: string;
}) {
  return `
The Real Estate Genie
You've Been Invited!

Hi there!

${invitedBy} has invited you to join Real Estate Genie, the powerful platform for managing open houses and capturing leads.

Click the link below to create your account and get started:

${invitationUrl}

This invitation expires on ${expirationDate}.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
Manage your open houses and leads like a pro.
  `.trim();
}

function getTenantInvitationEmailHtml({
  tenantName,
  landlordName,
  propertyAddress,
  leaseStartDate,
  monthlyRent,
  inviteUrl,
  expirationDate,
}: {
  tenantName: string;
  landlordName: string;
  propertyAddress: string;
  leaseStartDate: string;
  monthlyRent: number;
  inviteUrl: string;
  expirationDate: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Your Tenant Portal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">
                🏡 Welcome to Your New Home!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Your Tenant Portal is Ready
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi ${tenantName},
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Congratulations on your new lease! We're excited to have you as a tenant.
              </p>

              <!-- Property Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px; color: #667eea; font-size: 18px;">📍 Your Property</h3>
                    <p style="margin: 0 0 10px; font-size: 16px; font-weight: bold; color: #1f2937;">
                      ${propertyAddress}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      <strong>Lease Start:</strong> ${leaseStartDate}<br>
                      <strong>Monthly Rent:</strong> $${monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>
                      <strong>Property Manager:</strong> ${landlordName}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Your tenant portal is now ready! Click the button below to set up your password and access your account:
              </p>

              <!-- Features List -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="padding: 15px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                    <p style="margin: 0; font-size: 15px; color: #065f46;">
                      ✅ Pay rent online<br>
                      ✅ View your lease agreement<br>
                      ✅ Submit maintenance requests<br>
                      ✅ Message your property manager<br>
                      ✅ Track payment history
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${inviteUrl}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Set Up Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f3f4f6; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563; font-family: monospace;">
                ${inviteUrl}
              </p>

              <!-- Expiration Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                      ⚠️ <strong>This invitation expires on ${expirationDate}.</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Questions? Contact your property manager, ${landlordName}, for assistance.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Modern property management made simple.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getTenantInvitationEmailText({
  tenantName,
  landlordName,
  propertyAddress,
  leaseStartDate,
  monthlyRent,
  inviteUrl,
  expirationDate,
}: {
  tenantName: string;
  landlordName: string;
  propertyAddress: string;
  leaseStartDate: string;
  monthlyRent: number;
  inviteUrl: string;
  expirationDate: string;
}) {
  return `
The Real Estate Genie
Welcome to Your New Home!

Hi ${tenantName},

Congratulations on your new lease! We're excited to have you as a tenant.

YOUR PROPERTY
${propertyAddress}
Lease Start: ${leaseStartDate}
Monthly Rent: $${monthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Property Manager: ${landlordName}

Your tenant portal is now ready! Click the link below to set up your password and access your account:

${inviteUrl}

WITH YOUR TENANT PORTAL, YOU CAN:
✅ Pay rent online
✅ View your lease agreement
✅ Submit maintenance requests
✅ Message your property manager
✅ Track payment history

This invitation expires on ${expirationDate}.

Questions? Contact your property manager, ${landlordName}, for assistance.

© ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
Modern property management made simple.
  `.trim();
}

function getFirstVisitEmailHtml({
  name,
  propertyAddress,
  flyerUrl,
}: {
  name: string;
  propertyAddress: string;
  flyerUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Visiting</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">
                Thank You for Visiting!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                ${propertyAddress}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi ${name},
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Thank you for visiting our open house today at <strong>${propertyAddress}</strong>! We hope you enjoyed touring the property.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                Download the property information sheet to review all the details:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${flyerUrl}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                      📄 Download Property Fact Sheet
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                If you have any questions or would like to schedule a private showing, please don't hesitate to reach out. We'd love to help you find your dream home!
              </p>

              <p style="margin: 20px 0 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Best regards,<br>
                <strong>Your Real Estate Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getFirstVisitEmailText({
  name,
  propertyAddress,
  flyerUrl,
}: {
  name: string;
  propertyAddress: string;
  flyerUrl: string;
}) {
  return `
Thank You for Visiting!
${propertyAddress}

Hi ${name},

Thank you for visiting our open house today at ${propertyAddress}! We hope you enjoyed touring the property.

Download the property information sheet to review all the details:
${flyerUrl}

If you have any questions or would like to schedule a private showing, please don't hesitate to reach out. We'd love to help you find your dream home!

Best regards,
Your Real Estate Team

© ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
  `.trim();
}

function getReturnVisitEmailHtml({
  name,
  propertyAddress,
  flyerUrl,
  visitCount,
}: {
  name: string;
  propertyAddress: string;
  flyerUrl: string;
  visitCount: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome Back!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- RED HOT Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800;">
                🔥 Welcome Back! 🔥
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 600;">
                ${propertyAddress}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi ${name},
              </p>

              <!-- Hot Lead Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border-left: 4px solid #f59e0b; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 16px; color: #92400e; font-weight: 600;">
                      🔥 We noticed this is your ${visitCount === 2 ? '2nd' : visitCount === 3 ? '3rd' : visitCount + 'th'} visit today to ${propertyAddress}! We're excited about your interest in this property.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                Your enthusiasm tells us you're seriously considering making this your new home. We'd love to help make that happen!
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                Here's the property information sheet for your review:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${flyerUrl}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.4);">
                      📄 Download Property Fact Sheet
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; font-size: 16px; color: #065f46; font-weight: 600;">
                      Ready to take the next step?
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #065f46;">
                      ✅ Schedule a private showing<br>
                      ✅ Discuss financing options<br>
                      ✅ Submit an offer<br>
                      ✅ Get answers to any questions
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.6; color: #374151;">
                We're here to help and will be reaching out shortly. Feel free to contact us anytime!
              </p>

              <p style="margin: 20px 0 0; font-size: 16px; line-height: 1.6; color: #374151;">
                Best regards,<br>
                <strong>Your Real Estate Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getReturnVisitEmailText({
  name,
  propertyAddress,
  flyerUrl,
  visitCount,
}: {
  name: string;
  propertyAddress: string;
  flyerUrl: string;
  visitCount: number;
}) {
  return `
🔥 Welcome Back! 🔥
${propertyAddress}

Hi ${name},

We noticed this is your ${visitCount === 2 ? '2nd' : visitCount === 3 ? '3rd' : visitCount + 'th'} visit today to ${propertyAddress}! We're excited about your interest in this property.

Your enthusiasm tells us you're seriously considering making this your new home. We'd love to help make that happen!

Download the property information sheet:
${flyerUrl}

READY TO TAKE THE NEXT STEP?
✅ Schedule a private showing
✅ Discuss financing options
✅ Submit an offer
✅ Get answers to any questions

We're here to help and will be reaching out shortly. Feel free to contact us anytime!

Best regards,
Your Real Estate Team

© ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
  `.trim();
}

function getAccessRequestNotificationHtml({
  applicantName,
  applicantEmail,
  applicantPhone,
  company,
  message,
  requestId,
}: {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  company?: string;
  message?: string;
  requestId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://realestategenie.app";
  const reviewUrl = `${appUrl}/app/admin/access-requests`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Access Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">
                🎯 New Access Request
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Someone wants to join Real Estate Genie
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #374151;">
                A new user has submitted an access request. Here are their details:
              </p>

              <!-- Applicant Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px; color: #667eea; font-size: 18px;">Applicant Information</h3>
                    <p style="margin: 0 0 10px; font-size: 15px; color: #1f2937;">
                      <strong>Name:</strong> ${applicantName}
                    </p>
                    <p style="margin: 0 0 10px; font-size: 15px; color: #1f2937;">
                      <strong>Email:</strong> <a href="mailto:${applicantEmail}" style="color: #667eea; text-decoration: none;">${applicantEmail}</a>
                    </p>
                    <p style="margin: 0 0 10px; font-size: 15px; color: #1f2937;">
                      <strong>Phone:</strong> <a href="tel:${applicantPhone}" style="color: #667eea; text-decoration: none;">${applicantPhone}</a>
                    </p>
                    ${company ? `<p style="margin: 0 0 10px; font-size: 15px; color: #1f2937;">
                      <strong>Company:</strong> ${company}
                    </p>` : ''}
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">
                      <strong>Request ID:</strong> ${requestId}
                    </p>
                  </td>
                </tr>
              </table>

              ${message ? `
              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px; color: #065f46; font-size: 16px;">Their Message:</h3>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #065f46; white-space: pre-wrap;">
                      ${message}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${reviewUrl}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Review Application
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <span style="font-family: monospace; font-size: 12px;">${reviewUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getAccessRequestNotificationText({
  applicantName,
  applicantEmail,
  applicantPhone,
  company,
  message,
  requestId,
}: {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  company?: string;
  message?: string;
  requestId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://realestategenie.app";
  const reviewUrl = `${appUrl}/app/admin/access-requests`;

  return `
🎯 NEW ACCESS REQUEST

A new user has submitted an access request.

APPLICANT INFORMATION:
Name: ${applicantName}
Email: ${applicantEmail}
Phone: ${applicantPhone}
${company ? `Company: ${company}\n` : ''}Request ID: ${requestId}

${message ? `THEIR MESSAGE:\n${message}\n\n` : ''}Review and approve this application:
${reviewUrl}

© ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
  `.trim();
}


// Payment Link Email

export interface SendPaymentLinkParams {
  to: string;
  name: string;
  planName: string;
  monthlyPrice: number;
  paymentUrl: string;
  planDetails: {
    maxAgents: number;
    maxProperties: number;
    maxTenants: number;
  };
}

export async function sendPaymentLinkEmail(params: SendPaymentLinkParams) {
  const { to, name, planName, monthlyPrice, paymentUrl, planDetails } = params;

  const resend = await getResendClient();

  const { data, error } = await resend.emails.send({
    from: "Real Estate Genie <support@realestategenie.app>",
    to: [to],
    subject: `Complete Your Subscription - ${planName} Plan`,
    html: getPaymentLinkHtml({ name, planName, monthlyPrice, paymentUrl, planDetails }),
    text: getPaymentLinkText({ name, planName, monthlyPrice, paymentUrl, planDetails }),
  });

  if (error) {
    console.error("Failed to send payment link email:", error);
    throw error;
  }

  console.log("Payment link email sent successfully:", data);
  return data;
}

function getPaymentLinkHtml({
  name,
  planName,
  monthlyPrice,
  paymentUrl,
  planDetails,
}: {
  name: string;
  planName: string;
  monthlyPrice: number;
  paymentUrl: string;
  planDetails: {
    maxAgents: number;
    maxProperties: number;
    maxTenants: number;
  };
}) {
  const isUnlimited = planDetails.maxAgents === 999999;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Subscription</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">Welcome to Real Estate Genie!</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Complete your subscription to get started</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">Hi ${name},</p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                You've been approved to join Real Estate Genie! Complete your payment to activate your account and start using the platform.
              </p>

              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-radius: 12px; padding: 24px; margin: 30px 0;">
                <h2 style="margin: 0 0 16px; font-size: 24px; color: #0c4a6e; font-weight: 700;">${planName}</h2>
                <p style="margin: 0 0 20px; font-size: 32px; color: #0369a1; font-weight: 800;">
                  $${monthlyPrice}<span style="font-size: 18px; font-weight: 400; color: #64748b;">/month</span>
                </p>

                <div style="border-top: 1px solid #bae6fd; padding-top: 16px; margin-top: 16px;">
                  <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #0c4a6e;">Plan includes:</p>
                  ${isUnlimited ? `
                    <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">✓ <strong>Unlimited</strong> team members</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">✓ <strong>Unlimited</strong> properties</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">✓ <strong>Unlimited</strong> tenants</p>
                  ` : `
                    <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">✓ Up to <strong>${planDetails.maxAgents}</strong> team members</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">✓ Up to <strong>${planDetails.maxProperties}</strong> properties</p>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">✓ Up to <strong>${planDetails.maxTenants}</strong> tenants</p>
                  `}
                  <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">✓ Open house management</p>
                  <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">✓ Lead tracking & scoring</p>
                  <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">✓ GHL integration</p>
                  <p style="margin: 0; font-size: 14px; color: #475569;">✓ Priority support</p>
                </div>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                      Complete Payment
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <span style="font-family: monospace; font-size: 12px; color: #3b82f6;">${paymentUrl}</span>
              </p>

              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0 20px;">
                <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #065f46;">What happens next:</p>
                <p style="margin: 0 0 8px; font-size: 14px; color: #047857;">1. Complete your payment securely via Stripe</p>
                <p style="margin: 0 0 8px; font-size: 14px; color: #047857;">2. Receive your account invitation email</p>
                <p style="margin: 0 0 8px; font-size: 14px; color: #047857;">3. Set up your account and password</p>
                <p style="margin: 0; font-size: 14px; color: #047857;">4. Start managing your properties!</p>
              </div>

              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                Have questions? Reply to this email or contact us at <a href="mailto:support@realestategenie.app" style="color: #3b82f6; text-decoration: none;">support@realestategenie.app</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getPaymentLinkText({
  name,
  planName,
  monthlyPrice,
  paymentUrl,
  planDetails,
}: {
  name: string;
  planName: string;
  monthlyPrice: number;
  paymentUrl: string;
  planDetails: {
    maxAgents: number;
    maxProperties: number;
    maxTenants: number;
  };
}) {
  const isUnlimited = planDetails.maxAgents === 999999;

  return `
Welcome to Real Estate Genie!

Hi ${name},

You've been approved to join Real Estate Genie! Complete your payment to activate your account and start using the platform.

YOUR PLAN: ${planName}
Price: $${monthlyPrice}/month

Plan includes:
${isUnlimited ? `
- Unlimited team members
- Unlimited properties
- Unlimited tenants
` : `
- Up to ${planDetails.maxAgents} team members
- Up to ${planDetails.maxProperties} properties
- Up to ${planDetails.maxTenants} tenants
`}
- Open house management
- Lead tracking & scoring
- GHL integration
- Priority support

COMPLETE YOUR PAYMENT:
${paymentUrl}

WHAT HAPPENS NEXT:
1. Complete your payment securely via Stripe
2. Receive your account invitation email
3. Set up your account and password
4. Start managing your properties!

Have questions? Reply to this email or contact us at support@realestategenie.app

© ${new Date().getFullYear()} Real Estate Genie. All rights reserved.
  `.trim();
}
