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
import PandaDocEmbeddedForm from "./pandadoc-embedded-form";

type LeaseCreateFormProps = {
  application: any;
  property: any;
  unit: any;
  properties: any[];
  agentId: string;
  agentName: string;
  agentEmail: string;
};

export default function LeaseCreateForm({
  application,
  property,
  unit,
  properties,
  agentId,
  agentName,
  agentEmail,
}: LeaseCreateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useCustomLease, setUseCustomLease] = useState(false);
  const [customLeaseUrl, setCustomLeaseUrl] = useState("");
  const [leaseTerm, setLeaseTerm] = useState<"1" | "2" | "3" | "5" | "custom">("1");
  const [esignatureProvider, setEsignatureProvider] = useState<"auto" | "pandadoc" | "docusign">("pandadoc");
  const [pandadocTemplateId, setPandadocTemplateId] = useState("");
  const [showPandaDocForm, setShowPandaDocForm] = useState(false);
  const [pendingLeaseData, setPendingLeaseData] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Calculate default dates
  const today = new Date();
  const startDate = application?.move_in_date ? new Date(application.move_in_date) : today;
  const oneYearFromStart = new Date(startDate);
  oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);

  const [formData, setFormData] = useState({
    // Property/Unit
    pm_property_id: property?.id || "",
    pm_unit_id: unit?.id || "",

    // Tenant
    tenant_name: application?.applicant_name || "",
    tenant_email: application?.applicant_email || "",
    tenant_phone: application?.applicant_phone || "",

    // Lease Terms
    lease_start_date: application?.move_in_date || today.toISOString().split("T")[0],
    lease_end_date: oneYearFromStart.toISOString().split("T")[0],
    monthly_rent: property?.monthly_rent?.toString() || "",
    security_deposit: property?.monthly_rent?.toString() || "",
    pet_deposit: (application?.pets && Array.isArray(application.pets) && application.pets.length > 0) ? "" : "0",
    rent_due_day: "1",
    notice_period_days: "30",

    // Special Provisions
    requires_professional_carpet_cleaning: false,
    requires_professional_house_cleaning: false,
    custom_requirements: "",

    // Pets and Subletting
    pets_allowed: (application?.pets && Array.isArray(application.pets) && application.pets.length > 0) || false,
    pet_count: (application?.pets && Array.isArray(application.pets)) ? application.pets.length : 0,
    pet_types: "",
    pet_weight_limit: "",
    subletting_allowed: false,

    // Occupants
    authorized_occupants: "",

    // Late Fees
    late_fee_is_percentage: false,
    late_fee_amount: "50.00",
    late_fee_percentage: "5.00",
    late_fee_frequency: "per occurrence",
    late_grace_days: "5",

    // Other Fees
    nsf_fee: "35.00",
    deposit_return_days: "60",
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleSubmit = async () => {
    setShowConfirmation(false);

    // If PandaDoc is selected, show embedded form first
    if (esignatureProvider === "pandadoc" && !useCustomLease) {
      setPendingLeaseData(formData);
      setShowPandaDocForm(true);
      return;
    }

    // Otherwise create lease directly (for custom leases or other providers)
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
          esignature_provider: esignatureProvider === "auto" ? undefined : esignatureProvider,
          pandadoc_template_id: esignatureProvider === "pandadoc" && pandadocTemplateId ? pandadocTemplateId : undefined,
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

  const handlePandaDocCompleted = async (data: any) => {
    console.log("PandaDoc form completed with data:", data);
    setIsSubmitting(true);

    try {
      // Create the lease record with PandaDoc session data
      const response = await fetch("/api/pm/leases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingLeaseData,
          pm_application_id: application?.id || null,
          lease_document_type: "standard",
          agent_id: agentId,
          esignature_provider: "pandadoc",
          pandadoc_session_id: data.sessionId || data.id,
          pandadoc_document_id: data.documentId,
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
      setShowPandaDocForm(false);
    }
  };

  // If showing PandaDoc form, render it instead
  if (showPandaDocForm && pendingLeaseData) {
    // Prepare data for PandaDoc embedded form
    const selectedProperty = property || properties.find((p) => p.id === pendingLeaseData.pm_property_id);
    const selectedUnit = unit || selectedProperty?.pm_units?.find((u: any) => u.id === pendingLeaseData.pm_unit_id);

    // Split tenant name
    const tenantNameParts = pendingLeaseData.tenant_name.trim().split(" ");
    const tenantFirstName = tenantNameParts[0] || "";
    const tenantLastName = tenantNameParts.slice(1).join(" ") || "";

    // Split agent name
    const agentNameParts = agentName.trim().split(" ");
    const landlordFirstName = agentNameParts[0] || "";
    const landlordLastName = agentNameParts.slice(1).join(" ") || "";

    // Format move-out requirements
    const moveOutReqs: string[] = [];
    if (pendingLeaseData.requires_professional_carpet_cleaning) {
      moveOutReqs.push("Professional carpet cleaning is required upon move-out");
    }
    if (pendingLeaseData.requires_professional_house_cleaning) {
      moveOutReqs.push("Professional house cleaning is required upon move-out");
    }
    if (pendingLeaseData.custom_requirements) {
      moveOutReqs.push(pendingLeaseData.custom_requirements);
    }
    const moveOutRequirementsText = moveOutReqs.length > 0
      ? moveOutReqs.join(". ")
      : "Standard cleaning and maintenance upon move-out";

    const pandadocData = {
      contractDate: new Date().toLocaleDateString("en-US"),
      landlordFirstName,
      landlordLastName,
      landlordEmail: agentEmail,
      tenantFirstName,
      tenantLastName,
      tenantEmail: pendingLeaseData.tenant_email || "",
      tenantPhone: pendingLeaseData.tenant_phone || "",
      propertyStreetAddress: selectedProperty?.address || "",
      propertyUnitNumber: selectedUnit?.unit_number || "N/A",
      propertyCity: selectedProperty?.city || "",
      propertyState: selectedProperty?.state_province || "",
      propertyZipcode: selectedProperty?.zip_postal_code || "",
      leaseStartDate: new Date(pendingLeaseData.lease_start_date).toLocaleDateString("en-US"),
      leaseEndDate: new Date(pendingLeaseData.lease_end_date).toLocaleDateString("en-US"),
      leaseMonthlyRent: `$${parseFloat(pendingLeaseData.monthly_rent).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      leaseRentDueDay: pendingLeaseData.rent_due_day.toString(),
      leaseSecurityDeposit: `$${parseFloat(pendingLeaseData.security_deposit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      leasePetDeposit: `$${parseFloat(pendingLeaseData.pet_deposit || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      leaseNoticePeriodDays: pendingLeaseData.notice_period_days.toString(),
      leaseMoveOutRequirements: moveOutRequirementsText,
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Review and Sign Lease Agreement</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Please review the lease agreement below. Both landlord and tenant will need to sign.
            </p>
          </CardHeader>
          <CardContent>
            <PandaDocEmbeddedForm
              leaseData={pandadocData}
              onCompleted={handlePandaDocCompleted}
              height="800px"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPandaDocForm(false)}
            disabled={isSubmitting}
          >
            Back to Form
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Property Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Property</CardTitle>
          {property && (
            <p className="text-sm text-muted-foreground mt-1">
              From application for {property.address}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {property ? (
            // Read-only display when property is pre-filled from application
            <>
              <div>
                <Label>Property Address</Label>
                <div className="px-3 py-2 bg-muted rounded-md">
                  {property.address}, {property.city}, {property.state_province}
                </div>
              </div>
              {unit && (
                <div>
                  <Label>Unit</Label>
                  <div className="px-3 py-2 bg-muted rounded-md">
                    {unit.unit_number}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Editable selects when creating lease without application
            <>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Tenant Information */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
          {application && (
            <p className="text-sm text-muted-foreground mt-1">
              Pre-filled from application
            </p>
          )}
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
              readOnly={!!application}
              className={application ? "bg-muted" : ""}
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
              readOnly={!!application}
              className={application ? "bg-muted" : ""}
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
              readOnly={!!application}
              className={application ? "bg-muted" : ""}
            />
          </div>
        </CardContent>
      </Card>

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

      {/* Pets and Subletting */}
      <Card>
        <CardHeader>
          <CardTitle>Pets and Subletting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="pets_allowed"
              checked={formData.pets_allowed}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  pets_allowed: checked === true,
                })
              }
            />
            <Label htmlFor="pets_allowed" className="cursor-pointer">
              Pets Allowed
            </Label>
          </div>

          {formData.pets_allowed && (
            <div className="grid gap-4 md:grid-cols-3 pl-6 pt-2">
              <div>
                <Label htmlFor="pet_count">Number of Pets</Label>
                <Input
                  id="pet_count"
                  type="number"
                  min="0"
                  value={formData.pet_count}
                  onChange={(e) =>
                    setFormData({ ...formData, pet_count: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="pet_types">Pet Types</Label>
                <Input
                  id="pet_types"
                  placeholder="Dogs, Cats, etc."
                  value={formData.pet_types}
                  onChange={(e) =>
                    setFormData({ ...formData, pet_types: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="pet_weight_limit">Weight Limit</Label>
                <Input
                  id="pet_weight_limit"
                  placeholder="50 lbs per pet"
                  value={formData.pet_weight_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, pet_weight_limit: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="subletting_allowed"
              checked={formData.subletting_allowed}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  subletting_allowed: checked === true,
                })
              }
            />
            <Label htmlFor="subletting_allowed" className="cursor-pointer">
              Subletting Allowed
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Occupants and Late Fees */}
      <Card>
        <CardHeader>
          <CardTitle>Occupants and Late Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="authorized_occupants">Authorized Occupants</Label>
            <textarea
              id="authorized_occupants"
              rows={2}
              placeholder="List all authorized occupants (names)"
              value={formData.authorized_occupants}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  authorized_occupants: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Names of all people authorized to occupy the property
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Late Fee Configuration</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="late_fee_type">Late Fee Type *</Label>
                <select
                  id="late_fee_type"
                  required
                  value={formData.late_fee_is_percentage ? "percentage" : "flat"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      late_fee_is_percentage: e.target.value === "percentage",
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="flat">Flat Amount</option>
                  <option value="percentage">Percentage of Rent</option>
                </select>
              </div>

              <div>
                <Label htmlFor="late_fee_occurrence">Late Fee Occurrence *</Label>
                <select
                  id="late_fee_occurrence"
                  required
                  value={formData.late_fee_frequency}
                  onChange={(e) =>
                    setFormData({ ...formData, late_fee_frequency: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="per occurrence">Per Occurrence (one-time)</option>
                  <option value="per day">Per Day (daily)</option>
                </select>
              </div>

              {formData.late_fee_is_percentage ? (
                <div>
                  <Label htmlFor="late_fee_percentage">Late Fee Percentage *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="late_fee_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={formData.late_fee_percentage}
                      onChange={(e) =>
                        setFormData({ ...formData, late_fee_percentage: e.target.value })
                      }
                    />
                    <span className="text-sm">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Percentage of monthly rent (e.g., 5% of ${formData.monthly_rent || "0"})
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="late_fee_amount">Late Fee Amount *</Label>
                  <Input
                    id="late_fee_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="50.00"
                    value={formData.late_fee_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, late_fee_amount: e.target.value })
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="late_grace_days">Grace Period (Days) *</Label>
                <Input
                  id="late_grace_days"
                  type="number"
                  min="0"
                  required
                  value={formData.late_grace_days}
                  onChange={(e) =>
                    setFormData({ ...formData, late_grace_days: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Days after due date before late fee applies
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Other Fees and Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Other Fees and Policies</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="nsf_fee">NSF (Returned Check) Fee *</Label>
            <Input
              id="nsf_fee"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="35.00"
              value={formData.nsf_fee}
              onChange={(e) =>
                setFormData({ ...formData, nsf_fee: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Fee for insufficient funds / returned payments
            </p>
          </div>
          <div>
            <Label htmlFor="deposit_return_days">Security Deposit Return (Days) *</Label>
            <Input
              id="deposit_return_days"
              type="number"
              min="0"
              required
              placeholder="60"
              value={formData.deposit_return_days}
              onChange={(e) =>
                setFormData({ ...formData, deposit_return_days: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Days to return deposit after move-out (check your state law)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* E-Signature Provider */}
      <Card>
        <CardHeader>
          <CardTitle>E-Signature Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="esignature_provider">Select Provider *</Label>
            <select
              id="esignature_provider"
              required
              value={esignatureProvider}
              onChange={(e) => setEsignatureProvider(e.target.value as "auto" | "pandadoc" | "docusign")}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="auto">Auto (use first available integration)</option>
              <option value="pandadoc">PandaDoc</option>
              <option value="docusign" disabled className="text-muted-foreground">DocuSign (Coming Soon)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {esignatureProvider === "auto"
                ? "System will automatically use PandaDoc if connected"
                : esignatureProvider === "pandadoc"
                ? "Professional e-signature with PandaDoc templates"
                : "DocuSign integration coming soon"}
            </p>
          </div>

          {esignatureProvider === "pandadoc" && (
            <div>
              <Label htmlFor="pandadoc_template_id">PandaDoc Template ID (Optional)</Label>
              <Input
                id="pandadoc_template_id"
                placeholder="Leave empty to use default template"
                value={pandadocTemplateId}
                onChange={(e) => setPandadocTemplateId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use a specific template or leave empty to use your default template configured in integrations
              </p>
            </div>
          )}
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
              for e-signature via {esignatureProvider === "pandadoc" ? "PandaDoc" : "your connected integration"}.
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

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowConfirmation(false)}
        >
          <Card
            className="w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Confirm Lease Creation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Have you filled in all the required form fields and reviewed the lease details?
              </p>
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <p><strong>Tenant:</strong> {formData.tenant_name}</p>
                <p><strong>Property:</strong> {property?.address || "Selected property"}</p>
                <p><strong>Monthly Rent:</strong> ${formData.monthly_rent}</p>
                <p><strong>Lease Term:</strong> {formData.lease_start_date} to {formData.lease_end_date}</p>
                <p><strong>Pets Allowed:</strong> {formData.pets_allowed ? "Yes" : "No"}</p>
                <p><strong>Subletting Allowed:</strong> {formData.subletting_allowed ? "Yes" : "No"}</p>
                <p><strong>Late Fee Type:</strong> {formData.late_fee_is_percentage ? "Percentage" : "Flat Amount"}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Once created, this lease will be sent for e-signature. Make sure all information is correct before proceeding.
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                >
                  Review Form
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Yes, Create Lease"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </form>
  );
}
