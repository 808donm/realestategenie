"use client";

import { useState, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import AddStripeCard from "./add-stripe-card";
import AddPayPalAccount from "./add-paypal-account";

interface AddPaymentMethodModalProps {
  children: ReactNode;
}

export default function AddPaymentMethodModal({
  children,
}: AddPaymentMethodModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"stripe" | "paypal" | null>(
    null
  );

  const handleClose = () => {
    setOpen(false);
    setSelectedType(null);
  };

  const handleSuccess = () => {
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Choose how you'd like to pay your rent
          </DialogDescription>
        </DialogHeader>

        {!selectedType ? (
          <div className="grid gap-4 py-4">
            {/* Stripe Option */}
            <button
              onClick={() => setSelectedType("stripe")}
              className="border-2 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-start gap-4">
                <CreditCard className="h-8 w-8 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Credit or Debit Card
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Pay with Visa, Mastercard, American Express, or Discover
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Instant processing</li>
                    <li>✓ Secure and encrypted</li>
                    <li>✓ Save for future payments</li>
                  </ul>
                </div>
              </div>
            </button>

            {/* PayPal Option */}
            <button
              onClick={() => setSelectedType("paypal")}
              className="border-2 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold mt-1">
                  P
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">PayPal</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Pay with your PayPal account
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Use your PayPal balance</li>
                    <li>✓ Link your bank account</li>
                    <li>✓ Buyer protection included</li>
                  </ul>
                </div>
              </div>
            </button>

            <div className="text-center text-xs text-muted-foreground mt-4">
              Your payment information is securely stored and encrypted
            </div>
          </div>
        ) : selectedType === "stripe" ? (
          <AddStripeCard onSuccess={handleSuccess} onCancel={() => setSelectedType(null)} />
        ) : (
          <AddPayPalAccount onSuccess={handleSuccess} onCancel={() => setSelectedType(null)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
