"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CheckCircle, XCircle, FileText, Loader2 } from "lucide-react";

export default function ApplicationActions({
  applicationId,
  currentStatus,
  propertyId,
}: {
  applicationId: string;
  currentStatus: string;
  propertyId: string | null;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  const handleStatusUpdate = async (newStatus: "approved" | "rejected") => {
    setIsUpdating(true);
    setError("");

    try {
      const response = await fetch(`/api/pm/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {currentStatus === "pending" && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Approve Application
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve Application?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will approve the rental application. You can then create a lease for
                      the approved applicant.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusUpdate("approved")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="danger" disabled={isUpdating}>
                    {isUpdating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    Reject Application
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Application?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reject the rental application. This action can be reversed by
                      manually updating the status later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusUpdate("rejected")}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Reject
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {currentStatus === "approved" && propertyId && (
            <Button
              variant="default"
              onClick={() =>
                router.push(
                  `/pm/leases/new?applicationId=${applicationId}&propertyId=${propertyId}`
                )
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Lease
            </Button>
          )}

          {currentStatus === "rejected" && (
            <div className="text-muted-foreground text-sm">
              This application has been rejected. You can manually change the status in the
              database if needed.
            </div>
          )}

          {currentStatus === "approved" && !propertyId && (
            <div className="text-amber-600 text-sm">
              Cannot create lease: No property associated with this application.
            </div>
          )}
        </div>

        {currentStatus === "approved" && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ This application has been approved. You can now create a lease agreement for
              this tenant.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
