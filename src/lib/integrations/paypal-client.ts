/**
 * PayPal REST API Client
 *
 * Handles invoice payments via PayPal
 * Documentation: https://developer.paypal.com/docs/api/overview/
 */

export interface PayPalConfig {
  client_id: string;
  client_secret: string;
  mode: 'sandbox' | 'live';
}

export interface PayPalOrder {
  id: string;
  status: string;
  purchase_units: Array<{
    reference_id: string;
    amount: {
      currency_code: string;
      value: string;
    };
  }>;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export class PayPalClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: PayPalConfig) {
    this.clientId = config.client_id;
    this.clientSecret = config.client_secret;
    this.baseUrl = config.mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal auth failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 min early

    return this.accessToken;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[PayPal] API Error:', {
        status: response.status,
        endpoint,
        error,
      });
      throw new Error(`PayPal API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Create an order for invoice payment
   */
  async createOrder(params: {
    amount: number;
    currency?: string;
    reference_id: string; // Invoice ID
    description: string;
    return_url: string;
    cancel_url: string;
  }): Promise<PayPalOrder> {
    const order = await this.request<PayPalOrder>('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: params.reference_id,
            description: params.description,
            amount: {
              currency_code: params.currency || 'USD',
              value: params.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: params.return_url,
          cancel_url: params.cancel_url,
          brand_name: 'Real Estate Genie',
          user_action: 'PAY_NOW',
        },
      }),
    });

    console.log('✅ PayPal order created:', order.id);
    return order;
  }

  /**
   * Capture payment for an approved order
   */
  async captureOrder(orderId: string): Promise<PayPalOrder> {
    const order = await this.request<PayPalOrder>(
      `/v2/checkout/orders/${orderId}/capture`,
      { method: 'POST' }
    );

    console.log('✅ PayPal payment captured:', orderId);
    return order;
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<PayPalOrder> {
    return this.request<PayPalOrder>(`/v2/checkout/orders/${orderId}`);
  }

  /**
   * Get approval URL from order
   */
  getApprovalUrl(order: PayPalOrder): string | null {
    const approvalLink = order.links.find(link => link.rel === 'approve');
    return approvalLink?.href || null;
  }
}

/**
 * Initialize PayPal client from integration config
 */
export function createPayPalClient(config: any): PayPalClient {
  return new PayPalClient({
    client_id: config.paypal_client_id,
    client_secret: config.paypal_client_secret,
    mode: config.paypal_mode || 'sandbox',
  });
}
