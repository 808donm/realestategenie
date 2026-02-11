"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface AddPayPalAccountProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddPayPalAccount({
  onSuccess,
  onCancel,
}: AddPayPalAccountProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Create PayPal Billing Agreement
      const res = await fetch("/api/tenant/payment-methods/setup-paypal", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initialize PayPal setup");
      }

      const { approvalUrl } = await res.json();

      // In a real implementation, this would redirect to PayPal
      // For now, we'll show a placeholder message
      setSuccess(true);

      setTimeout(() => {
        router.refresh();
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to add PayPal account");
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
          <strong>Note:</strong> PayPal integration requires additional setup. This is a
          placeholder UI. In production, you would be redirected to PayPal to
          authorize the billing agreement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl">
              P
            </div>
            <div>
              <h3 className="font-semibold mb-2">Connect PayPal Account</h3>
              <p className="text-sm text-muted-foreground">
                You'll be redirected to PayPal to authorize automatic rent payments.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">What happens next:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>You'll log in to your PayPal account</li>
              <li>Review and approve the billing agreement</li>
              <li>You'll be redirected back to complete setup</li>
            </ol>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              PayPal account added successfully!
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
                Connecting...
              </>
            ) : (
              "Connect PayPal"
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You can cancel the billing agreement at any time from your PayPal account
        </p>
      </form>
    </div>
  );
}
