"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

type ApplicationActionsProps = {
  application: any;
};

export default function ApplicationActions({ application }: ApplicationActionsProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this application?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/pm/applications/${application.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve");
      }

      router.refresh();
    } catch (error) {
      alert("Error approving application");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Reason for rejection (optional):");
    if (reason === null) return; // User cancelled

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/pm/applications/${application.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject");
      }

      router.refresh();
    } catch (error) {
      alert("Error rejecting application");
    } finally {
      setIsProcessing(false);
    }
  };

  // Only show actions for pending/screening applications
  if (!["pending", "screening"].includes(application.status)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={handleApprove}
          disabled={isProcessing}
          className="w-full"
          variant="default"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve Application
        </Button>
        <Button
          onClick={handleReject}
          disabled={isProcessing}
          className="w-full"
          variant="outline"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject Application
        </Button>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Approving this application will allow you to create a lease for the tenant.
        </div>
      </CardContent>
    </Card>
  );
}
