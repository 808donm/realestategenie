"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutButton({ planId }: { planId: string }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error("Failed to start checkout", {
          description: data.error || "Unknown error",
        });
        setLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error("No checkout URL received");
        setLoading(false);
      }
    } catch (error: any) {
      toast.error("Checkout failed", {
        description: error.message,
      });
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting to checkout...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Continue to Payment
        </>
      )}
    </Button>
  );
}
