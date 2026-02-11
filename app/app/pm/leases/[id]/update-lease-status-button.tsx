"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UpdateLeaseStatusButtonProps {
  leaseId: string;
  currentStatus: string;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending-signature", label: "Pending Signature" },
  { value: "pending_start", label: "Pending Start" },
  { value: "active", label: "Active" },
  { value: "month_to_month", label: "Month to Month" },
  { value: "terminating", label: "Terminating" },
  { value: "ended", label: "Ended" },
  { value: "terminated", label: "Terminated" },
];

export default function UpdateLeaseStatusButton({
  leaseId,
  currentStatus,
}: UpdateLeaseStatusButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/pm/leases/${leaseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to update lease status");
        return;
      }

      toast.success(`Lease status updated to ${newStatus.replace('_', ' ')}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating lease status:", error);
      toast.error("An error occurred while updating the lease status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={loading}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Change status" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
