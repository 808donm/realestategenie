"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Trash2,
  Star,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PaymentMethod {
  id: string;
  tenant_user_id: string;
  payment_type: string;
  stripe_payment_method_id: string | null;
  stripe_customer_id: string | null;
  paypal_billing_agreement_id: string | null;
  last_four: string | null;
  card_brand: string | null;
  paypal_email: string | null;
  is_default: boolean;
  autopay_enabled: boolean;
  created_at: string;
}

interface PaymentMethodsListProps {
  paymentMethods: PaymentMethod[];
}

export default function PaymentMethodsList({
  paymentMethods,
}: PaymentMethodsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSetDefault = async (methodId: string) => {
    setLoading(methodId);
    setError("");

    try {
      const res = await fetch(`/api/tenant/payment-methods/${methodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to set default");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update payment method");
    } finally {
      setLoading(null);
    }
  };

  const handleToggleAutopay = async (methodId: string, currentValue: boolean) => {
    setLoading(methodId);
    setError("");

    try {
      const res = await fetch(`/api/tenant/payment-methods/${methodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autopay_enabled: !currentValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to toggle autopay");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update payment method");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) {
      return;
    }

    setLoading(methodId);
    setError("");

    try {
      const res = await fetch(`/api/tenant/payment-methods/${methodId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete payment method");
    } finally {
      setLoading(null);
    }
  };

  const getPaymentMethodDisplay = (method: PaymentMethod) => {
    if (method.payment_type === "stripe") {
      return {
        icon: <CreditCard className="h-5 w-5" />,
        title: `${method.card_brand || "Card"} •••• ${method.last_four}`,
        subtitle: "Credit/Debit Card",
      };
    } else {
      return {
        icon: <CreditCard className="h-5 w-5" />,
        title: method.paypal_email || "PayPal",
        subtitle: "PayPal Account",
      };
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {paymentMethods.map((method) => {
        const display = getPaymentMethodDisplay(method);
        const isLoading = loading === method.id;
        const canEnableAutopay = method.is_default;

        return (
          <div
            key={method.id}
            className={`border rounded-lg p-4 ${
              method.is_default ? "border-blue-500 bg-blue-50" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              {/* Payment Method Info */}
              <div className="flex items-start gap-3">
                <div className="mt-1">{display.icon}</div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {display.title}
                    {method.is_default && (
                      <Badge variant="default">Default</Badge>
                    )}
                    {method.autopay_enabled && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Autopay ON
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {display.subtitle}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Added {new Date(method.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {!method.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(method.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Star className="h-3 w-3 mr-1" />
                    )}
                    Set as Default
                  </Button>
                )}

                <Button
                  variant={method.autopay_enabled ? "secondary" : "outline"}
                  size="sm"
                  onClick={() =>
                    handleToggleAutopay(method.id, method.autopay_enabled)
                  }
                  disabled={isLoading || !canEnableAutopay}
                  title={
                    !canEnableAutopay
                      ? "Set as default to enable autopay"
                      : ""
                  }
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  {method.autopay_enabled ? "Disable" : "Enable"} Autopay
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(method.id)}
                  disabled={isLoading || method.is_default}
                  title={
                    method.is_default
                      ? "Cannot delete default payment method"
                      : "Delete payment method"
                  }
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 mr-1" />
                  )}
                  Delete
                </Button>
              </div>
            </div>

            {!canEnableAutopay && (
              <div className="mt-3 text-xs text-muted-foreground">
                Set this as your default payment method to enable autopay
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
