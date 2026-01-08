import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Home,
  User,
  Calendar,
  DollarSign,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import ActivateLeaseButton from "./activate-lease-button";

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch lease with related data
  const { data: lease, error } = await supabase
    .from("pm_leases")
    .select(
      `
      *,
      pm_properties (
        id,
        address,
        city,
        state_province,
        postal_code
      ),
      pm_tenants (
        id,
        name,
        email,
        phone_e164
      ),
      pm_applications (
        id,
        applicant_name
      )
    `
    )
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (error || !lease) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-danger">Lease Not Found</h1>
        <p className="text-muted-foreground mt-2">
          This lease does not exist or you don't have permission to view it.
        </p>
        <Link href="/pm/leases">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leases
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "pending-signature":
        return "warning";
      case "active":
        return "success";
      case "expiring":
        return "warning";
      case "expired":
        return "danger";
      default:
        return "default";
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/pm/leases">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leases
          </Button>
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Lease Details</h1>
            <p className="text-muted-foreground mt-1">
              Created on {formatDate(lease.created_at)}
            </p>
          </div>
          <Badge variant={getStatusVariant(lease.status)} className="text-base px-4 py-2">
            {lease.status.replace("-", " ").toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Property Info */}
      {lease.pm_properties && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium text-lg">{lease.pm_properties.address}</p>
              <p className="text-muted-foreground">
                {lease.pm_properties.city}, {lease.pm_properties.state_province}{" "}
                {lease.pm_properties.postal_code}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Tenant Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Tenant Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lease.pm_tenants ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{lease.pm_tenants.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </p>
                  <p className="font-medium">{lease.pm_tenants.email}</p>
                </div>
                {lease.pm_tenants.phone_e164 && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone
                    </p>
                    <p className="font-medium">{lease.pm_tenants.phone_e164}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Tenant information not available</p>
            )}
          </CardContent>
        </Card>

        {/* Lease Term */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lease Term
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDate(lease.lease_start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{formatDate(lease.lease_end_date)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lease Type</p>
              <p className="font-medium capitalize">{lease.lease_type?.replace("-", " ")}</p>
            </div>
            {lease.notice_period_days && (
              <div>
                <p className="text-sm text-muted-foreground">Notice Period</p>
                <p className="font-medium">{lease.notice_period_days} days</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="font-medium text-lg">{formatCurrency(lease.monthly_rent)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Security Deposit</p>
              <p className="font-medium text-lg">{formatCurrency(lease.security_deposit)}</p>
            </div>
            {lease.pet_deposit && lease.pet_deposit > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Pet Deposit</p>
                <p className="font-medium text-lg">{formatCurrency(lease.pet_deposit)}</p>
              </div>
            )}
            {lease.rent_due_day && (
              <div>
                <p className="text-sm text-muted-foreground">Rent Due Day</p>
                <p className="font-medium text-lg">
                  {lease.rent_due_day}
                  {lease.rent_due_day === 1
                    ? "st"
                    : lease.rent_due_day === 2
                    ? "nd"
                    : lease.rent_due_day === 3
                    ? "rd"
                    : "th"}{" "}
                  of month
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lease Document */}
      {lease.lease_document_url && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lease Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Signed Lease Agreement</p>
                <p className="text-sm text-muted-foreground">
                  {lease.lease_document_type === "custom" ? "Custom Document" : "Standard Lease"}
                </p>
              </div>
              <a
                href={lease.lease_document_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  View Document
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Move-out Requirements */}
      {lease.move_out_requirements && Object.keys(lease.move_out_requirements).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Move-Out Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lease.requires_professional_carpet_cleaning && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓</Badge>
                  <span>Professional carpet cleaning required</span>
                </div>
              )}
              {lease.requires_professional_house_cleaning && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">✓</Badge>
                  <span>Professional house cleaning required</span>
                </div>
              )}
              {lease.move_out_requirements.custom && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground mb-1">Custom Requirements:</p>
                  <p className="text-sm">{lease.move_out_requirements.custom}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Link */}
      {lease.pm_applications && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Related Application</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rental Application</p>
                <p className="text-sm text-muted-foreground">
                  Applicant: {lease.pm_applications.applicant_name}
                </p>
              </div>
              <Link href={`/pm/applications/${lease.pm_applications.id}`}>
                <Button variant="outline" size="sm">
                  View Application
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {lease.status === "pending-signature" && (
              <ActivateLeaseButton leaseId={lease.id} />
            )}
            {lease.status === "active" && (
              <>
                <Link href={`/pm/payments?lease_id=${lease.id}`}>
                  <Button variant="default">
                    <DollarSign className="mr-2 h-4 w-4" />
                    View Payments
                  </Button>
                </Link>
                <Button variant="outline">Terminate Lease</Button>
              </>
            )}
            {!lease.lease_document_url && (
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Upload Lease Document
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
