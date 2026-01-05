"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface AddStripeCardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddStripeCard({
  onSuccess,
  onCancel,
}: AddStripeCardProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Create Stripe Setup Intent
      const res = await fetch("/api/tenant/payment-methods/setup-stripe", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initialize payment setup");
      }

      const { clientSecret, setupIntentId } = await res.json();

      // Redirect to Stripe Checkout for payment method setup
      // In a real implementation, this would use Stripe Elements or Stripe Checkout
      // For now, we'll show a placeholder message
      setSuccess(true);

      setTimeout(() => {
        router.refresh();
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to add payment method");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Stripe integration requires additional setup. This is a
          placeholder UI. In production, this would use Stripe Elements or Stripe
          Checkout to securely collect card details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Placeholder for Stripe Elements */}
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-2">
            Stripe Card Element Placeholder
          </p>
          <p className="text-sm text-muted-foreground">
            Card number, expiry, and CVC fields would appear here
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              Payment method added successfully!
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Card"
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Your card information is encrypted and securely stored by Stripe.
          We never see or store your full card details.
        </p>
      </form>
    </div>
  );
}
