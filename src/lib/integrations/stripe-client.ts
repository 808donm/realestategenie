/**
 * Stripe Payment Client
 * Handles Stripe Checkout Session creation and payment processing
 */

export interface StripeConfig {
  stripe_secret_key: string;
  stripe_publishable_key: string;
  stripe_mode?: 'test' | 'live';
}

export interface CreateCheckoutSessionParams {
  amount: number;
  reference_id: string; // Invoice ID
  description: string;
  customer_email?: string;
  success_url: string;
  cancel_url: string;
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
  payment_intent?: string;
  status: string;
}

export class StripeClient {
  private secretKey: string;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(config: StripeConfig) {
    this.secretKey = config.stripe_secret_key;
  }

  /**
   * Make authenticated API request to Stripe
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const { method = 'POST', body } = options;

    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');

    // Convert body to URL-encoded format (Stripe's preferred format)
    let formBody = '';
    if (body) {
      formBody = Object.entries(body)
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            // Handle nested objects (e.g., metadata)
            return Object.entries(value)
              .map(([nestedKey, nestedValue]) =>
                `${encodeURIComponent(key)}[${encodeURIComponent(nestedKey)}]=${encodeURIComponent(String(nestedValue))}`
              )
              .join('&');
          }
          return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
        })
        .join('&');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody || undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Stripe API request failed');
    }

    return response.json();
  }

  /**
   * Create Stripe Checkout Session
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<StripeCheckoutSession> {
    const { amount, reference_id, description, customer_email, success_url, cancel_url } = params;

    // Stripe expects amount in cents
    const amountInCents = Math.round(amount * 100);

    const session = await this.request<any>('/checkout/sessions', {
      method: 'POST',
      body: {
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': description,
        'line_items[0][price_data][unit_amount]': amountInCents,
        'line_items[0][quantity]': 1,
        'mode': 'payment',
        'success_url': success_url,
        'cancel_url': cancel_url,
        'metadata': {
          invoice_id: reference_id,
        },
        ...(customer_email && { 'customer_email': customer_email }),
      },
    });

    return {
      id: session.id,
      url: session.url,
      payment_intent: session.payment_intent,
      status: session.status,
    };
  }

  /**
   * Retrieve Checkout Session
   */
  async getCheckoutSession(sessionId: string): Promise<any> {
    return this.request(`/checkout/sessions/${sessionId}`, {
      method: 'GET',
    });
  }

  /**
   * Retrieve Payment Intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    return this.request(`/payment_intents/${paymentIntentId}`, {
      method: 'GET',
    });
  }
}

/**
 * Create Stripe client from config
 */
export function createStripeClient(config: StripeConfig): StripeClient {
  return new StripeClient(config);
}
