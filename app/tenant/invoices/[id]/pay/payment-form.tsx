"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";

type PaymentMethod = {
  id: string;
  provider: string;
  type: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
};

type PaymentFormProps = {
  paymentId: string;
  amount: number;
  savedPaymentMethods: PaymentMethod[];
};

export default function PaymentForm({
  paymentId,
  amount,
  savedPaymentMethods,
}: PaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentType, setPaymentType] = useState<"saved" | "new" | "paypal">("saved");
  const [selectedMethodId, setSelectedMethodId] = useState(
    savedPaymentMethods.find((pm) => pm.is_default)?.id || savedPaymentMethods[0]?.id || ""
  );

  const handlePayWithSaved = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/tenant/payments/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: paymentId,
          payment_method_id: selectedMethodId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Payment failed. Please try again.");
        return;
      }

      // Success! Redirect to success page
      router.push(`/tenant/invoices/${paymentId}/success`);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithStripe = async () => {
    setError("");
    setLoading(true);

    try {
      // Create Stripe Checkout session
      const response = await fetch(`/api/tenant/payments/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: paymentId,
          provider: "stripe",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create payment session");
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handlePayWithPayPal = async () => {
    setError("");
    setLoading(true);

    try {
      // Create PayPal order
      const response = await fetch(`/api/tenant/payments/create-paypal-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: paymentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create PayPal order");
        return;
      }

      // Redirect to PayPal
      window.location.href = data.approval_url;
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const hasSavedMethods = savedPaymentMethods.length > 0;

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={paymentType}
            onValueChange={(value) => setPaymentType(value as "saved" | "new" | "paypal")}
          >
            {hasSavedMethods && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="saved" id="saved" />
                <Label htmlFor="saved" className="cursor-pointer flex-1">
                  Use Saved Payment Method
                </Label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="cursor-pointer flex-1">
                Pay with Credit/Debit Card (Stripe)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="paypal" id="paypal" />
              <Label htmlFor="paypal" className="cursor-pointer flex-1">
                Pay with PayPal
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Saved Payment Methods */}
      {paymentType === "saved" && hasSavedMethods && (
        <Card>
          <CardHeader>
            <CardTitle>Your Saved Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup value={selectedMethodId} onValueChange={setSelectedMethodId}>
              {savedPaymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="cursor-pointer flex-1">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {method.brand.toUpperCase()} •••• {method.last4}
                        </div>
                        {method.exp_month && method.exp_year && (
                          <div className="text-sm text-muted-foreground">
                            Expires {method.exp_month.toString().padStart(2, "0")}/{method.exp_year}
                          </div>
                        )}
                      </div>
                      {method.is_default && (
                        <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Button
              onClick={handlePayWithSaved}
              disabled={loading || !selectedMethodId}
              className="w-full"
              size="lg"
            >
              {loading ? "Processing..." : `Pay $${amount.toFixed(2)}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Stripe Payment */}
      {paymentType === "new" && (
        <Card>
          <CardHeader>
            <CardTitle>Pay with Credit/Debit Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You'll be redirected to Stripe's secure payment page to complete your transaction.
            </p>
            <Button
              onClick={handlePayWithStripe}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Redirecting..." : `Pay $${amount.toFixed(2)} with Stripe`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PayPal Payment */}
      {paymentType === "paypal" && (
        <Card>
          <CardHeader>
            <CardTitle>Pay with PayPal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You'll be redirected to PayPal to complete your payment securely.
            </p>
            <Button
              onClick={handlePayWithPayPal}
              disabled={loading}
              className="w-full bg-[#0070ba] hover:bg-[#005ea6]"
              size="lg"
            >
              {loading ? "Redirecting..." : `Pay $${amount.toFixed(2)} with PayPal`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
