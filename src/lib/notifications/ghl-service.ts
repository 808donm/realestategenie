/**
 * GHL Notification Service
 * Sends emails and SMS through GoHighLevel API
 */

/**
 * Create OpenHouse custom object and link contact to it
 * This creates the proper relational structure in GHL for workflows to access
 */
export async function createGHLOpenHouseRecord(params: {
  locationId: string;
  accessToken: string;
  eventId: string;
  address: string;
  startDateTime: string;
  endDateTime: string;
  flyerUrl: string;
  agentId: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  price?: number;
}) {
  try {
    const startedAt = Date.now();
    console.log('[GHL] Creating OpenHouse custom object...');
    console.log('[GHL] OpenHouse request started at:', new Date(startedAt).toISOString());
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[GHL] OpenHouse aborting request after 20 seconds');
      controller.abort();
    }, 20000);

    // Create OpenHouse custom object (using correct GHL API structure)
    let openHouseResponse: Response;
    try {
      openHouseResponse = await fetch(
        `https://services.leadconnectorhq.com/objects/custom_objects.openhouses/records?locationId=${params.locationId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
          body: JSON.stringify({
            locationId: params.locationId,
            properties: {
              "custom_objects.openhouses.openhouseid": params.eventId,
              "custom_objects.openhouses.address": params.address,
              "custom_objects.openhouses.startdatetime": params.startDateTime,
              "custom_objects.openhouses.enddatetime": params.endDateTime,
              "custom_objects.openhouses.flyerurl": params.flyerUrl,
              "custom_objects.openhouses.agentid": params.agentId,
              "custom_objects.openhouses.locationid": params.locationId,
              "custom_objects.openhouses.beds": params.beds?.toString() || '',
              "custom_objects.openhouses.baths": params.baths?.toString() || '',
              "custom_objects.openhouses.sqft": params.sqft?.toString() || '',
              "custom_objects.openhouses.price": params.price?.toString() || '',
            },
          }),
          signal: controller.signal,
        }
      );
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        console.error('[GHL] OpenHouse creation timed out after 20 seconds');
        throw new Error('GHL_TIMEOUT: OpenHouse request exceeded 20 seconds');
      }
      console.error('[GHL] OpenHouse request failed:', error.message);
      throw error;
    }

    clearTimeout(timeoutId);
    console.log('[GHL] OpenHouse response status:', openHouseResponse.status);
    console.log('[GHL] OpenHouse response time (ms):', Date.now() - startedAt);

    if (!openHouseResponse.ok) {
      const error = await openHouseResponse.text();
      console.error('[GHL] OpenHouse creation failed:', error);
      throw new Error(`Failed to create OpenHouse: ${error}`);
    }

    const openHouseData = await openHouseResponse.json();
    const openHouseRecordId = openHouseData.id;
    console.log('[GHL] OpenHouse created:', openHouseRecordId);

    return openHouseRecordId;
  } catch (error: any) {
    console.error('[GHL] Error creating OpenHouse:', error);
    throw error;
  }
}

export async function createGHLRegistrationRecord(params: {
  locationId: string;
  accessToken: string;
  eventId: string;
  contactId: string;
  openHouseRecordId: string;
}) {
  try {
    console.log('[GHL] Creating Registration to link contact to OpenHouse...');
    const registrationResponse = await fetch(
      `https://services.leadconnectorhq.com/objects/custom_objects.registrations/records?locationId=${params.locationId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          locationId: params.locationId,
          properties: {
            "custom_objects.registrations.registrationid": `reg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            "custom_objects.registrations.contactid": params.contactId,
            "custom_objects.registrations.openhouseid": params.eventId,
            "custom_objects.registrations.registerdat": new Date().toISOString(),
            "custom_objects.registrations.flyerstatus": 'pending',
          },
          relationships: [
            {
              relatedObjectId: params.contactId,
              relationType: 'contact',
            },
            {
              relatedObjectId: params.openHouseRecordId,
              relationType: 'custom_objects.openhouses',
            },
          ],
        }),
      }
    );

    if (!registrationResponse.ok) {
      const error = await registrationResponse.text();
      console.error('[GHL] Registration creation failed:', error);
      throw new Error(`Failed to create Registration: ${error}`);
    }

    const registrationData = await registrationResponse.json();
    const registrationRecordId = registrationData?.id;
    console.log('[GHL] Registration created:', registrationRecordId);
    return registrationRecordId;
  } catch (error: any) {
    console.error('[GHL] Error creating Registration:', error);
    throw error;
  }
}

export async function createGHLOpenHouseAndLinkContact(params: {
  locationId: string;
  accessToken: string;
  eventId: string;
  address: string;
  startDateTime: string;
  endDateTime: string;
  flyerUrl: string;
  agentId: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  price?: number;
  contactId: string;
}) {
  const openHouseRecordId = await createGHLOpenHouseRecord({
    locationId: params.locationId,
    accessToken: params.accessToken,
    eventId: params.eventId,
    address: params.address,
    startDateTime: params.startDateTime,
    endDateTime: params.endDateTime,
    flyerUrl: params.flyerUrl,
    agentId: params.agentId,
    beds: params.beds,
    baths: params.baths,
    sqft: params.sqft,
    price: params.price,
  });

  const registrationId = await createGHLRegistrationRecord({
    locationId: params.locationId,
    accessToken: params.accessToken,
    eventId: params.eventId,
    contactId: params.contactId,
    openHouseRecordId,
  });

  return { openHouseId: openHouseRecordId, contactId: params.contactId, registrationId };
}

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
 * Uses the conversations/messages API with type=Email
 */
export async function sendGHLEmail(params: GHLEmailParams) {
  try {
    console.log('[GHL] Attempting to send email to:', params.to);

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
          type: 'Email',
          locationId: params.locationId,
          email: params.to,
          subject: params.subject,
          html: params.html,
        }),
      }
    );

    console.log('[GHL] Email send response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[GHL] Email send failed:', response.status, error);
      throw new Error(`GHL email failed: ${error}`);
    }

    const data = await response.json();
    console.log('[GHL] Email sent successfully');
    return data;
  } catch (error) {
    console.error('[GHL] Error sending email:', error);
    throw error;
  }
}

/**
 * Send SMS via GHL
 * Note: Requires a phone number to be configured in the GHL location (LC Phone or Twilio)
 */
export async function sendGHLSMS(params: GHLSMSParams) {
  try {
    console.log('[GHL] Attempting to send SMS to contact:', params.to);

    const payload = {
      type: 'SMS',
      locationId: params.locationId,
      contactId: params.to, // This should be a GHL contact ID
      message: params.message,
    };

    console.log('[GHL] SMS payload:', JSON.stringify(payload));

    const response = await fetch(
      `https://services.leadconnectorhq.com/conversations/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify(payload),
      }
    );

    console.log('[GHL] SMS send response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[GHL] SMS send failed:', response.status, error);

      // If SMS fails due to permissions or setup, log it but don't fail the whole process
      if (response.status === 401) {
        console.warn('[GHL] SMS not authorized - may need phone number configured in GHL location or different scopes');
      }

      throw new Error(`GHL SMS failed: ${error}`);
    }

    const data = await response.json();
    console.log('[GHL] SMS sent successfully');
    return data;
  } catch (error) {
    console.error('[GHL] Error sending SMS:', error);
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
  customFields?: Record<string, string>;
}) {
  try {
    const startedAt = Date.now();
    console.log('[GHL] Starting contact creation/update process...');
    console.log('[GHL] Location ID:', params.locationId);
    console.log('[GHL] Email:', params.email);
    console.log('[GHL] Phone:', params.phone);

    // Create contact - GHL will handle duplicates and return existing contact if duplicate
    console.log('[GHL] Creating/updating contact...');
    const contactPayload: any = {
      locationId: params.locationId,
      email: params.email,
      phone: params.phone,
      firstName: params.firstName,
      lastName: params.lastName || '',
      source: params.source || 'Open House',
      tags: params.tags || [],
    };

    // Add custom fields if provided (GHL expects array format, not object)
    if (params.customFields && Object.keys(params.customFields).length > 0) {
      contactPayload.customFields = Object.entries(params.customFields).map(([key, value]) => ({
        key,
        field_value: value,
      }));
    }

    console.log('[GHL] Contact payload:', JSON.stringify(contactPayload));
    console.log('[GHL] Sending create request...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[GHL] Contact aborting request after 20 seconds');
      controller.abort();
    }, 20000);

    const fetchPromise = fetch(`https://services.leadconnectorhq.com/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify(contactPayload),
      signal: controller.signal,
    });

    // Race between fetch and timeout
    let createResponse;
    try {
      console.log('[GHL] Waiting for response (20 second timeout)...');
      createResponse = await fetchPromise;
      console.log('[GHL] Create response received');
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        console.error('[GHL] Request failed or timed out:', error.message);
        const existingContact = await searchGHLContact({
          locationId: params.locationId,
          accessToken: params.accessToken,
          email: params.email,
          phone: params.phone,
        });

        if (existingContact?.id) {
          if (params.tags && params.tags.length > 0) {
            await addGHLTags({
              contactId: existingContact.id,
              locationId: params.locationId,
              accessToken: params.accessToken,
              tags: params.tags,
            });
          }
          return { id: existingContact.id };
        }

        throw new Error('GHL_TIMEOUT: Request exceeded 20 seconds');
      }

      console.error('[GHL] Request failed:', error.message);
      console.error('[GHL] Contact response time (ms):', Date.now() - startedAt);
      throw error;
    }

    clearTimeout(timeoutId);

    console.log('[GHL] Create response status:', createResponse.status);
    console.log('[GHL] Contact response time (ms):', Date.now() - startedAt);

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[GHL] Contact creation failed:', createResponse.status, errorText);

      // If duplicate contact error, extract the existing contact ID from the error
      try {
        const errorData = JSON.parse(errorText);
        console.log('[GHL] Parsed error data:', JSON.stringify(errorData));

        if (errorData.statusCode === 422 || errorData.statusCode === 400) {
          // Check for duplicate contact in various error formats
          const existingContactId = errorData.meta?.contactId || errorData.contactId || errorData.contact?.id;

          if (existingContactId) {
            console.log('[GHL] Contact already exists, using existing contact ID:', existingContactId);

            // Add tags to existing contact if provided
            if (params.tags && params.tags.length > 0) {
              try {
                console.log('[GHL] Adding tags to existing contact...');
                await addGHLTags({
                  contactId: existingContactId,
                  locationId: params.locationId,
                  accessToken: params.accessToken,
                  tags: params.tags,
                });
                console.log('[GHL] Tags added successfully');
              } catch (tagError) {
                console.error('[GHL] Failed to add tags, but continuing:', tagError);
              }
            }

            // Return the existing contact
            return { id: existingContactId };
          }
        }
      } catch (parseError) {
        console.error('[GHL] Failed to parse error response:', parseError);
        // If we can't parse the error, continue with the original error
      }

      throw new Error(`GHL contact creation failed: ${errorText}`);
    }

    const contactData = await createResponse.json();
    console.log('[GHL] Response data:', JSON.stringify(contactData));
    const resolvedContact = contactData.contact || contactData;
    console.log('[GHL] Created new GHL contact:', resolvedContact?.id);

    if (resolvedContact?.id && params.tags && params.tags.length > 0) {
      try {
        await addGHLTags({
          contactId: resolvedContact.id,
          locationId: params.locationId,
          accessToken: params.accessToken,
          tags: params.tags,
        });
      } catch (tagError) {
        console.error('[GHL] Failed to add tags to contact:', tagError);
      }
    }

    return resolvedContact;
  } catch (error: any) {
    console.error('[GHL] Error creating/updating GHL contact:', error);
    console.error('[GHL] Error stack:', error.stack);
    throw error;
  }
}

async function searchGHLContact(params: {
  locationId: string;
  accessToken: string;
  email?: string;
  phone?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.email) {
    searchParams.set('email', params.email);
  }
  if (params.phone) {
    searchParams.set('phone', params.phone);
  }

  if (!searchParams.toString()) {
    return null;
  }

  const response = await fetch(
    `https://services.leadconnectorhq.com/contacts/search?${searchParams.toString()}`,
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
    console.error('[GHL] Contact search failed:', error);
    return null;
  }

  const data = await response.json();
  return data?.contacts?.[0] || null;
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
