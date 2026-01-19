"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccessRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  monthly_price: number;
  tier_level: number;
  max_agents: number;
  max_properties: number;
  max_tenants: number;
}

export default function AccessRequestsClient({
  initialRequests,
}: {
  initialRequests: AccessRequest[];
}) {
  const [requests, setRequests] = useState<AccessRequest[]>(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<"approve" | "reject" | "details">("details");
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Fetch subscription plans when component mounts
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await fetch("/api/admin/subscription-plans");
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "danger" | "outline"> = {
      pending: "default",
      approved: "secondary",
      payment_sent: "secondary",
      completed: "outline",
      rejected: "danger",
    };

    const labels: Record<string, string> = {
      pending: "Pending Review",
      approved: "Approved",
      payment_sent: "Payment Link Sent",
      completed: "Completed",
      rejected: "Rejected",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    if (!selectedPlan) {
      alert("Please select a subscription plan");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/approve-access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          planId: selectedPlan,
          adminNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve request");
      }

      const { checkoutUrl } = await response.json();

      // Update local state
      setRequests(
        requests.map((r) =>
          r.id === selectedRequest.id
            ? { ...r, status: "approved", admin_notes: adminNotes }
            : r
        )
      );

      // Show payment link to admin
      const planName = plans.find((p) => p.id === selectedPlan)?.name || "Selected plan";

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(checkoutUrl);
        alert(
          `✅ Request approved!\n\n` +
          `📋 Payment link copied to clipboard!\n\n` +
          `📧 Send this to ${selectedRequest.email}:\n${checkoutUrl}\n\n` +
          `Plan: ${planName}\n\n` +
          `After they pay, they'll automatically receive an invitation.`
        );
      } catch {
        alert(
          `✅ Request approved!\n\n` +
          `📧 Send this payment link to ${selectedRequest.email}:\n\n${checkoutUrl}\n\n` +
          `Plan: ${planName}\n\n` +
          `After they pay, they'll automatically receive an invitation.`
        );
      }

      // Close dialog
      setShowDialog(false);
      setAdminNotes("");
      setSelectedRequest(null);
      setSelectedPlan("");
    } catch (error: any) {
      alert(error.message || "Failed to approve request");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/reject-access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          adminNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject request");
      }

      // Update local state
      setRequests(
        requests.map((r) =>
          r.id === selectedRequest.id
            ? { ...r, status: "rejected", admin_notes: adminNotes }
            : r
        )
      );

      alert("Request rejected");

      // Close dialog
      setShowDialog(false);
      setAdminNotes("");
      setSelectedRequest(null);
    } catch (error: any) {
      alert(error.message || "Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (request: AccessRequest, type: "approve" | "reject" | "details") => {
    setSelectedRequest(request);
    setDialogType(type);
    setAdminNotes(request.admin_notes || "");
    setSelectedPlan(""); // Reset plan selection
    setShowDialog(true);
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  return (
    <>
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          onClick={() => setFilter("pending")}
        >
          Pending ({requests.filter((r) => r.status === "pending").length})
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          onClick={() => setFilter("approved")}
        >
          Approved ({requests.filter((r) => r.status === "approved" || r.status === "payment_sent").length})
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          onClick={() => setFilter("rejected")}
        >
          Rejected ({requests.filter((r) => r.status === "rejected").length})
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All ({requests.length})
        </Button>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No access requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{request.full_name}</CardTitle>
                    <CardDescription className="mt-1">
                      Applied {new Date(request.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
                  <div>{getStatusBadge(request.status)}</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${request.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {request.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${request.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {request.phone}
                    </a>
                  </div>
                  {request.company && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p>{request.company}</p>
                    </div>
                  )}
                </div>

                {request.message && (
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Message:</p>
                    <p className="text-sm whitespace-pre-wrap">{request.message}</p>
                  </div>
                )}

                {request.admin_notes && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium mb-2">Admin Notes:</p>
                    <p className="text-sm whitespace-pre-wrap">{request.admin_notes}</p>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  {request.status === "pending" && (
                    <>
                      <Button
                        onClick={() => openDialog(request, "approve")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve & Send Payment Link
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => openDialog(request, "reject")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => openDialog(request, "details")}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "approve"
                ? "Approve Access Request"
                : dialogType === "reject"
                ? "Reject Access Request"
                : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.full_name} - {selectedRequest?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRequest && (
              <>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedRequest.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedRequest.phone}</p>
                  </div>
                  {selectedRequest.company && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p className="font-medium">{selectedRequest.company}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Applied</p>
                    <p className="font-medium">
                      {new Date(selectedRequest.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedRequest.message && (
                  <div>
                    <Label>Their Message:</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedRequest.message}</p>
                    </div>
                  </div>
                )}

                {dialogType === "approve" && (
                  <div>
                    <Label htmlFor="planSelect">Select Subscription Plan *</Label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a plan..." />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingPlans ? (
                          <SelectItem value="loading" disabled>
                            Loading plans...
                          </SelectItem>
                        ) : plans.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No plans available
                          </SelectItem>
                        ) : (
                          plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - ${plan.monthly_price}/mo
                              {plan.max_agents === 999999 ? " (Unlimited)" : ` (${plan.max_agents} agents, ${plan.max_properties} properties)`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedPlan && plans.find((p) => p.id === selectedPlan) && (
                      <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                        <p className="font-medium">
                          {plans.find((p) => p.id === selectedPlan)?.name}
                        </p>
                        <p className="text-muted-foreground mt-1">
                          {plans.find((p) => p.id === selectedPlan)?.max_agents === 999999
                            ? "Unlimited agents, properties, and tenants"
                            : `Up to ${plans.find((p) => p.id === selectedPlan)?.max_agents} agents, ${plans.find((p) => p.id === selectedPlan)?.max_properties} properties, ${plans.find((p) => p.id === selectedPlan)?.max_tenants} tenants`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {dialogType !== "details" && (
                  <div>
                    <Label htmlFor="adminNotes">
                      Admin Notes {dialogType === "reject" && "(Optional)"}
                    </Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add any notes about this decision..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                )}

                {dialogType === "approve" && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>What happens next:</strong>
                    </p>
                    <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                      <li>System generates Stripe payment link for selected plan</li>
                      <li>You send the payment link to the user</li>
                      <li>After payment, user automatically receives invitation</li>
                      <li>User completes registration and can access the platform</li>
                    </ol>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={loading}>
                Cancel
              </Button>
              {dialogType === "approve" && (
                <Button
                  onClick={handleApprove}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Approving..." : "Approve & Send Payment Link"}
                </Button>
              )}
              {dialogType === "reject" && (
                <Button
                  variant="danger"
                  onClick={handleReject}
                  disabled={loading}
                >
                  {loading ? "Rejecting..." : "Reject Application"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
