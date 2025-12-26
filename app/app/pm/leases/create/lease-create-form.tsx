"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import CustomLeaseUpload from "./custom-lease-upload";

type LeaseCreateFormProps = {
  application: any;
  property: any;
  unit: any;
  properties: any[];
  agentId: string;
};

export default function LeaseCreateForm({
  application,
  property,
  unit,
  properties,
  agentId,
}: LeaseCreateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useCustomLease, setUseCustomLease] = useState(false);
  const [customLeaseUrl, setCustomLeaseUrl] = useState("");
  const [leaseTerm, setLeaseTerm] = useState<"1" | "2" | "3" | "5" | "custom">("1");

  // Calculate default dates
  const today = new Date();
  const oneYearFromNow = new Date(today);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  const [formData, setFormData] = useState({
    // Property/Unit
    pm_property_id: property?.id || "",
    pm_unit_id: unit?.id || "",

    // Tenant
    tenant_name: application?.applicant_name || "",
    tenant_email: application?.applicant_email || "",
    tenant_phone: application?.applicant_phone || "",

    // Lease Terms
    lease_start_date: today.toISOString().split("T")[0],
    lease_end_date: oneYearFromNow.toISOString().split("T")[0],
    monthly_rent: "",
    security_deposit: "",
    pet_deposit: "0",
    rent_due_day: "1",
    notice_period_days: "30",

    // Special Provisions
    requires_professional_carpet_cleaning: false,
    requires_professional_house_cleaning: false,
    custom_requirements: "",
  });

  // Calculate end date based on lease term
  const calculateEndDate = (startDate: string, years: number): string => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + years);
    return end.toISOString().split("T")[0];
  };

  // Handle lease term change
  const handleLeaseTermChange = (term: "1" | "2" | "3" | "5" | "custom") => {
    setLeaseTerm(term);
    if (term !== "custom") {
      const years = parseInt(term);
      const endDate = calculateEndDate(formData.lease_start_date, years);
      setFormData({ ...formData, lease_end_date: endDate });
    }
  };

  // Handle start date change - recalculate end date if not custom
  const handleStartDateChange = (startDate: string) => {
    const updates: any = { lease_start_date: startDate };
    if (leaseTerm !== "custom") {
      const years = parseInt(leaseTerm);
      updates.lease_end_date = calculateEndDate(startDate, years);
    }
    setFormData({ ...formData, ...updates });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pm/leases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          pm_application_id: application?.id || null,
          lease_document_type: useCustomLease ? "custom" : "standard",
          custom_lease_url: useCustomLease ? customLeaseUrl : null,
          agent_id: agentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create lease");
      }

      const { lease } = await response.json();

      // Redirect to lease detail page
      router.push(`/app/pm/leases/${lease.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error creating lease");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Selection */}
      {!property && (
        <Card>
          <CardHeader>
            <CardTitle>Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pm_property_id">Select Property *</Label>
              <select
                id="pm_property_id"
                required
                value={formData.pm_property_id}
                onChange={(e) => {
                  const selectedProperty = properties.find(
                    (p) => p.id === e.target.value
                  );
                  setFormData({
                    ...formData,
                    pm_property_id: e.target.value,
                    pm_unit_id: "", // Reset unit when property changes
                  });
                }}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address}
                  </option>
                ))}
              </select>
            </div>

            {formData.pm_property_id && (
              <div>
                <Label htmlFor="pm_unit_id">Unit (Optional)</Label>
                <select
                  id="pm_unit_id"
                  value={formData.pm_unit_id}
                  onChange={(e) =>
                    setFormData({ ...formData, pm_unit_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Single-family / Whole property</option>
                  {properties
                    .find((p) => p.id === formData.pm_property_id)
                    ?.pm_units?.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_number}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tenant Information */}
      {!application && (
        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="tenant_name">Tenant Name *</Label>
              <Input
                id="tenant_name"
                required
                value={formData.tenant_name}
                onChange={(e) =>
                  setFormData({ ...formData, tenant_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="tenant_email">Email</Label>
              <Input
                id="tenant_email"
                type="email"
                value={formData.tenant_email}
                onChange={(e) =>
                  setFormData({ ...formData, tenant_email: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="tenant_phone">Phone</Label>
              <Input
                id="tenant_phone"
                type="tel"
                value={formData.tenant_phone}
                onChange={(e) =>
                  setFormData({ ...formData, tenant_phone: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lease Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="lease_term">Lease Term *</Label>
            <select
              id="lease_term"
              required
              value={leaseTerm}
              onChange={(e) =>
                handleLeaseTermChange(
                  e.target.value as "1" | "2" | "3" | "5" | "custom"
                )
              }
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="1">1 Year (Most Common)</option>
              <option value="2">2 Years</option>
              <option value="3">3 Years</option>
              <option value="5">5 Years</option>
              <option value="custom">Custom Dates</option>
            </select>
          </div>
          <div>
            <Label htmlFor="lease_start_date">Start Date *</Label>
            <Input
              id="lease_start_date"
              type="date"
              required
              value={formData.lease_start_date}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="lease_end_date">End Date *</Label>
            <Input
              id="lease_end_date"
              type="date"
              required
              value={formData.lease_end_date}
              onChange={(e) =>
                setFormData({ ...formData, lease_end_date: e.target.value })
              }
              disabled={leaseTerm !== "custom"}
              className={leaseTerm !== "custom" ? "bg-muted" : ""}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {leaseTerm !== "custom"
                ? `Auto-calculated (${leaseTerm} year${leaseTerm !== "1" ? "s" : ""} from start date)`
                : "Enter custom end date"}
            </p>
          </div>
          <div>
            <Label htmlFor="monthly_rent">Monthly Rent *</Label>
            <Input
              id="monthly_rent"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="2500.00"
              value={formData.monthly_rent}
              onChange={(e) =>
                setFormData({ ...formData, monthly_rent: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="security_deposit">Security Deposit *</Label>
            <Input
              id="security_deposit"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="2500.00"
              value={formData.security_deposit}
              onChange={(e) =>
                setFormData({ ...formData, security_deposit: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="pet_deposit">Pet Deposit (if applicable)</Label>
            <Input
              id="pet_deposit"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.pet_deposit}
              onChange={(e) =>
                setFormData({ ...formData, pet_deposit: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="rent_due_day">Rent Due Day of Month *</Label>
            <select
              id="rent_due_day"
              required
              value={formData.rent_due_day}
              onChange={(e) =>
                setFormData({ ...formData, rent_due_day: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="notice_period_days">Notice Period (Days) *</Label>
            <select
              id="notice_period_days"
              required
              value={formData.notice_period_days}
              onChange={(e) =>
                setFormData({ ...formData, notice_period_days: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="30">30 days</option>
              <option value="45">45 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Required notice before tenant can move out
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Move-Out Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Move-Out Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="carpet_cleaning"
              checked={formData.requires_professional_carpet_cleaning}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  requires_professional_carpet_cleaning: checked === true,
                })
              }
            />
            <Label htmlFor="carpet_cleaning" className="cursor-pointer">
              Require professional carpet cleaning upon move-out
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="house_cleaning"
              checked={formData.requires_professional_house_cleaning}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  requires_professional_house_cleaning: checked === true,
                })
              }
            />
            <Label htmlFor="house_cleaning" className="cursor-pointer">
              Require professional house cleaning upon move-out
            </Label>
          </div>
          <div>
            <Label htmlFor="custom_requirements">
              Custom Requirements (Optional)
            </Label>
            <textarea
              id="custom_requirements"
              rows={3}
              placeholder="Any additional move-out requirements..."
              value={formData.custom_requirements}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  custom_requirements: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lease Document */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use_custom_lease"
              checked={useCustomLease}
              onCheckedChange={(checked) => setUseCustomLease(checked === true)}
            />
            <Label htmlFor="use_custom_lease" className="cursor-pointer">
              Use custom lease document (upload PDF)
            </Label>
          </div>

          {useCustomLease ? (
            <CustomLeaseUpload
              onUploadComplete={(url) => setCustomLeaseUrl(url)}
            />
          ) : (
            <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
              Standard lease template will be used. This will be generated and sent
              for e-signature via GoHighLevel.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating Lease..." : "Create Lease & Send for Signature"}
        </Button>
      </div>
    </form>
  );
}
