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

    // Map field keys to IDs
    const fieldMap: CustomFieldMap = {};
    customFields.forEach((field: any) => {
      if (field.key) {
        fieldMap[field.key] = field.id;
      }
    });

    return fieldMap;
  }

  /**
   * Search for existing contact by email
   */
  async searchContactByEmail(email: string): Promise<GHLContact | null> {
    const response = await fetch(
      `${this.baseUrl}/contacts/search?locationId=${this.locationId}&email=${encodeURIComponent(email)}`,
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
      lease_late_fee_is_percentage: leaseData.late_fee_is_percentage ? 'true' : 'false',
      lease_late_fee_fixed_checkbox: leaseData.late_fee_is_percentage ? '☐' : '☑',
      lease_late_fee_percentage_checkbox: leaseData.late_fee_is_percentage ? '☑' : '☐',
      lease_late_fee_amount: (leaseData.late_fee_amount || 50).toString(),
      lease_late_fee_percentage: (leaseData.late_fee_percentage || 5).toString(),
      lease_late_fee_frequency: leaseData.late_fee_frequency || 'per occurrence',
      lease_late_fee_per_occurrence_checkbox: (leaseData.late_fee_frequency || 'per occurrence') === 'per occurrence' ? '☑' : '☐',
      lease_late_fee_per_day_checkbox: (leaseData.late_fee_frequency || 'per occurrence') === 'per day' ? '☑' : '☐',
      lease_nsf_fee: (leaseData.nsf_fee || 35).toString(),
      lease_deposit_return_days: (leaseData.deposit_return_days || 60).toString(),
      lease_occupants: leaseData.occupants || '',
      lease_subletting_allowed: leaseData.subletting_allowed ? 'true' : 'false',
      lease_subletting_allowed_checkbox: leaseData.subletting_allowed ? '☑' : '☐',
      lease_subletting_not_allowed_checkbox: leaseData.subletting_allowed ? '☐' : '☑',
      lease_pets_allowed: leaseData.pets_allowed ? 'true' : 'false',
      lease_pets_allowed_checkbox: leaseData.pets_allowed ? '☑' : '☐',
      lease_pets_not_allowed_checkbox: leaseData.pets_allowed ? '☐' : '☑',
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

    const contactPayload = {
      email,
      phone,
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
}

/**
 * Helper function for lease automation
 * Orchestrates the complete "Upsert-then-Dispatch" flow
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
