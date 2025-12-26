import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Plus, AlertCircle, Check } from "lucide-react";
import { redirect } from "next/navigation";
import PaymentMethodsList from "./payment-methods-list";
import AddPaymentMethodModal from "./add-payment-method-modal";

export default async function TenantPaymentMethodsPage() {
  const supabase = await createClient();

  // Get current tenant user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/tenant/login");
  }

  // Fetch tenant user data
  const { data: tenantUser, error: tenantError } = await supabase
    .from("tenant_users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (tenantError || !tenantUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load payment methods. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Fetch payment methods
  const { data: paymentMethods, error: methodsError } = await supabase
    .from("tenant_payment_methods")
    .select("*")
    .eq("tenant_user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const hasPaymentMethods = paymentMethods && paymentMethods.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Payment Methods
        </h1>
        <p className="text-muted-foreground">
          Manage your saved payment methods for rent payments
        </p>
      </div>

      <div className="space-y-6">
        {/* Add Payment Method Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Saved Payment Methods</span>
              <AddPaymentMethodModal>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </AddPaymentMethodModal>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPaymentMethods ? (
              <PaymentMethodsList paymentMethods={paymentMethods} />
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">
                  No payment methods saved yet
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add a payment method to make rent payments faster and easier
                </p>
                <AddPaymentMethodModal>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Payment Method
                  </Button>
                </AddPaymentMethodModal>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Autopay Information */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">About Autopay</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  When you enable autopay on a payment method, your rent will be
                  automatically charged on the due date each month.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>You'll receive a confirmation email before each payment</li>
                  <li>You can disable autopay at any time</li>
                  <li>Only your default payment method can be used for autopay</li>
                  <li>Manual payments are always available</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your payment information is securely stored and encrypted. We never
            store your full card number or CVV. All payments are processed
            through industry-leading payment processors (Stripe and PayPal).
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
