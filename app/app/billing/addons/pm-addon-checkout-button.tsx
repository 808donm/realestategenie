"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PmAddonCheckoutButtonProps {
  pmAddonPlanId: string;
  label?: string;
  variant?: "default" | "outline";
  className?: string;
}

export default function PmAddonCheckoutButton({
  pmAddonPlanId,
  label = "Subscribe",
  variant = "default",
  className = "w-full",
}: PmAddonCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/pm-addon-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pm_addon_plan_id: pmAddonPlanId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error("Failed to start checkout", {
          description: data.error || "Unknown error",
        });
        setLoading(false);
        return;
      }

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
      variant={variant}
      className={className}
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}
