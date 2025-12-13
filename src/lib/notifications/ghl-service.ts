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
  source?: string;
  tags?: string[];
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

        // Update existing contact with new tags if provided
        if (params.tags && params.tags.length > 0) {
          await addGHLTags({
            contactId: searchData.contact.id,
            locationId: params.locationId,
            accessToken: params.accessToken,
            tags: params.tags,
          });
        }

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
          source: params.source || 'Open House',
          tags: params.tags || [],
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('GHL contact creation failed:', errorText);

      // If duplicate contact error, extract the existing contact ID from the error
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.statusCode === 400 && errorData.message?.includes('duplicated contacts')) {
          const existingContactId = errorData.meta?.contactId;
          if (existingContactId) {
            console.log('Contact already exists, using existing contact ID:', existingContactId);

            // Add tags to existing contact if provided
            if (params.tags && params.tags.length > 0) {
              await addGHLTags({
                contactId: existingContactId,
                locationId: params.locationId,
                accessToken: params.accessToken,
                tags: params.tags,
              });
            }

            // Return the existing contact
            return { id: existingContactId };
          }
        }
      } catch (parseError) {
        // If we can't parse the error, continue with the original error
      }

      throw new Error(`GHL contact creation failed: ${errorText}`);
    }

    const contactData = await createResponse.json();
    console.log('Created new GHL contact:', contactData.contact.id);
    return contactData.contact;
  } catch (error) {
    console.error('Error creating/updating GHL contact:', error);
    throw error;
  }
}

/**
 * Add tags to a GHL contact
 */
export async function addGHLTags(params: {
  contactId: string;
  locationId: string;
  accessToken: string;
  tags: string[];
}) {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/${params.contactId}/tags`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          tags: params.tags,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GHL add tags failed:', error);
      throw new Error(`GHL add tags failed: ${error}`);
    }

    const data = await response.json();
    console.log('Added tags to GHL contact:', params.tags);
    return data;
  } catch (error) {
    console.error('Error adding GHL tags:', error);
    throw error;
  }
}

/**
 * Get pipelines for a location
 */
export async function getGHLPipelines(params: {
  locationId: string;
  accessToken: string;
}) {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${params.locationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GHL get pipelines failed:', error);
      throw new Error(`GHL get pipelines failed: ${error}`);
    }

    const data = await response.json();
    return data.pipelines || [];
  } catch (error) {
    console.error('Error getting GHL pipelines:', error);
    throw error;
  }
}

/**
 * Create an opportunity in GHL pipeline
 */
export async function createGHLOpportunity(params: {
  locationId: string;
  accessToken: string;
  contactId: string;
  pipelineId: string;
  pipelineStageId: string;
  name: string;
  status?: 'open' | 'won' | 'lost' | 'abandoned';
  monetaryValue?: number;
  source?: string;
}) {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          locationId: params.locationId,
          contactId: params.contactId,
          pipelineId: params.pipelineId,
          pipelineStageId: params.pipelineStageId,
          name: params.name,
          status: params.status || 'open',
          monetaryValue: params.monetaryValue,
          source: params.source || 'Open House',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GHL opportunity creation failed:', error);
      throw new Error(`GHL opportunity creation failed: ${error}`);
    }

    const data = await response.json();
    console.log('Created GHL opportunity:', data.opportunity?.id);
    return data.opportunity;
  } catch (error) {
    console.error('Error creating GHL opportunity:', error);
    throw error;
  }
}
