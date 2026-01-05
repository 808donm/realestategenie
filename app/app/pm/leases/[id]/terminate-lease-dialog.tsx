"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TerminateLeaseDialogProps {
  leaseId: string;
  leaseEndDate: string;
  noticePeriodDays: number;
}

export default function TerminateLeaseDialog({
  leaseId,
  leaseEndDate,
  noticePeriodDays,
}: TerminateLeaseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Calculate minimum termination date (today + notice period)
  const today = new Date();
  const minTerminationDate = new Date(today);
  minTerminationDate.setDate(minTerminationDate.getDate() + noticePeriodDays);
  const minTerminationDateStr = minTerminationDate.toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    terminationDate: minTerminationDateStr,
    noticeDate: today.toISOString().split("T")[0],
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/pm/leases/${leaseId}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to terminate lease");
      }

      const result = await response.json();
      console.log("Lease terminated:", result);

      // Close dialog and refresh page
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error terminating lease:", err);
      setError(err instanceof Error ? err.message : "Failed to terminate lease");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="danger">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Terminate Lease
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Terminate Lease</DialogTitle>
            <DialogDescription>
              Provide notice to terminate this lease. Recurring invoices will be
              stopped automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This lease requires {noticePeriodDays} days notice. The earliest
                termination date is {minTerminationDate.toLocaleDateString()}.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="noticeDate">Notice Date *</Label>
              <Input
                id="noticeDate"
                type="date"
                required
                value={formData.noticeDate}
                onChange={(e) =>
                  setFormData({ ...formData, noticeDate: e.target.value })
                }
                max={today.toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Date when termination notice was received
              </p>
            </div>

            <div>
              <Label htmlFor="terminationDate">Termination Date *</Label>
              <Input
                id="terminationDate"
                type="date"
                required
                value={formData.terminationDate}
                onChange={(e) =>
                  setFormData({ ...formData, terminationDate: e.target.value })
                }
                min={minTerminationDateStr}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Last day of tenancy (must be at least {noticePeriodDays} days from
                today)
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Tenant moving out, purchasing home, etc."
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                rows={3}
              />
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                <strong>Important:</strong> After termination:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Recurring invoices will stop automatically</li>
                  <li>
                    Lease status will change to "terminating" until the termination
                    date
                  </li>
                  <li>You can still process final charges and deposits</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={isSubmitting}>
              {isSubmitting ? "Terminating..." : "Confirm Termination"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
