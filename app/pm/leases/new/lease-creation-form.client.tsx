"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LeaseCreationForm({
  applicationId,
  propertyId,
  propertyAddress,
  propertyCity,
  propertyState,
  defaultMonthlyRent,
  defaultSecurityDeposit,
  applicantName,
  applicantEmail,
  applicantPhone,
  defaultMoveInDate,
}: {
  applicationId: string | null;
  propertyId: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  defaultMonthlyRent: number | null;
  defaultSecurityDeposit: number | null;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  defaultMoveInDate: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [tenantName, setTenantName] = useState(applicantName);
  const [tenantEmail, setTenantEmail] = useState(applicantEmail);
  const [tenantPhone, setTenantPhone] = useState(applicantPhone);

  const [startDate, setStartDate] = useState(
    defaultMoveInDate || new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(() => {
    const date = defaultMoveInDate ? new Date(defaultMoveInDate) : new Date();
    date.setFullYear(date.getFullYear() + 1); // Default to 1 year lease
    return date.toISOString().split("T")[0];
  });

  const [monthlyRent, setMonthlyRent] = useState(
    defaultMonthlyRent?.toString() || ""
  );
  const [securityDeposit, setSecurityDeposit] = useState(
    defaultSecurityDeposit?.toString() || ""
  );
  const [petDeposit, setPetDeposit] = useState("");
  const [lateFeeAmount, setLateFeeAmount] = useState("");
  const [lateFeeDays, setLateFeeDays] = useState("5"); // Default to 5 days grace period

  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Validate required fields
      if (!tenantName || !tenantEmail || !startDate || !endDate || !monthlyRent) {
        setError("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Validate dates
      if (new Date(endDate) <= new Date(startDate)) {
        setError("End date must be after start date");
        setIsSubmitting(false);
        return;
      }

      const leaseData = {
        pm_application_id: applicationId,
        pm_property_id: propertyId,
        pm_unit_id: null,
        tenant_name: tenantName.trim(),
        tenant_email: tenantEmail.trim().toLowerCase(),
        tenant_phone: tenantPhone.trim(),
        lease_start_date: startDate,
        lease_end_date: endDate,
        monthly_rent: parseFloat(monthlyRent),
        security_deposit: securityDeposit ? parseFloat(securityDeposit) : 0,
        pet_deposit: petDeposit ? parseFloat(petDeposit) : 0,
        rent_due_day: 1, // Default to 1st of month
        notice_period_days: 30, // Default to 30 days notice
        requires_professional_carpet_cleaning: false,
        requires_professional_house_cleaning: false,
        custom_requirements: notes.trim() || null,
        lease_document_type: "standard", // Can be "standard", "custom", or "ghl-template"
        custom_lease_url: null,
      };

      const response = await fetch("/api/pm/leases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaseData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create lease");
      }

      const { lease_id } = await response.json();

      // Redirect to lease detail page
      router.push(`/pm/leases/${lease_id}`);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Property Info (Read-only) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Property</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{propertyAddress}</p>
          <p className="text-sm text-muted-foreground">
            {propertyCity}, {propertyState}
          </p>
        </CardContent>
      </Card>

      {/* Tenant Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tenant Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease Terms */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lease Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Monthly Rent <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border rounded-md"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Security Deposit</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pet Deposit</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={petDeposit}
                  onChange={(e) => setPetDeposit(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Late Fee Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={lateFeeAmount}
                  onChange={(e) => setLateFeeAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Late Fee Grace Days</label>
              <input
                type="number"
                value={lateFeeDays}
                onChange={(e) => setLateFeeDays(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., 5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Any additional lease terms, conditions, or notes..."
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Lease...
            </>
          ) : (
            "Create Lease"
          )}
        </Button>
      </div>
    </form>
  );
}
