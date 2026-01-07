"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
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

interface SendInvitationButtonProps {
  leaseId: string;
  tenantEmail: string | null;
  leaseStatus: string;
}

export default function SendInvitationButton({
  leaseId,
  tenantEmail,
  leaseStatus,
}: SendInvitationButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendInvitation = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/tenant/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lease_id: leaseId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send invitation");
        return;
      }

      toast.success("Tenant invitation sent successfully!");
      router.refresh();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("An error occurred while sending the invitation");
    } finally {
      setLoading(false);
    }
  };

  // Only show button if lease is active and tenant has email
  if (leaseStatus !== "active" || !tenantEmail) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" />
          Send Tenant Portal Invitation
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send Tenant Portal Invitation</AlertDialogTitle>
          <AlertDialogDescription>
            This will send an email invitation to <strong>{tenantEmail}</strong> to
            access the tenant portal. The invitation will be valid for 7 days.
            <br />
            <br />
            The tenant will be able to:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Pay rent online</li>
              <li>Submit maintenance requests</li>
              <li>View lease documents</li>
              <li>Message you directly</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSendInvitation} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Invitation"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
