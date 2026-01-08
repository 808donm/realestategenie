"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Lease {
  id: string;
  tenant_name: string;
  tenant_email: string;
  monthly_rent: number;
  ghl_contact_id?: string;
  tenant_contact_id?: string;
  pm_properties?: { address: string };
  pm_units?: { unit_number: string };
}

interface CreateMonthlyInvoiceButtonProps {
  leases: Lease[];
}

export default function CreateMonthlyInvoiceButton({ leases }: CreateMonthlyInvoiceButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const router = useRouter();

  // Set default month and year to current
  useState(() => {
    const now = new Date();
    setMonth(String(now.getMonth() + 1).padStart(2, "0"));
    setYear(String(now.getFullYear()));
  });

  const selectedLease = leases.find((l) => l.id === selectedLeaseId);

  const handleCreateInvoice = async () => {
    if (!selectedLeaseId || !month || !year) {
      toast.error("Please select a lease, month, and year");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/pm/invoices/create-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lease_id: selectedLeaseId,
          month: parseInt(month),
          year: parseInt(year),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create invoice");
        return;
      }

      toast.success(`Invoice created! Amount: $${data.amount.toLocaleString()}`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("An error occurred while creating the invoice");
    } finally {
      setLoading(false);
    }
  };

  const getPropertyAddress = (lease: Lease) => {
    const property = lease.pm_properties;
    const unit = lease.pm_units;
    if (!property) return "Unknown Property";
    return unit ? `${property.address}, Unit ${unit.unit_number}` : property.address;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Monthly Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Monthly Rent Invoice</DialogTitle>
          <DialogDescription>
            Generate a monthly rent invoice and send it to the tenant via PayPal payment link
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Lease Selection */}
          <div className="space-y-2">
            <Label htmlFor="lease">Select Lease</Label>
            <select
              id="lease"
              value={selectedLeaseId}
              onChange={(e) => setSelectedLeaseId(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={loading}
            >
              <option value="">-- Select a lease --</option>
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.tenant_name} - {getPropertyAddress(lease)} (${lease.monthly_rent}/mo)
                </option>
              ))}
            </select>
          </div>

          {/* Month Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                disabled={loading}
              >
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                disabled={loading}
              >
                {Array.from({ length: 3 }, (_, i) => {
                  const y = new Date().getFullYear() + i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Preview */}
          {selectedLease && (
            <div className="bg-muted p-3 rounded-md space-y-1">
              <div className="font-medium">Invoice Preview:</div>
              <div className="flex justify-between text-sm">
                <span>Tenant:</span>
                <span>{selectedLease.tenant_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Property:</span>
                <span className="text-right">{getPropertyAddress(selectedLease)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Month:</span>
                <span>{new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-semibold">Amount:</span>
                <span className="font-semibold">${selectedLease.monthly_rent.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreateInvoice} disabled={loading || !selectedLeaseId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
