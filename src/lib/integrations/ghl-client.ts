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
