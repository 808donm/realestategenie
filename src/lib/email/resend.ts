import { Resend } from "resend";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendInvitationEmailParams {
  to: string;
  invitationUrl: string;
  invitedBy: string;
  expiresAt: Date;
}

export async function sendInvitationEmail(params: SendInvitationEmailParams) {
  const { to, invitationUrl, invitedBy, expiresAt } = params;

  // Format expiration date
  const expirationDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const { data, error } = await resend.emails.send({
      from: "Real Estate Genie <noreply@realestategenie.app>",
      to: [to],
      subject: "You've been invited to Real Estate Genie",
      html: getInvitationEmailHtml({
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
