/**
 * GoHighLevel Documents & Contracts API Client
 *
 * This client handles the "Upsert-then-Dispatch" pattern required for GHL documents:
 * 1. Update contact with all lease data (custom fields)
 * 2. Add trigger tag to contact
 * 3. GHL workflow detects tag → sends document
 * 4. GHL workflow removes tag to prevent loops
 *
 * Reference: https://highlevel.stoplight.io/docs/integrations/
 */

import { GHLClient } from './ghl-client';

interface GHLContact {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  customFields?: Array<{ id: string; value: string }>;
  tags?: string[];
}

interface CustomFieldMap {
  [key: string]: string; // Maps field key to field ID
}

export class GHLDocumentsClient {
  private accessToken: string;
  private locationId: string;
  private baseUrl = 'https://services.leadconnectorhq.com';

  constructor(accessToken: string, locationId: string) {
    this.accessToken = accessToken;
    this.locationId = locationId;
  }

  /**
   * Get common headers for GHL API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    };
  }

  /**
   * Step 1: Fetch custom field IDs
   * Required because GHL needs field IDs, not just keys
   */
  async getCustomFieldMap(): Promise<CustomFieldMap> {
    const response = await fetch(
      `${this.baseUrl}/locations/${this.locationId}/customFields`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch custom fields: ${JSON.stringify(error)}`);
    }

    const { customFields } = await response.json();

    // Log the first field to understand structure
    if (customFields && customFields.length > 0) {
      console.log('🔍 First GHL custom field structure:', JSON.stringify(customFields[0], null, 2));
      console.log('🔍 Available properties:', Object.keys(customFields[0]));
    }

    // Map field keys to IDs
    // GHL uses fieldKey property with "contact." prefix (e.g., "contact.lease_property_address")
    const fieldMap: CustomFieldMap = {};
    customFields.forEach((field: any) => {
      // GHL fieldKey format: "contact.lease_property_address"
      const rawFieldKey = field.fieldKey || field.key || field.field_key || field.name;
      if (rawFieldKey) {
        // Remove "contact." prefix if present to match our expected keys
        const fieldKey = rawFieldKey.startsWith('contact.')
          ? rawFieldKey.substring('contact.'.length)
          : rawFieldKey;

        fieldMap[fieldKey] = field.id;
        console.log(`📋 Mapped field: ${fieldKey} (raw: ${rawFieldKey}) → ${field.id}`);
      }
    });

    console.log(`✅ Built field map with ${Object.keys(fieldMap).length} fields`);
    return fieldMap;
  }

  /**
   * Search for existing contact by email using query parameter
   */
  async searchContactByEmail(email: string): Promise<GHLContact | null> {
    const response = await fetch(
      `${this.baseUrl}/contacts?locationId=${this.locationId}&query=${encodeURIComponent(email)}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search contact: ${response.statusText}`);
    }

    const { contacts } = await response.json();
    return contacts && contacts.length > 0 ? contacts[0] : null;
  }

  /**
   * Create new contact
   */
  async createContact(contactData: Partial<GHLContact>): Promise<GHLContact> {
    const payload = {
      ...contactData,
      locationId: this.locationId,
    };

    const response = await fetch(`${this.baseUrl}/contacts/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create contact: ${JSON.stringify(error)}`);
    }

    const { contact } = await response.json();
    return contact;
  }

  /**
   * Update existing contact
   */
  async updateContact(contactId: string, updates: Partial<GHLContact>): Promise<GHLContact> {
    const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update contact: ${JSON.stringify(error)}`);
    }

    const { contact } = await response.json();
    return contact;
  }

  /**
   * Step 2: Upsert contact with lease data
   * This is the critical "Upsert" phase of the Upsert-then-Dispatch pattern
   */
  async upsertContactWithLeaseData(
    email: string,
    phone: string,
    leaseData: {
      tenant_first_name: string;
      tenant_last_name: string;
      property_address: string;
      property_city: string;
      property_state: string;
      property_zipcode: string;
      start_date: string;
      end_date: string;
      monthly_rent: number;
      security_deposit: number;
      pet_deposit?: number;
      rent_due_day?: number;
      notice_period_days?: number;
      late_grace_days?: number;
      late_fee_is_percentage?: boolean;
      late_fee_amount?: number;
      late_fee_percentage?: number;
      late_fee_frequency?: string;
      nsf_fee?: number;
      deposit_return_days?: number;
      occupants?: string;
      subletting_allowed?: boolean;
      pets_allowed?: boolean;
      pet_count?: number;
      pet_types?: string;
      pet_weight_limit?: string;
      landlord_notice_address?: string;
    },
    fieldMap: CustomFieldMap
  ): Promise<{ contact: GHLContact; isNewContact: boolean }> {
    // Search for existing contact
    const existingContact = await this.searchContactByEmail(email);

    // Prepare custom fields array with GHL field IDs
    const customFields: Array<{ id: string; value: string }> = [];

    const fieldMappings: Record<string, any> = {
      lease_property_address: leaseData.property_address,
      lease_property_city: leaseData.property_city,
      lease_property_state: leaseData.property_state,
      lease_property_zipcode: leaseData.property_zipcode,
      lease_start_date: leaseData.start_date,
      lease_end_date: leaseData.end_date,
      lease_monthly_rent: leaseData.monthly_rent.toString(),
      lease_security_deposit: leaseData.security_deposit.toString(),
      lease_rent_due_day: (leaseData.rent_due_day || 1).toString(),
      lease_notice_days: (leaseData.notice_period_days || 30).toString(),
      lease_late_grace_days: (leaseData.late_grace_days || 5).toString(),
      // Late fee type checkboxes (checkbox symbols for document templates)
      lease_late_fee_type_fixed: leaseData.late_fee_is_percentage ? 'No' : 'Yes',
      lease_late_fee_type_percentage: leaseData.late_fee_is_percentage ? 'Yes' : 'No',
      lease_late_fee_amount: (leaseData.late_fee_amount || 50).toString(),
      lease_late_fee_percentage: (leaseData.late_fee_percentage || 5).toString(),
      // Late fee frequency checkboxes
      lease_late_fee_frequency_occurence: (leaseData.late_fee_frequency || 'per occurrence') === 'per occurrence' ? 'Yes' : 'No',
      lease_late_fee_frequency_daily: (leaseData.late_fee_frequency || 'per occurrence') === 'per day' ? 'Yes' : 'No',
      lease_nsf_fee: (leaseData.nsf_fee || 35).toString(),
      lease_deposit_return_days: (leaseData.deposit_return_days || 60).toString(),
      lease_occupants: leaseData.occupants || '',
      // Subletting checkboxes
      lease_subletting_yes: leaseData.subletting_allowed ? 'Yes' : 'No',
      lease_subletting_no: leaseData.subletting_allowed ? 'No' : 'Yes',
      // Pet checkboxes
      lease_pets_yes: leaseData.pets_allowed ? 'Yes' : 'No',
      lease_pets_no: leaseData.pets_allowed ? 'No' : 'Yes',
      lease_pet_count: (leaseData.pet_count || 0).toString(),
      lease_pet_types: leaseData.pet_types || '',
      lease_pet_weight_limit: leaseData.pet_weight_limit || '',
      lease_pet_deposit: (leaseData.pet_deposit || 0).toString(),
      lease_landlord_notice_address: leaseData.landlord_notice_address || '',
    };

    // Map to GHL field IDs
    for (const [key, value] of Object.entries(fieldMappings)) {
      const fieldId = fieldMap[key];
      if (fieldId) {
        customFields.push({ id: fieldId, value: value });
      } else {
        console.warn(`⚠️ Custom field not found in GHL: ${key}`);
      }
    }

    // Format lease name: "Property Address + Start Date" (e.g., "133 Omao Street 01-03-26")
    const startDate = new Date(leaseData.start_date);
    const formattedDate = `${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}-${String(startDate.getFullYear()).slice(-2)}`;
    const leaseName = `${leaseData.property_address} ${formattedDate}`;

    const contactPayload = {
      email,
      phone,
      name: leaseName, // Set contact name to property address + start date
      firstName: leaseData.tenant_first_name,
      lastName: leaseData.tenant_last_name,
      customFields,
      tags: ['trigger-send-lease'], // This triggers the workflow
    };

    if (existingContact) {
      // Update existing contact
      const updated = await this.updateContact(existingContact.id, contactPayload);
      return { contact: updated, isNewContact: false };
    } else {
      // Create new contact
      const created = await this.createContact(contactPayload);
      return { contact: created, isNewContact: true };
    }
  }

  /**
   * Add tag to contact (alternative trigger method)
   */
  async addTagToContact(contactId: string, tag: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/contacts/${contactId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        tags: [tag],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to add tag: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Remove tag from contact (cleanup after workflow)
   */
  async removeTagFromContact(contactId: string, tag: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/contacts/${contactId}/tags/${encodeURIComponent(tag)}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to remove tag: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Upsert contact WITHOUT trigger tag (for direct document creation)
   * Creates or updates contact with basic info only
   */
  async upsertContact(
    email: string,
    phone: string | undefined,
    leaseData: {
      tenant_first_name: string;
      tenant_last_name: string;
      property_address: string;
      start_date: string;
    }
  ): Promise<{ contact: GHLContact; isNewContact: boolean }> {
    // Search for existing contact
    const existingContact = await this.searchContactByEmail(email);

    // Format lease name: "Property Address + Start Date"
    const startDate = new Date(leaseData.start_date);
    const formattedDate = `${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}-${String(startDate.getFullYear()).slice(-2)}`;
    const leaseName = `${leaseData.property_address} ${formattedDate}`;

    const contactPayload = {
      email,
      phone,
      name: leaseName,
      firstName: leaseData.tenant_first_name,
      lastName: leaseData.tenant_last_name,
    };

    if (existingContact) {
      // Update existing contact
      const updated = await this.updateContact(existingContact.id, contactPayload);
      return { contact: updated, isNewContact: false };
    } else {
      // Create new contact
      const created = await this.createContact(contactPayload);
      return { contact: created, isNewContact: true };
    }
  }
}

/**
 * Helper function for lease automation
 * Orchestrates the complete "Upsert-then-Dispatch" flow (workflow-based)
 */
export async function sendLeaseViaGHL(
  ghlAccessToken: string,
  ghlLocationId: string,
  tenantEmail: string,
  tenantPhone: string,
  leaseData: Parameters<GHLDocumentsClient['upsertContactWithLeaseData']>[2]
): Promise<{ contactId: string; isNewContact: boolean }> {
  const client = new GHLDocumentsClient(ghlAccessToken, ghlLocationId);

  // Step 1: Get field map
  const fieldMap = await client.getCustomFieldMap();

  // Step 2: Upsert contact with lease data + trigger tag
  const { contact, isNewContact } = await client.upsertContactWithLeaseData(
    tenantEmail,
    tenantPhone,
    leaseData,
    fieldMap
  );

  console.log(`✅ Contact ${isNewContact ? 'created' : 'updated'} in GHL: ${contact.id}`);
  console.log(`✅ Trigger tag added - GHL workflow will send lease document`);

  return { contactId: contact.id, isNewContact };
}

/**
 * Send lease via GHL using direct document creation (NEW METHOD)
 * Creates document from template and sends it directly via API
 *
 * @param ghlAccessToken - GHL access token
 * @param ghlLocationId - GHL location ID
 * @param templateId - GHL document template ID
 * @param tenantEmail - Tenant email address
 * @param tenantPhone - Tenant phone number (optional)
 * @param propertyAddress - Property street address for document naming
 * @param leaseData - Lease data to populate in template
 * @returns Contact ID and document ID
 */
export async function sendLeaseViaGHLDirect(
  ghlAccessToken: string,
  ghlLocationId: string,
  ghlUserId: string,
  templateId: string,
  tenantEmail: string,
  tenantPhone: string | null,
  propertyAddress: string,
  leaseData: Parameters<GHLDocumentsClient['upsertContactWithLeaseData']>[2]
): Promise<{ contactId: string; documentId: string; documentUrl?: string; isNewContact: boolean }> {
  const client = new GHLDocumentsClient(ghlAccessToken, ghlLocationId);
  const ghlClient = new GHLClient(ghlAccessToken, ghlLocationId, ghlUserId);

  console.log('📄 Starting direct lease document creation...');

  // Step 1: Upsert contact (without trigger tag)
  const { contact, isNewContact } = await client.upsertContact(
    tenantEmail,
    tenantPhone || undefined,
    {
      tenant_first_name: leaseData.tenant_first_name,
      tenant_last_name: leaseData.tenant_last_name,
      property_address: leaseData.property_address,
      start_date: leaseData.start_date,
    }
  );

  console.log(`✅ Contact ${isNewContact ? 'created' : 'updated'} in GHL: ${contact.id}`);

  // Step 2: Update contact with all lease data as custom fields
  // Template merge fields use {{contact.lease_property_address}} format with underscores
  const customFieldsToUpdate: Record<string, string> = {
    lease_property_address: leaseData.property_address,
    lease_property_city: leaseData.property_city,
    lease_property_state: leaseData.property_state,
    lease_property_zipcode: leaseData.property_zipcode,
    lease_start_date: leaseData.start_date,
    lease_end_date: leaseData.end_date,
    lease_monthly_rent: leaseData.monthly_rent.toString(),
    lease_security_deposit: leaseData.security_deposit.toString(),
    lease_rent_due_day: (leaseData.rent_due_day || 1).toString(),
    lease_notice_days: (leaseData.notice_period_days || 30).toString(),
    lease_late_grace_days: (leaseData.late_grace_days || 5).toString(),
    lease_late_fee_type_fixed: leaseData.late_fee_is_percentage ? 'No' : 'Yes',
    lease_late_fee_type_percentage: leaseData.late_fee_is_percentage ? 'Yes' : 'No',
    lease_late_fee_amount: (leaseData.late_fee_amount || 50).toString(),
    lease_late_fee_percentage: (leaseData.late_fee_percentage || 5).toString(),
    lease_late_fee_frequency_occurence: (leaseData.late_fee_frequency || 'per occurrence') === 'per occurrence' ? 'Yes' : 'No',
    lease_late_fee_frequency_daily: (leaseData.late_fee_frequency || 'per occurrence') === 'per day' ? 'Yes' : 'No',
    lease_nsf_fee: (leaseData.nsf_fee || 35).toString(),
    lease_deposit_return_days: (leaseData.deposit_return_days || 60).toString(),
    lease_occupants: leaseData.occupants || '',
    lease_subletting_yes: leaseData.subletting_allowed ? 'Yes' : 'No',
    lease_subletting_no: leaseData.subletting_allowed ? 'No' : 'Yes',
    lease_pets_yes: leaseData.pets_allowed ? 'Yes' : 'No',
    lease_pets_no: leaseData.pets_allowed ? 'No' : 'Yes',
    lease_pet_count: (leaseData.pet_count || 0).toString(),
    lease_pet_types: leaseData.pet_types || '',
    lease_pet_weight_limit: leaseData.pet_weight_limit || '',
    lease_pet_deposit: (leaseData.pet_deposit || 0).toString(),
    lease_landlord_notice_address: leaseData.landlord_notice_address || '',
  };

  console.log(`📋 Updating contact with ${Object.keys(customFieldsToUpdate).length} custom fields`);

  // Convert custom fields object to array format required by GHL API
  // GHL expects: [{ key: "field_name", value: "field_value" }, ...]
  const customFieldsArray = Object.entries(customFieldsToUpdate).map(([key, value]) => ({
    key,
    value,
  }));

  // Update the contact with all lease custom fields
  await ghlClient.updateContact(contact.id, {
    customFields: customFieldsArray,
  });

  console.log(`✅ Contact custom fields updated with lease data`);

  // Step 3: Generate document name: "123 Main St-2026-01-06"
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const documentName = `${propertyAddress}-${today}`;

  console.log(`📄 Creating document: "${documentName}"`);
  console.log(`📋 Using template: ${templateId}`);
  console.log(`📧 Sending to contact: ${contact.id}`);

  // Step 4: Create and send document from template
  // Template will auto-populate from contact's custom fields
  const { documentId, document, url } = await ghlClient.sendDocumentTemplate({
    templateId,
    contactId: contact.id,
    documentName,
    medium: 'link', // Get signing URL in response
  });

  console.log(`✅ Document created and sent: ${documentId}`);
  console.log(`✅ Document name: ${documentName}`);
  if (url) {
    console.log(`✅ Signing URL: ${url}`);
  }

  return {
    contactId: contact.id,
    documentId,
    documentUrl: url,
    isNewContact,
  };
}
