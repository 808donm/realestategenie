/**
 * GoHighLevel API Client
 *
 * Handles OAuth authentication and API calls to GHL v2
 * Documentation: https://highlevel.stoplight.io/docs/integrations/
 */

export type GHLContact = {
  id?: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  source?: string;
  customFields?: Record<string, string>;
};

export type GHLOpportunity = {
  id?: string;
  pipelineId: string;
  pipelineStageId: string;
  name: string;
  status: "open" | "won" | "lost" | "abandoned";
  contactId: string;
  monetaryValue?: number;
};

export type GHLPipeline = {
  id: string;
  name: string;
  stages: GHLStage[];
};

export type GHLStage = {
  id: string;
  name: string;
  position: number;
};

export type GHLNote = {
  contactId: string;
  body: string;
  userId?: string;
};

export type GHLCustomObjectRecord = {
  id?: string;
  locationId: string;
  objectType: string; // e.g. "custom_objects.openhouses" or "custom_objects.registrations"
  properties: Record<string, any>;
  relationships?: Array<{
    relatedObjectId: string;
    relationType: string;
  }>;
};

export type GHLSMSMessage = {
  contactId: string;
  locationId?: string;
  message: string;
};

export type GHLEmailMessage = {
  contactId: string;
  subject: string;
  html: string;
};

export type GHLContract = {
  id?: string;
  locationId: string;
  title: string;
  contactId: string;
  templateId?: string; // Use template or custom document
  customDocument?: {
    fileUrl: string;
    fileName: string;
  };
  fields?: Array<{
    key: string;
    value: string;
  }>;
  signers: Array<{
    email: string;
    name: string;
    role: "tenant" | "landlord" | "custom";
  }>;
  status?: "draft" | "pending" | "signed" | "declined" | "expired";
};

export type GHLInvoice = {
  id?: string;
  locationId: string;
  contactId: string;
  title: string;
  currency: string;
  dueDate: string; // ISO date string
  items: Array<{
    name: string;
    description?: string;
    price: number;
    quantity: number;
  }>;
  status?: "draft" | "sent" | "paid" | "void";
};

export class GHLClient {
  private accessToken: string;
  private baseUrl = "https://services.leadconnectorhq.com";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make authenticated API request to GHL
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28", // GHL API version
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GHL API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Create a new contact
   */
  async createContact(contact: GHLContact): Promise<GHLContact> {
    return this.request<GHLContact>("/contacts/", {
      method: "POST",
      body: JSON.stringify(contact),
    });
  }

  /**
   * Update an existing contact
   */
  async updateContact(contactId: string, updates: Partial<GHLContact>): Promise<GHLContact> {
    return this.request<GHLContact>(`/contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<GHLContact> {
    return this.request<GHLContact>(`/contacts/${contactId}`);
  }

  /**
   * Search for contact by email or phone
   */
  async searchContacts(query: { email?: string; phone?: string }): Promise<{ contacts: GHLContact[] }> {
    const params = new URLSearchParams();
    if (query.email) params.append("email", query.email);
    if (query.phone) params.append("phone", query.phone);

    return this.request<{ contacts: GHLContact[] }>(`/contacts/search?${params.toString()}`);
  }

  /**
   * Add tags to a contact
   */
  async addTags(contactId: string, tags: string[]): Promise<void> {
    await this.request(`/contacts/${contactId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tags }),
    });
  }

  /**
   * Create an opportunity
   */
  async createOpportunity(opportunity: GHLOpportunity): Promise<GHLOpportunity> {
    return this.request<GHLOpportunity>("/opportunities/", {
      method: "POST",
      body: JSON.stringify(opportunity),
    });
  }

  /**
   * Update opportunity stage
   */
  async updateOpportunityStage(opportunityId: string, stageId: string): Promise<GHLOpportunity> {
    return this.request<GHLOpportunity>(`/opportunities/${opportunityId}`, {
      method: "PUT",
      body: JSON.stringify({ pipelineStageId: stageId }),
    });
  }

  /**
   * Get all pipelines for a location
   */
  async getPipelines(locationId: string): Promise<{ pipelines: GHLPipeline[] }> {
    return this.request<{ pipelines: GHLPipeline[] }>(`/opportunities/pipelines?locationId=${locationId}`);
  }

  /**
   * Add a note to a contact
   */
  async addNote(note: GHLNote): Promise<void> {
    await this.request(`/contacts/${note.contactId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body: note.body, userId: note.userId }),
    });
  }

  /**
   * Get location info (to verify access token)
   */
  async getLocations(): Promise<{ locations: any[] }> {
    return this.request<{ locations: any[] }>("/locations/search");
  }

  /**
   * Create a Custom Object Record
   * Used for OpenHouse and Registration objects
   */
  async createCustomObjectRecord(record: GHLCustomObjectRecord): Promise<{ id: string }> {
    const endpoint = `/objects/${record.objectType}/records`;
    return this.request<{ id: string }>(endpoint, {
      method: "POST",
      body: JSON.stringify({
        locationId: record.locationId,
        properties: record.properties,
        relationships: record.relationships,
      }),
    });
  }

  /**
   * Update a Custom Object Record
   */
  async updateCustomObjectRecord(
    objectType: string,
    recordId: string,
    updates: Record<string, any>
  ): Promise<void> {
    const endpoint = `/objects/${objectType}/records/${recordId}`;
    await this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Query Custom Object Records
   * Search for records by field values
   */
  async queryCustomObjectRecords(
    objectType: string,
    locationId: string,
    filters: Record<string, any>
  ): Promise<{ records: any[] }> {
    const endpoint = `/objects/${objectType}/records/search`;
    return this.request<{ records: any[] }>(endpoint, {
      method: "POST",
      body: JSON.stringify({
        locationId,
        filter: filters,
      }),
    });
  }

  /**
   * Get a Custom Object Record by ID
   */
  async getCustomObjectRecord(objectType: string, recordId: string): Promise<any> {
    const endpoint = `/objects/${objectType}/records/${recordId}`;
    return this.request(endpoint);
  }

  /**
   * Send SMS message to a contact
   */
  async sendSMS(message: GHLSMSMessage): Promise<{ messageId: string }> {
    return this.request<{ messageId: string }>("/conversations/messages", {
      method: "POST",
      body: JSON.stringify({
        type: "SMS",
        contactId: message.contactId,
        message: message.message,
      }),
    });
  }

  /**
   * Send Email message to a contact
   */
  async sendEmail(email: GHLEmailMessage): Promise<{ messageId: string }> {
    return this.request<{ messageId: string }>("/conversations/messages", {
      method: "POST",
      body: JSON.stringify({
        type: "Email",
        contactId: email.contactId,
        subject: email.subject,
        html: email.html,
      }),
    });
  }

  /**
   * Create a Contract (for e-signatures)
   * GHL Contracts API supports both template-based and custom document contracts
   */
  async createContract(contract: GHLContract): Promise<{ id: string; contract: GHLContract }> {
    const payload: any = {
      locationId: contract.locationId,
      title: contract.title,
      contactId: contract.contactId,
      signers: contract.signers,
    };

    // Use either template or custom document
    if (contract.templateId) {
      payload.templateId = contract.templateId;
      payload.fields = contract.fields || [];
    } else if (contract.customDocument) {
      payload.customDocument = contract.customDocument;
    }

    return this.request<{ id: string; contract: GHLContract }>("/contracts/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get contract by ID
   */
  async getContract(contractId: string): Promise<GHLContract> {
    return this.request<GHLContract>(`/contracts/${contractId}`);
  }

  /**
   * Send contract for signature
   * This triggers the e-signature workflow in GHL
   */
  async sendContractForSignature(contractId: string): Promise<void> {
    await this.request(`/contracts/${contractId}/send`, {
      method: "POST",
    });
  }

  /**
   * Create an Invoice
   * Used for rent billing and move-in charges
   */
  async createInvoice(invoice: GHLInvoice): Promise<{ id: string; invoice: GHLInvoice }> {
    return this.request<{ id: string; invoice: GHLInvoice }>("/invoices/", {
      method: "POST",
      body: JSON.stringify({
        locationId: invoice.locationId,
        contactId: invoice.contactId,
        title: invoice.title,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        items: invoice.items,
        status: invoice.status || "draft",
      }),
    });
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<GHLInvoice> {
    return this.request<GHLInvoice>(`/invoices/${invoiceId}`);
  }

  /**
   * Send invoice to contact
   */
  async sendInvoice(invoiceId: string): Promise<void> {
    await this.request(`/invoices/${invoiceId}/send`, {
      method: "POST",
    });
  }

  /**
   * Mark invoice as paid (manual payment recording)
   */
  async markInvoicePaid(invoiceId: string, paymentDetails?: {
    paymentMethod?: string;
    transactionId?: string;
    note?: string;
  }): Promise<void> {
    await this.request(`/invoices/${invoiceId}/paid`, {
      method: "POST",
      body: JSON.stringify(paymentDetails || {}),
    });
  }
}

/**
 * Refresh GHL access token using refresh token
 */
export async function refreshGHLToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch("https://services.leadconnectorhq.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GHL_CLIENT_ID!,
      client_secret: process.env.GHL_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh GHL token");
  }

  return response.json();
}
