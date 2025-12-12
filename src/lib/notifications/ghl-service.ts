/**
 * GHL Notification Service
 * Sends emails and SMS through GoHighLevel API
 */

export interface GHLEmailParams {
  locationId: string;
  accessToken: string;
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface GHLSMSParams {
  locationId: string;
  accessToken: string;
  to: string;
  message: string;
}

/**
 * Send email via GHL
 */
export async function sendGHLEmail(params: GHLEmailParams) {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/conversations/messages/email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          locationId: params.locationId,
          email: params.to,
          subject: params.subject,
          html: params.html,
          from: params.from,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GHL email send failed:', error);
      throw new Error(`GHL email failed: ${error}`);
    }

    const data = await response.json();
    console.log('GHL email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending GHL email:', error);
    throw error;
  }
}

/**
 * Send SMS via GHL
 */
export async function sendGHLSMS(params: GHLSMSParams) {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/conversations/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          type: 'SMS',
          locationId: params.locationId,
          contactId: params.to, // This should be a GHL contact ID
          message: params.message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GHL SMS send failed:', error);
      throw new Error(`GHL SMS failed: ${error}`);
    }

    const data = await response.json();
    console.log('GHL SMS sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending GHL SMS:', error);
    throw error;
  }
}

/**
 * Create or update contact in GHL
 * Required before sending SMS since GHL uses contact IDs
 */
export async function createOrUpdateGHLContact(params: {
  locationId: string;
  accessToken: string;
  email: string;
  phone: string;
  firstName: string;
  lastName?: string;
}) {
  try {
    // First, search for existing contact
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${params.locationId}&email=${encodeURIComponent(params.email)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.contact) {
        console.log('Found existing GHL contact:', searchData.contact.id);
        return searchData.contact;
      }
    }

    // Create new contact if not found
    const createResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          locationId: params.locationId,
          email: params.email,
          phone: params.phone,
          firstName: params.firstName,
          lastName: params.lastName || '',
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('GHL contact creation failed:', error);
      throw new Error(`GHL contact creation failed: ${error}`);
    }

    const contactData = await createResponse.json();
    console.log('Created new GHL contact:', contactData.contact.id);
    return contactData.contact;
  } catch (error) {
    console.error('Error creating/updating GHL contact:', error);
    throw error;
  }
}
