/**
 * QuickBooks Online API Client
 *
 * Handles invoice and payment syncing to QBO for accounting purposes.
 * Note: Invoices are created and paid through GHL, this just syncs to QBO for bookkeeping.
 */

const QBO_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QBO_API_MINOR_VERSION = "65";

export interface QBOTokens {
  access_token: string;
  refresh_token: string;
  realmId: string;
  expires_at: string;
  refresh_expires_at: string;
}

export interface QBOCustomer {
  Id?: string;
  DisplayName: string;
  PrimaryEmailAddr?: {
    Address: string;
  };
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  GivenName?: string;
  FamilyName?: string;
}

export interface QBOInvoice {
  Id?: string;
  CustomerRef: {
    value: string; // Customer ID
  };
  Line: Array<{
    Amount: number;
    DetailType: "SalesItemLineDetail";
    SalesItemLineDetail: {
      ItemRef: {
        value: string; // Item/Product ID
      };
      Qty: number;
      UnitPrice: number;
    };
    Description?: string;
  }>;
  DueDate: string; // YYYY-MM-DD
  TxnDate?: string; // YYYY-MM-DD (defaults to today)
  DocNumber?: string; // Invoice number
  CustomField?: Array<{
    DefinitionId: string;
    Name: string;
    Type: string;
    StringValue: string;
  }>;
}

export interface QBOPayment {
  Id?: string;
  CustomerRef: {
    value: string;
  };
  TotalAmt: number;
  Line: Array<{
    Amount: number;
    LinkedTxn: Array<{
      TxnId: string; // Invoice ID
      TxnType: "Invoice";
    }>;
  }>;
  TxnDate?: string; // YYYY-MM-DD
}

export class QBOClient {
  private accessToken: string;
  private realmId: string;

  constructor(tokens: QBOTokens) {
    this.accessToken = tokens.access_token;
    this.realmId = tokens.realmId;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${QBO_API_BASE}/${this.realmId}/${endpoint}?minorversion=${QBO_API_MINOR_VERSION}`;

    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`QBO API Error (${method} ${endpoint}):`, errorText);
      throw new Error(`QBO API Error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create or update a customer (tenant) in QBO
   */
  async upsertCustomer(customer: QBOCustomer): Promise<QBOCustomer> {
    // Try to find existing customer by email
    if (customer.PrimaryEmailAddr?.Address) {
      try {
        const query = `SELECT * FROM Customer WHERE PrimaryEmailAddr = '${customer.PrimaryEmailAddr.Address}'`;
        const result = await this.query<{ Customer: QBOCustomer[] }>(query);

        if (result.Customer && result.Customer.length > 0) {
          // Update existing customer
          const existing = result.Customer[0];
          const updated = { ...existing, ...customer, Id: existing.Id };

          const response = await this.request<{ Customer: QBOCustomer }>(
            "POST",
            "customer",
            updated
          );
          return response.Customer;
        }
      } catch (error) {
        console.warn("Error searching for existing customer:", error);
      }
    }

    // Create new customer
    const response = await this.request<{ Customer: QBOCustomer }>(
      "POST",
      "customer",
      customer
    );
    return response.Customer;
  }

  /**
   * Create an invoice in QBO
   */
  async createInvoice(invoice: QBOInvoice): Promise<QBOInvoice> {
    const response = await this.request<{ Invoice: QBOInvoice }>(
      "POST",
      "invoice",
      invoice
    );
    return response.Invoice;
  }

  /**
   * Record a payment in QBO
   */
  async createPayment(payment: QBOPayment): Promise<QBOPayment> {
    const response = await this.request<{ Payment: QBOPayment }>(
      "POST",
      "payment",
      payment
    );
    return response.Payment;
  }

  /**
   * Query QBO using SQL-like syntax
   */
  async query<T>(query: string): Promise<T> {
    const encodedQuery = encodeURIComponent(query);
    const response = await this.request<{ QueryResponse: T }>(
      "GET",
      `query?query=${encodedQuery}`,
      undefined
    );
    return response.QueryResponse;
  }

  /**
   * Get or create "Rent" income account
   */
  async getOrCreateRentAccount(): Promise<{ Id: string; Name: string }> {
    try {
      const query = "SELECT * FROM Account WHERE Name = 'Rental Income' AND AccountType = 'Income'";
      const result = await this.query<{ Account: any[] }>(query);

      if (result.Account && result.Account.length > 0) {
        return result.Account[0];
      }
    } catch (error) {
      console.warn("Error searching for Rental Income account:", error);
    }

    // Create account if it doesn't exist
    const accountData = {
      Name: "Rental Income",
      AccountType: "Income",
      AccountSubType: "SalesOfProductIncome",
    };

    const response = await this.request<{ Account: any }>(
      "POST",
      "account",
      accountData
    );
    return response.Account;
  }

  /**
   * Get or create "Rent" item for invoicing
   */
  async getOrCreateRentItem(): Promise<{ Id: string; Name: string }> {
    try {
      const query = "SELECT * FROM Item WHERE Name = 'Monthly Rent' AND Type = 'Service'";
      const result = await this.query<{ Item: any[] }>(query);

      if (result.Item && result.Item.length > 0) {
        return result.Item[0];
      }
    } catch (error) {
      console.warn("Error searching for Monthly Rent item:", error);
    }

    // Get or create income account first
    const incomeAccount = await this.getOrCreateRentAccount();

    // Create item if it doesn't exist
    const itemData = {
      Name: "Monthly Rent",
      Type: "Service",
      IncomeAccountRef: {
        value: incomeAccount.Id,
      },
    };

    const response = await this.request<{ Item: any }>("POST", "item", itemData);
    return response.Item;
  }

  /**
   * Get or create "Security Deposit" item
   */
  async getOrCreateSecurityDepositItem(): Promise<{ Id: string; Name: string }> {
    try {
      const query = "SELECT * FROM Item WHERE Name = 'Security Deposit' AND Type = 'Service'";
      const result = await this.query<{ Item: any[] }>(query);

      if (result.Item && result.Item.length > 0) {
        return result.Item[0];
      }
    } catch (error) {
      console.warn("Error searching for Security Deposit item:", error);
    }

    // Get or create income account first
    const incomeAccount = await this.getOrCreateRentAccount();

    // Create item if it doesn't exist
    const itemData = {
      Name: "Security Deposit",
      Type: "Service",
      IncomeAccountRef: {
        value: incomeAccount.Id,
      },
    };

    const response = await this.request<{ Item: any }>("POST", "item", itemData);
    return response.Item;
  }
}

/**
 * Helper function to sync a GHL invoice to QBO
 */
export interface GHLInvoiceData {
  tenant_name: string;
  tenant_email: string;
  tenant_phone?: string;
  property_address: string;
  monthly_rent: number;
  security_deposit?: number;
  pet_deposit?: number;
  due_date: string;
  ghl_invoice_id: string | null; // Optional - may be null if GHL Invoice API is not available
  invoice_type: "move_in" | "monthly_rent";
}

export async function syncInvoiceToQBO(
  qboClient: QBOClient,
  invoiceData: GHLInvoiceData
): Promise<{ qbo_customer_id: string; qbo_invoice_id: string }> {
  // Step 1: Create or update customer
  const nameParts = invoiceData.tenant_name.split(" ");
  const givenName = nameParts[0];
  const familyName = nameParts.slice(1).join(" ");

  const customer = await qboClient.upsertCustomer({
    DisplayName: invoiceData.tenant_name,
    GivenName: givenName,
    FamilyName: familyName || undefined,
    PrimaryEmailAddr: {
      Address: invoiceData.tenant_email,
    },
    PrimaryPhone: invoiceData.tenant_phone
      ? {
          FreeFormNumber: invoiceData.tenant_phone,
        }
      : undefined,
  });

  console.log(`✅ QBO Customer synced: ${customer.Id} (${customer.DisplayName})`);

  // Step 2: Get or create items
  const rentItem = await qboClient.getOrCreateRentItem();

  // Step 3: Build invoice lines
  const lines: QBOInvoice["Line"] = [];

  if (invoiceData.invoice_type === "move_in") {
    // Move-in invoice with rent, security deposit, and pet deposit
    lines.push({
      Amount: invoiceData.monthly_rent,
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: rentItem.Id },
        Qty: 1,
        UnitPrice: invoiceData.monthly_rent,
      },
      Description: `First Month Rent - ${invoiceData.property_address}`,
    });

    if (invoiceData.security_deposit && invoiceData.security_deposit > 0) {
      const securityDepositItem = await qboClient.getOrCreateSecurityDepositItem();
      lines.push({
        Amount: invoiceData.security_deposit,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: securityDepositItem.Id },
          Qty: 1,
          UnitPrice: invoiceData.security_deposit,
        },
        Description: `Security Deposit - ${invoiceData.property_address}`,
      });
    }

    if (invoiceData.pet_deposit && invoiceData.pet_deposit > 0) {
      const securityDepositItem = await qboClient.getOrCreateSecurityDepositItem();
      lines.push({
        Amount: invoiceData.pet_deposit,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: securityDepositItem.Id },
          Qty: 1,
          UnitPrice: invoiceData.pet_deposit,
        },
        Description: `Pet Deposit - ${invoiceData.property_address}`,
      });
    }
  } else {
    // Monthly rent invoice
    lines.push({
      Amount: invoiceData.monthly_rent,
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: rentItem.Id },
        Qty: 1,
        UnitPrice: invoiceData.monthly_rent,
      },
      Description: `Monthly Rent - ${invoiceData.property_address}`,
    });
  }

  // Step 4: Create invoice
  const invoice = await qboClient.createInvoice({
    CustomerRef: {
      value: customer.Id!,
    },
    Line: lines,
    DueDate: invoiceData.due_date,
    TxnDate: new Date().toISOString().split("T")[0],
    // Only include GHL Invoice ID custom field if available
    ...(invoiceData.ghl_invoice_id && {
      CustomField: [
        {
          DefinitionId: "1",
          Name: "GHL Invoice ID",
          Type: "StringType",
          StringValue: invoiceData.ghl_invoice_id,
        },
      ],
    }),
  });

  console.log(`✅ QBO Invoice created: ${invoice.Id} for ${invoiceData.property_address}`);

  return {
    qbo_customer_id: customer.Id!,
    qbo_invoice_id: invoice.Id!,
  };
}

/**
 * Helper function to sync a payment to QBO
 */
export interface GHLPaymentData {
  qbo_customer_id: string;
  qbo_invoice_id: string;
  amount: number;
  payment_date?: string;
}

export async function syncPaymentToQBO(
  qboClient: QBOClient,
  paymentData: GHLPaymentData
): Promise<{ qbo_payment_id: string }> {
  const payment = await qboClient.createPayment({
    CustomerRef: {
      value: paymentData.qbo_customer_id,
    },
    TotalAmt: paymentData.amount,
    TxnDate: paymentData.payment_date || new Date().toISOString().split("T")[0],
    Line: [
      {
        Amount: paymentData.amount,
        LinkedTxn: [
          {
            TxnId: paymentData.qbo_invoice_id,
            TxnType: "Invoice",
          },
        ],
      },
    ],
  });

  console.log(`✅ QBO Payment recorded: ${payment.Id} for $${paymentData.amount}`);

  return {
    qbo_payment_id: payment.Id!,
  };
}
