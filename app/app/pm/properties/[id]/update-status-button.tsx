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

interface UpdateStatusButtonProps {
  propertyId: string;
  currentStatus: string;
}

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "rented", label: "Rented" },
  { value: "maintenance", label: "Maintenance" },
  { value: "unavailable", label: "Unavailable" },
];

export default function UpdateStatusButton({
  propertyId,
  currentStatus,
}: UpdateStatusButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/pm/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to update property status");
        return;
      }

      toast.success(`Property status updated to ${newStatus}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating property status:", error);
      toast.error("An error occurred while updating the property status");
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
      <SelectTrigger className="w-[140px]">
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
