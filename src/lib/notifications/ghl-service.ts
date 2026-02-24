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
    const requestPayload = {
      locationId: params.locationId,
      properties: {
        // Property keys must match GHL custom object field names exactly
        // Accessed in emails via {{registration.openHouses.fieldName}}
        "openhouseid": params.eventId,
        "address": params.address,              // {{registration.openHouses.address}}
        "startdatetime": params.startDateTime,
        "enddatetime": params.endDateTime,
        "flyerurl": params.flyerUrl,            // {{registration.openHouses.flyerurl}}
        "agentid": params.agentId,              // {{registration.openHouses.agentid}}
        "beds": params.beds?.toString() || '',
        "baths": params.baths?.toString() || '',
        "sqft": params.sqft?.toString() || '',
        "price": params.price?.toString() || '',
      },
    };

    console.log('[GHL] OpenHouse request payload:', JSON.stringify(requestPayload));

    try {
      openHouseResponse = await fetch(
        `https://services.leadconnectorhq.com/objects/custom_objects.openhouses/records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
          body: JSON.stringify(requestPayload),
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

    const openHouseResponseText = await openHouseResponse.text();

    if (!openHouseResponse.ok) {
      console.error('[GHL] OpenHouse creation failed:', openHouseResponse.status, openHouseResponseText);

      // Handle duplicate OpenHouse record - this is expected when multiple people register for the same event
      // Check all non-2xx statuses (GHL may return 400, 409, or 422 for conflicts)
      try {
        const errorData = JSON.parse(openHouseResponseText);

        // Check if this is a duplicate record error
        const duplicateError = errorData.errors?.find((err: any) =>
          err.errorCode === 'primary_property_conflict' ||
          err.errorCode === 'duplicate_record'
        );

        if (duplicateError?.conflictingRecordId) {
          console.log('[GHL] OpenHouse already exists (this is normal for multiple registrants)');
          console.log('[GHL] Using existing OpenHouse record:', duplicateError.conflictingRecordId);
          return duplicateError.conflictingRecordId;
        }
      } catch (parseError) {
        console.error('[GHL] Failed to parse error response');
      }

      throw new Error(`Failed to create OpenHouse: ${openHouseResponseText}`);
    }

    console.log('[GHL] OpenHouse response body:', openHouseResponseText);
    const openHouseData = JSON.parse(openHouseResponseText);
    const openHouseRecordId = openHouseData.record?.id;
    console.log('[GHL] OpenHouse created:', openHouseRecordId);

    if (!openHouseRecordId) {
      throw new Error('OpenHouse created but ID not found in response');
    }

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
      `https://services.leadconnectorhq.com/objects/custom_objects.registrations/records`,
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
            // Property keys use internal field names WITHOUT the custom_objects.registrations prefix
            "registrationid": `reg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            "contactid": params.contactId,
            "openhouseid": params.eventId,
            "registerdat": new Date().toISOString(),
            "flyerstatus": ['pending'], // Multi-select field requires array
          },
          // OpenHouse data is accessed via association: {{registration.openHouses.fieldName}}
        }),
      }
    );

    if (!registrationResponse.ok) {
      const error = await registrationResponse.text();
      console.error('[GHL] Registration creation failed:', error);
      throw new Error(`Failed to create Registration: ${error}`);
    }

    const registrationData = await registrationResponse.json();
    const registrationRecordId = registrationData?.record?.id;
    console.log('[GHL] Registration created:', registrationRecordId);

    if (!registrationRecordId) {
      throw new Error('Registration created but ID not found in response');
    }

    // Create associations to enable relationship navigation in GHL
    console.log('[GHL] Creating associations for Registration...');

    // Associate Registration → Contact (using "Registrant" label)
    try {
      const contactAssocPayload = {
        locationId: params.locationId,
        associationLabel: 'Registrant', // The label configured in Registrations object
        firstObjectKey: 'custom_objects.registrations',
        firstObjectId: registrationRecordId,
        secondObjectKey: 'contact',
        secondObjectId: params.contactId,
      };

      console.log('[GHL] Creating Contact association with payload:', JSON.stringify(contactAssocPayload));
      console.log('[GHL] Using association label: "Registrant"');
      console.log('[GHL] Location ID:', params.locationId);
      console.log('[GHL] Token prefix:', params.accessToken.substring(0, 20) + '...');

      const contactAssocResponse = await fetch(
        `https://services.leadconnectorhq.com/associations/relations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
          body: JSON.stringify(contactAssocPayload),
        }
      );

      console.log('[GHL] Association response status:', contactAssocResponse.status);
      console.log('[GHL] Association response headers:', Object.fromEntries(contactAssocResponse.headers.entries()));

      if (contactAssocResponse.ok) {
        const responseData = await contactAssocResponse.json();
        console.log('[GHL] Association created successfully:', responseData);
        console.log('[GHL] ✅ Association created: Registration → Contact');
      } else {
        const error = await contactAssocResponse.text();
        console.warn('[GHL] ❌ Failed to create Contact association (non-critical):', error);
        console.warn('[GHL] Response status:', contactAssocResponse.status);
        console.warn('[GHL] Response headers:', Object.fromEntries(contactAssocResponse.headers.entries()));
      }
    } catch (assocError: any) {
      console.warn('[GHL] Contact association error (non-critical):', assocError.message);
      console.warn('[GHL] Error stack:', assocError.stack);
    }

    // Associate Registration → OpenHouse (using "Open House" label)
    try {
      const openHouseAssocPayload = {
        locationId: params.locationId,
        associationLabel: 'Open House', // The label configured in Registrations object
        firstObjectKey: 'custom_objects.registrations',
        firstObjectId: registrationRecordId,
        secondObjectKey: 'custom_objects.openhouses',
        secondObjectId: params.openHouseRecordId,
      };

      console.log('[GHL] Creating OpenHouse association with payload:', JSON.stringify(openHouseAssocPayload));
      console.log('[GHL] Using association label: "Open House"');

      const openHouseAssocResponse = await fetch(
        `https://services.leadconnectorhq.com/associations/relations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
          body: JSON.stringify(openHouseAssocPayload),
        }
      );

      console.log('[GHL] OpenHouse Association response status:', openHouseAssocResponse.status);

      if (openHouseAssocResponse.ok) {
        const responseData = await openHouseAssocResponse.json();
        console.log('[GHL] OpenHouse Association created successfully:', responseData);
        console.log('[GHL] ✅ Association created: Registration → OpenHouse');
      } else {
        const error = await openHouseAssocResponse.text();
        console.warn('[GHL] ❌ Failed to create OpenHouse association (non-critical):', error);
        console.warn('[GHL] Response status:', openHouseAssocResponse.status);
      }
    } catch (assocError: any) {
      console.warn('[GHL] OpenHouse association error (non-critical):', assocError.message);
      console.warn('[GHL] Error stack:', assocError.stack);
    }

    return registrationRecordId;
  } catch (error: any) {
    console.error('[GHL] Error creating Registration:', error);
    throw error;
  }
}

export async function createGHLOpportunity(params: {
  locationId: string;
  accessToken: string;
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
  name: string;
  monetaryValue?: number;
  status?: 'open' | 'won' | 'lost' | 'abandoned';
}) {
  try {
    console.log('[GHL] Creating Opportunity in pipeline...');
    const opportunityResponse = await fetch(
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
          pipelineId: params.pipelineId,
          pipelineStageId: params.pipelineStageId,
          contactId: params.contactId,
          name: params.name,
          monetaryValue: params.monetaryValue || 0,
          status: params.status || 'open',
        }),
      }
    );

    if (!opportunityResponse.ok) {
      const error = await opportunityResponse.text();
      console.error('[GHL] Opportunity creation failed:', error);
      throw new Error(`Failed to create Opportunity: ${error}`);
    }

    const opportunityData = await opportunityResponse.json();
    const opportunityId = opportunityData?.opportunity?.id;
    console.log('[GHL] Opportunity created:', opportunityId);

    if (!opportunityId) {
      throw new Error('Opportunity created but ID not found in response');
    }

    return opportunityId;
  } catch (error: any) {
    console.error('[GHL] Error creating Opportunity:', error);
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
  agentName: string;
  agencyName?: string;
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
  contactId: string; // GHL contact ID (required for conversations API)
  to: string; // Email address (for logging/fallback)
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
 * Requires contactId to link email to contact's conversation history
 */
export async function sendGHLEmail(params: GHLEmailParams) {
  try {
    console.log('[GHL] Attempting to send email to:', params.to, 'Contact ID:', params.contactId);

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
          contactId: params.contactId, // Required for GHL to track in conversations
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
 * Set DND (Do Not Disturb) on all channels for a GHL contact
 * Used when an attendee indicates they are represented by a realtor
 */
export async function setGHLContactDND(params: {
  contactId: string;
  locationId: string;
  accessToken: string;
  dndEnabled: boolean;
}) {
  try {
    console.log(`[GHL] Setting DND ${params.dndEnabled ? 'ON' : 'OFF'} for contact:`, params.contactId);

    const dndSettings = {
      Email: { status: params.dndEnabled ? 'active' : 'inactive' as const, message: 'Represented by a realtor', code: '' },
      SMS: { status: params.dndEnabled ? 'active' : 'inactive' as const, message: 'Represented by a realtor', code: '' },
      Call: { status: params.dndEnabled ? 'active' : 'inactive' as const, message: 'Represented by a realtor', code: '' },
      GMB: { status: params.dndEnabled ? 'active' : 'inactive' as const, message: 'Represented by a realtor', code: '' },
      FB: { status: params.dndEnabled ? 'active' : 'inactive' as const, message: 'Represented by a realtor', code: '' },
      WhatsApp: { status: params.dndEnabled ? 'active' : 'inactive' as const, message: 'Represented by a realtor', code: '' },
    };

    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/${params.contactId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          dnd: true,
          dndSettings,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[GHL] DND update failed:', error);
      throw new Error(`GHL DND update failed: ${error}`);
    }

    const data = await response.json();
    console.log(`[GHL] DND set to ${params.dndEnabled ? 'ON' : 'OFF'} for all channels`);
    return data;
  } catch (error) {
    console.error('[GHL] Error setting DND:', error);
    throw error;
  }
}

/**
 * Add a note to a GHL contact
 */
export async function addGHLContactNote(params: {
  contactId: string;
  locationId: string;
  accessToken: string;
  body: string;
}) {
  try {
    console.log('[GHL] Adding note to contact:', params.contactId);

    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/${params.contactId}/notes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          body: params.body,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[GHL] Add note failed:', error);
      throw new Error(`GHL add note failed: ${error}`);
    }

    const data = await response.json();
    console.log('[GHL] Note added successfully');
    return data;
  } catch (error) {
    console.error('[GHL] Error adding note:', error);
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
