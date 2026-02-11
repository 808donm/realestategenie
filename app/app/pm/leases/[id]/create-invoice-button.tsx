"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface CreateInvoiceButtonProps {
  leaseId: string;
  leaseStatus: string;
  monthlyRent: number;
  securityDeposit: number;
  petDeposit?: number;
}

export default function CreateInvoiceButton({
  leaseId,
  leaseStatus,
  monthlyRent,
  securityDeposit,
  petDeposit,
}: CreateInvoiceButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateInvoice = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/pm/leases/${leaseId}/create-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create invoice");
        return;
      }

      toast.success(`Move-in invoice created! Total: $${data.amount.toLocaleString()}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("An error occurred while creating the invoice");
    } finally {
      setLoading(false);
    }
  };

  // Only show button if lease is active
  if (leaseStatus !== "active" && leaseStatus !== "month_to_month") {
    return null;
  }

  const totalAmount = monthlyRent + securityDeposit + (petDeposit || 0);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DollarSign className="h-4 w-4 mr-2" />
          Create Move-In Invoice
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create Move-In Invoice</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a move-in invoice in GoHighLevel and send it to the tenant.
            <br />
            <br />
            <div className="bg-muted p-3 rounded-md space-y-1">
              <div className="flex justify-between">
                <span>First Month Rent:</span>
                <span className="font-medium">${monthlyRent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Security Deposit:</span>
                <span className="font-medium">${securityDeposit.toLocaleString()}</span>
              </div>
              {petDeposit && petDeposit > 0 && (
                <div className="flex justify-between">
                  <span>Pet Deposit:</span>
                  <span className="font-medium">${petDeposit.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-semibold">Total:</span>
                <span className="font-semibold">${totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCreateInvoice} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
