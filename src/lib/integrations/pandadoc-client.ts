/**
 * PandaDoc API Client
 *
 * Handles document creation, template management, and signature workflows
 * API Documentation: https://developers.pandadoc.com/reference/about
 */

const PANDADOC_API_PRODUCTION = "https://api.pandadoc.com/public/v1";
const PANDADOC_API_SANDBOX = "https://sandbox.pandadoc.com/public/v1";

export interface PandaDocTemplate {
  id: string;
  name: string;
  version?: string;
}

export interface PandaDocRecipient {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  signing_order?: number;
}

export interface PandaDocToken {
  name: string;
  value: string;
}

export interface PandaDocPricingItem {
  name: string;
  description?: string;
  price: number;
  qty?: number;
  tax?: {
    value: number;
    type: "percent" | "absolute";
  };
}

export interface PandaDocDocument {
  id: string;
  name: string;
  status: "document.draft" | "document.sent" | "document.completed" | "document.viewed" | "document.waiting_approval" | "document.rejected" | "document.waiting_pay" | "document.paid" | "document.voided" | "document.declined" | "document.external_review";
  date_created: string;
  date_modified: string;
  expiration_date?: string;
  recipients?: PandaDocRecipient[];
  tokens?: PandaDocToken[];
}

export interface CreateDocumentFromTemplateParams {
  name: string;
  template_uuid: string;
  recipients: PandaDocRecipient[];
  tokens?: PandaDocToken[];
  fields?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
  pricing_tables?: Array<{
    name: string;
    data_merge: boolean;
    options?: {
      currency?: string;
      discount?: { type: "percent" | "absolute"; value: number };
    };
    sections: Array<{
      title?: string;
      default?: boolean;
      rows: PandaDocPricingItem[];
    }>;
  }>;
}

export class PandaDocClient {
  private apiKey: string;
  private apiBase: string;

  constructor(apiKey: string, environment: "production" | "sandbox" = "production") {
    this.apiKey = apiKey;
    this.apiBase = environment === "sandbox" ? PANDADOC_API_SANDBOX : PANDADOC_API_PRODUCTION;
  }

  /**
   * Make authenticated request to PandaDoc API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiBase}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `API-Key ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PandaDoc API Error (${response.status}):`, errorText);
      throw new Error(`PandaDoc API error: ${response.status} - ${errorText}`);
    }

    // For 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * List all templates accessible by the API key
   */
  async listTemplates(params?: {
    tag?: string;
    count?: number;
    page?: number;
  }): Promise<{ results: PandaDocTemplate[]; count: number }> {
    const searchParams = new URLSearchParams();
    if (params?.tag) searchParams.append("tag", params.tag);
    if (params?.count) searchParams.append("count", params.count.toString());
    if (params?.page) searchParams.append("page", params.page.toString());

    const query = searchParams.toString();
    return this.request<{ results: PandaDocTemplate[]; count: number }>(
      `/templates${query ? `?${query}` : ""}`
    );
  }

  /**
   * Get template details by ID
   */
  async getTemplate(templateId: string): Promise<PandaDocTemplate> {
    return this.request<PandaDocTemplate>(`/templates/${templateId}/details`);
  }

  /**
   * Create a document from a template
   */
  async createDocumentFromTemplate(
    params: CreateDocumentFromTemplateParams
  ): Promise<PandaDocDocument> {
    return this.request<PandaDocDocument>("/documents", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Get document details by ID
   */
  async getDocument(documentId: string): Promise<PandaDocDocument> {
    return this.request<PandaDocDocument>(`/documents/${documentId}/details`);
  }

  /**
   * Send document for signature
   * Document must be in draft status
   */
  async sendDocument(documentId: string, params?: {
    message?: string;
    subject?: string;
    silent?: boolean;
  }): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>(
      `/documents/${documentId}/send`,
      {
        method: "POST",
        body: JSON.stringify({
          message: params?.message || "Please review and sign this document.",
          subject: params?.subject,
          silent: params?.silent || false,
        }),
      }
    );
  }

  /**
   * Download document as PDF
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    const url = `${this.apiBase}/documents/${documentId}/download`;

    const response = await fetch(url, {
      headers: {
        "Authorization": `API-Key ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Get document link for recipient to view/sign
   */
  async createDocumentLink(
    documentId: string,
    params?: {
      recipient?: string;
      lifetime?: number;
    }
  ): Promise<{ id: string; url: string; expires_at: string }> {
    return this.request<{ id: string; url: string; expires_at: string }>(
      `/documents/${documentId}/session`,
      {
        method: "POST",
        body: JSON.stringify({
          recipient: params?.recipient,
          lifetime: params?.lifetime || 900, // 15 minutes default
        }),
      }
    );
  }

  /**
   * Delete/void a document
   */
  async voidDocument(documentId: string): Promise<void> {
    await this.request(`/documents/${documentId}`, {
      method: "DELETE",
    });
  }

  /**
   * List all documents
   */
  async listDocuments(params?: {
    status?: string;
    tag?: string;
    count?: number;
    page?: number;
    metadata?: Record<string, string>;
  }): Promise<{ results: PandaDocDocument[]; count: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.tag) searchParams.append("tag", params.tag);
    if (params?.count) searchParams.append("count", params.count.toString());
    if (params?.page) searchParams.append("page", params.page.toString());

    if (params?.metadata) {
      Object.entries(params.metadata).forEach(([key, value]) => {
        searchParams.append(`metadata.${key}`, value);
      });
    }

    const query = searchParams.toString();
    return this.request<{ results: PandaDocDocument[]; count: number }>(
      `/documents${query ? `?${query}` : ""}`
    );
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listTemplates({ count: 1 });
      return true;
    } catch (error) {
      console.error("PandaDoc connection test failed:", error);
      return false;
    }
  }
}
