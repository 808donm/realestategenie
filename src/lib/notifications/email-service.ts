// Lazy initialize Resend client only when needed
let resendClient: any = null;

async function getResendClient(): Promise<any> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email');
    return null;
  }

  if (!resendClient) {
    // Dynamic import to prevent build-time initialization
    const { Resend } = await import('resend');
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

export interface CheckInConfirmationParams {
  to: string;
  attendeeName: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  propertyAddress: string;
  openHouseDate: string;
  openHouseTime: string;
  flyerUrl?: string;
}

export interface GreetingEmailParams {
  to: string;
  attendeeName: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  propertyAddress: string;
}

export async function sendCheckInConfirmation(params: CheckInConfirmationParams) {
  const resend = await getResendClient();

  if (!resend) {
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Open House <noreply@yourdomain.com>',
      to: params.to,
      subject: `Thank you for visiting ${params.propertyAddress}`,
      html: generateCheckInConfirmationHTML(params),
    });

    if (error) {
      console.error('Failed to send check-in confirmation email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending check-in confirmation:', error);
    throw error;
  }
}

export async function sendGreetingEmail(params: GreetingEmailParams) {
  const resend = await getResendClient();

  if (!resend) {
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Open House <noreply@yourdomain.com>',
      to: params.to,
      subject: `Great meeting you at ${params.propertyAddress}!`,
      html: generateGreetingEmailHTML(params),
    });

    if (error) {
      console.error('Failed to send greeting email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending greeting email:', error);
    throw error;
  }
}

function generateCheckInConfirmationHTML(params: CheckInConfirmationParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Visiting</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Thank You for Visiting!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${params.attendeeName},</p>

    <p style="font-size: 16px;">Thank you for attending the open house at:</p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #667eea;">${params.propertyAddress}</p>
      <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
        ${params.openHouseDate} • ${params.openHouseTime}
      </p>
    </div>

    <p style="font-size: 16px;">We appreciate your interest and hope you enjoyed viewing the property!</p>

    ${params.flyerUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.flyerUrl}" style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        📄 Download Property Flyer
      </a>
    </div>
    ` : ''}

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #667eea;">Your Agent</h3>
      <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">${params.agentName}</p>
      <p style="margin: 5px 0; color: #666;">
        📧 <a href="mailto:${params.agentEmail}" style="color: #667eea; text-decoration: none;">${params.agentEmail}</a>
      </p>
      <p style="margin: 5px 0; color: #666;">
        📱 <a href="tel:${params.agentPhone}" style="color: #667eea; text-decoration: none;">${params.agentPhone}</a>
      </p>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you have any questions or would like to schedule a private showing, please don't hesitate to reach out!
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>This email was sent because you checked in at an open house.</p>
  </div>
</body>
</html>
  `;
}

function generateGreetingEmailHTML(params: GreetingEmailParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Great Meeting You!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Great Meeting You!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${params.attendeeName},</p>

    <p style="font-size: 16px;">It was wonderful meeting you at the open house for:</p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #11998e; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #11998e;">${params.propertyAddress}</p>
    </div>

    <p style="font-size: 16px;">I'll be following up with you within the next 24 hours to answer any questions you might have and discuss next steps!</p>

    <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 16px;">
        <strong>In the meantime, feel free to reach out:</strong>
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #11998e;">Contact Me</h3>
      <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">${params.agentName}</p>
      <p style="margin: 5px 0; color: #666;">
        📧 <a href="mailto:${params.agentEmail}" style="color: #11998e; text-decoration: none;">${params.agentEmail}</a>
      </p>
      <p style="margin: 5px 0; color: #666;">
        📱 <a href="tel:${params.agentPhone}" style="color: #11998e; text-decoration: none;">${params.agentPhone}</a>
      </p>
    </div>

    <p style="font-size: 16px; margin-top: 30px; font-style: italic; color: #666;">
      "I'm here to help you find the perfect home. Let's make it happen together!"
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>This email was sent because you requested to be contacted by the agent.</p>
  </div>
</body>
</html>
  `;
}
