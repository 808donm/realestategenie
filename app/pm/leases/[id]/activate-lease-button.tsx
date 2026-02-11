"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function ActivateLeaseButton({ leaseId }: { leaseId: string }) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    if (!confirm("Are you sure you want to activate this lease? This will mark the property as rented and send the tenant portal invitation.")) {
      return;
    }

    setActivating(true);
    setError(null);

    try {
      const response = await fetch(`/api/pm/leases/${leaseId}/activate`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        alert("Lease activated successfully!");
        router.refresh();
      } else {
        setError(data.error || "Failed to activate lease");
        alert(data.error || "Failed to activate lease");
      }
    } catch (err) {
      console.error("Error activating lease:", err);
      setError("Network error. Please try again.");
      alert("Network error. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div>
      <Button
        variant="default"
        onClick={handleActivate}
        disabled={activating}
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        {activating ? "Activating..." : "Activate Lease"}
      </Button>
      {error && (
        <p className="text-sm text-danger mt-2">{error}</p>
      )}
    </div>
  );
}
