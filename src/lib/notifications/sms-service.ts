import twilio from 'twilio';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export interface CheckInSMSParams {
  to: string;
  attendeeName: string;
  agentName: string;
  agentPhone: string;
  propertyAddress: string;
}

export interface GreetingSMSParams {
  to: string;
  attendeeName: string;
  agentName: string;
  propertyAddress: string;
}

export async function sendCheckInSMS(params: CheckInSMSParams) {
  if (!twilioClient) {
    console.warn('Twilio not configured, skipping SMS');
    return null;
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.warn('TWILIO_PHONE_NUMBER not set, skipping SMS');
    return null;
  }

  try {
    const message = `Hi ${params.attendeeName}! Thanks for visiting ${params.propertyAddress}. If you have questions, contact ${params.agentName} at ${params.agentPhone}. Reply STOP to opt out.`;

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: params.to,
    });

    return result;
  } catch (error) {
    console.error('Error sending check-in SMS:', error);
    throw error;
  }
}

export async function sendGreetingSMS(params: GreetingSMSParams) {
  if (!twilioClient) {
    console.warn('Twilio not configured, skipping SMS');
    return null;
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.warn('TWILIO_PHONE_NUMBER not set, skipping SMS');
    return null;
  }

  try {
    const message = `Hi ${params.attendeeName}! Great meeting you at ${params.propertyAddress}. I'll follow up within 24 hours. Looking forward to helping you! - ${params.agentName}. Reply STOP to opt out.`;

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: params.to,
    });

    return result;
  } catch (error) {
    console.error('Error sending greeting SMS:', error);
    throw error;
  }
}
