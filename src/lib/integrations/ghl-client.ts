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
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  tags?: string[];
  source?: string;
  customFields?: Array<{ key: string; value: string }> | Record<string, string>;
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
  private locationId?: string;
  private userId?: string;
  private baseUrl = "https://services.leadconnectorhq.com";

  constructor(accessToken: string, locationId?: string, userId?: string) {
    this.accessToken = accessToken;
    this.locationId = locationId;
    this.userId = userId;
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

      console.error('[GHL] ========================================');
      console.error('[GHL] ❌ API ERROR');
      console.error('[GHL] ========================================');
      console.error('[GHL] Status:', response.status, response.statusText);
      console.error('[GHL] Endpoint:', options.method || 'GET', endpoint);
      console.error('[GHL] URL:', url);
      console.error('[GHL] === COMPLETE ERROR RESPONSE ===');
      console.error(error);
      console.error('[GHL] === END ERROR RESPONSE ===');

      // Try to parse and display structured error if JSON
      try {
        const errorJson = JSON.parse(error);
        console.error('[GHL] === PARSED ERROR ===');
        console.error(JSON.stringify(errorJson, null, 2));
        console.error('[GHL] === END PARSED ERROR ===');
      } catch (e) {
        // Not JSON, already logged as text above
      }

      // Special logging for 401 scope errors
      if (response.status === 401) {
        console.error("[GHL] ⚠️  Token not authorized for this scope");
        console.error("[GHL] Required scopes for this endpoint may be missing");
      }

      // Special logging for 400/422 validation errors
      if (response.status === 400 || response.status === 422) {
        console.error('[GHL] ⚠️  Validation error - check payload structure above');
      }

      console.error('[GHL] ========================================');

      throw new Error(`GHL API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Create a new contact
   */
  async createContact(contact: GHLContact): Promise<GHLContact> {
    const response = await this.request<{ contact: GHLContact }>("/contacts/", {
      method: "POST",
      body: JSON.stringify(contact),
    });
    return response.contact;
  }

  /**
   * Update an existing contact
   */
  async updateContact(contactId: string, updates: Partial<GHLContact>): Promise<GHLContact> {
    const response = await this.request<{ contact: GHLContact }>(`/contacts/${contactId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return response.contact;
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<GHLContact> {
    const response = await this.request<{ contact: GHLContact }>(`/contacts/${contactId}`);
    return response.contact;
  }

  /**
   * Search for contact by email or phone using lookup endpoint
   */
  async searchContacts(query: { email?: string; phone?: string }): Promise<{ contacts: GHLContact[] }> {
    if (!query.email && !query.phone) {
      return { contacts: [] };
    }

    // GHL API v2 uses /contacts with query parameters for searching
    const params = new URLSearchParams();
    if (this.locationId) params.append("locationId", this.locationId);
    if (query.email) params.append("query", query.email); // GHL uses "query" parameter for email search
    if (query.phone && !query.email) params.append("query", query.phone); // Use phone if no email

    return this.request<{ contacts: GHLContact[] }>(`/contacts?${params.toString()}`);
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
   * Search opportunities by location, pipeline, or stage
   * Note: GHL API doesn't support filtering by pipeline/stage in the search endpoint
   * We fetch all opportunities and filter client-side
   */
  async searchOpportunities(params: {
    locationId: string;
    pipelineId?: string;
    pipelineStageId?: string;
    status?: "open" | "won" | "lost" | "abandoned";
    limit?: number;
  }): Promise<{ opportunities: any[] }> {
    // GHL opportunities/search endpoint only accepts: location_id, startAfter, startAfterId, limit, query
    const queryParams = new URLSearchParams({
      location_id: params.locationId,
    });

    if (params.limit) {
      queryParams.append("limit", params.limit.toString());
    }

    const endpoint = `/opportunities/search?${queryParams.toString()}`;

    console.log('[GHL] ========================================');
    console.log('[GHL] FETCHING ALL OPPORTUNITIES');
    console.log('[GHL] ========================================');
    console.log('[GHL] Endpoint:', endpoint);
    console.log('[GHL] Will filter client-side for:', {
      pipelineId: params.pipelineId,
      pipelineStageId: params.pipelineStageId,
      status: params.status,
    });
    console.log('[GHL] ========================================');

    const result = await this.request<{ opportunities: any[] }>(endpoint);

    console.log('[GHL] Fetched opportunities:', result.opportunities?.length || 0);

    // Filter client-side by pipeline, stage, and status
    let filteredOpportunities = result.opportunities || [];

    if (params.pipelineId) {
      filteredOpportunities = filteredOpportunities.filter(
        (opp: any) => opp.pipelineId === params.pipelineId
      );
      console.log('[GHL] After pipeline filter:', filteredOpportunities.length);
    }

    if (params.pipelineStageId) {
      filteredOpportunities = filteredOpportunities.filter(
        (opp: any) => opp.pipelineStageId === params.pipelineStageId
      );
      console.log('[GHL] After stage filter:', filteredOpportunities.length);
    }

    if (params.status) {
      filteredOpportunities = filteredOpportunities.filter(
        (opp: any) => opp.status === params.status
      );
      console.log('[GHL] After status filter:', filteredOpportunities.length);
    }

    console.log('[GHL] ========================================');
    console.log('[GHL] FINAL RESULTS');
    console.log('[GHL] ========================================');
    console.log('[GHL] Filtered opportunities:', filteredOpportunities.length);
    if (filteredOpportunities.length > 0) {
      console.log('[GHL] First opportunity sample:', JSON.stringify(filteredOpportunities[0], null, 2));
    }
    console.log('[GHL] ========================================');

    return { opportunities: filteredOpportunities };
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
   * Get notes for a contact
   */
  async getNotes(contactId: string): Promise<{ notes: any[] }> {
    return this.request<{ notes: any[] }>(`/contacts/${contactId}/notes`);
  }

  /**
   * Get conversations for a contact
   */
  async getConversations(contactId: string): Promise<{ conversations: any[] }> {
    const params = new URLSearchParams();
    if (this.locationId) params.append("locationId", this.locationId);
    params.append("contactId", contactId);
    return this.request<{ conversations: any[] }>(`/conversations/search?${params.toString()}`);
  }

  /**
   * Get messages in a conversation
   */
  async getConversationMessages(conversationId: string): Promise<{ messages: any[] }> {
    return this.request<{ messages: any[] }>(`/conversations/${conversationId}/messages`);
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
    const payload = {
      locationId: record.locationId,
      properties: record.properties,
      relationships: record.relationships,
    };

    // Debug logging
    console.log("[GHL Custom Object] Creating record:", {
      endpoint,
      objectType: record.objectType,
      locationId: record.locationId,
      propertiesCount: Object.keys(record.properties).length,
      relationshipsCount: record.relationships?.length || 0,
    });
    console.log("[GHL Custom Object] Full payload:", JSON.stringify(payload, null, 2));

    return this.request<{ id: string }>(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
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

  /**
   * Create a Payment Link (Alternative to Invoices)
   * Creates a direct payment link that can be shared with contacts
   * Works with PayPal and other payment methods configured in GHL
   */
  async createPaymentLink(paymentLink: {
    locationId: string;
    contactId: string;
    amount: number;
    name: string;
    description?: string;
  }): Promise<{ id: string; url: string; paymentLink: any }> {
    return this.request<{ id: string; url: string; paymentLink: any }>("/payments/custom-provider/link", {
      method: "POST",
      body: JSON.stringify({
        locationId: paymentLink.locationId,
        contactId: paymentLink.contactId,
        amount: paymentLink.amount,
        name: paymentLink.name,
        description: paymentLink.description,
      }),
    });
  }

  /**
   * Create a sub-account (location) in SaaS mode
   * This creates a new location under the agency account
   */
  async createLocation(data: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    website?: string;
  }): Promise<{ id: string; location: any }> {
    return this.request<{ id: string; location: any }>("/locations/", {
      method: "POST",
      body: JSON.stringify({
        companyKey: process.env.GHL_COMPANY_ID, // Your agency company ID
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        country: data.country || "US",
        postalCode: data.postalCode || "",
        website: data.website || "",
      }),
    });
  }

  /**
   * Get location by ID
   */
  async getLocation(locationId: string): Promise<any> {
    return this.request(`/locations/${locationId}`);
  }

  /**
   * Update location details
   */
  async updateLocation(locationId: string, updates: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    website: string;
  }>): Promise<any> {
    return this.request(`/locations/${locationId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * List document templates for a location
   */
  async listDocumentTemplates(locationId: string): Promise<{ templates: any[] }> {
    return this.request<{ templates: any[] }>(`/locations/${locationId}/templates`);
  }

  /**
   * Get a specific template by ID
   * Used to validate template exists and is accessible
   */
  async getTemplate(templateId: string): Promise<any> {
    return this.request(`/proposals/templates/${templateId}`);
  }

  /**
   * Send a document/contract from a template
   * Uses GHL API v2 /proposals/templates/send endpoint
   *
   * Reference: https://help.gohighlevel.com/support/solutions/articles/155000006323
   *
   * @param templateId - The template ID to use
   * @param contactId - The contact to send to
   * @param documentName - Name for the document (e.g., "123 Main St-2026-01-06")
   * @param mergeFields - Custom fields to populate in the template (must match template field keys)
   * @param medium - Delivery method: "email" (sends automatically) or "link" (returns URL)
   */
  async sendDocumentTemplate(params: {
    templateId: string;
    contactId: string;
    documentName: string;
    mergeFields?: Record<string, any>;
    medium?: "email" | "link";
  }): Promise<{ documentId: string; document: any; url?: string }> {
    // Validate required fields
    if (!this.locationId) {
      throw new Error('Location ID is required for document creation. Initialize GHLClient with locationId.');
    }
    if (!this.userId) {
      throw new Error('User ID is required for document creation. Initialize GHLClient with userId.');
    }

    // Build payload according to GHL API v2 specification per official documentation
    // Required fields: templateId, locationId, contactId, userId, medium
    // NOTE: Template merge fields are populated from contact custom fields, not from payload
    // The contact must have custom fields set BEFORE sending the template
    // GHL uses the contactId to determine recipient - no separate recipients array needed
    const payload: any = {
      templateId: params.templateId,
      locationId: this.locationId,
      contactId: params.contactId,
      userId: this.userId, // Required despite not being in docs - API validation requires it
      medium: params.medium || "link",
    };

    console.log('[GHL] ========================================');
    console.log('[GHL] SENDING DOCUMENT TEMPLATE');
    console.log('[GHL] ========================================');
    console.log('[GHL] Endpoint: POST /proposals/templates/send');
    console.log('[GHL] Document Name:', params.documentName);
    console.log('[GHL] Note: Template populates from contact custom fields');
    console.log('[GHL] === COMPLETE REQUEST PAYLOAD ===');
    console.log(JSON.stringify(payload, null, 2));
    console.log('[GHL] === END REQUEST PAYLOAD ===');
    console.log('[GHL] Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('[GHL] ========================================');

    // Use the correct GHL API v2 endpoint for sending templates
    const result = await this.request<{ documentId: string; document: any; url?: string; link?: string }>(
      '/proposals/templates/send',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    console.log('[GHL] ========================================');
    console.log('[GHL] ✅ DOCUMENT CREATED SUCCESSFULLY');
    console.log('[GHL] ========================================');
    console.log('[GHL] === COMPLETE RESPONSE ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('[GHL] === END RESPONSE ===');
    console.log('[GHL] Document ID:', result.documentId || result.document?.id);
    console.log('[GHL] Document URL:', result.url || result.link);
    console.log('[GHL] ========================================');

    return {
      documentId: result.documentId || result.document?.id,
      document: result.document || result,
      url: result.url || result.link,
    };
  }

  /**
   * Get custom fields for a location
   * Returns all custom fields configured in GHL
   */
  async getCustomFields(locationId: string): Promise<{ customFields: any[] }> {
    return this.request<{ customFields: any[] }>(`/locations/${locationId}/customFields`);
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
    const errorText = await response.text();
    console.error('[GHL Token Refresh] ========================================');
    console.error('[GHL Token Refresh] ❌ REFRESH FAILED');
    console.error('[GHL Token Refresh] ========================================');
    console.error('[GHL Token Refresh] Status:', response.status, response.statusText);
    console.error('[GHL Token Refresh] Error Response:', errorText);
    console.error('[GHL Token Refresh] Has CLIENT_ID:', !!process.env.GHL_CLIENT_ID);
    console.error('[GHL Token Refresh] Has CLIENT_SECRET:', !!process.env.GHL_CLIENT_SECRET);
    console.error('[GHL Token Refresh] Refresh Token Prefix:', refreshToken.substring(0, 20) + '...');
    console.error('[GHL Token Refresh] ========================================');

    // Try to parse error as JSON for more details
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(`Failed to refresh GHL token: ${errorJson.error || errorJson.message || response.statusText}`);
    } catch {
      throw new Error(`Failed to refresh GHL token: ${response.status} ${response.statusText}`);
    }
  }

  return response.json();
}
