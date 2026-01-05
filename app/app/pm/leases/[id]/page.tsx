import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, FileSignature, Home, User, DollarSign, Calendar, FileText, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import TerminateLeaseDialog from "./terminate-lease-dialog";

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not signed in.</div>;
  }

  const { data: lease, error } = await supabase
    .from("pm_leases")
    .select(`
      *,
      pm_properties (*),
      pm_units (*),
      pm_applications (*)
    `)
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (error || !lease) {
    notFound();
  }

  // Extract related data (Supabase returns as arrays)
  const property = Array.isArray(lease.pm_properties) ? lease.pm_properties[0] : lease.pm_properties;
  const unit = Array.isArray(lease.pm_units) ? lease.pm_units[0] : lease.pm_units;
  const application = Array.isArray(lease.pm_applications) ? lease.pm_applications[0] : lease.pm_applications;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "month_to_month":
        return "default";
      case "pending_signature":
        return "warning";
      case "terminating":
        return "warning";
      case "ended":
        return "secondary";
      case "cancelled":
        return "danger";
      default:
        return "default";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDayOrdinal = (day: number) => {
    if (day === 1 || day === 21 || day === 31) return `${day}st`;
    if (day === 2 || day === 22) return `${day}nd`;
    if (day === 3 || day === 23) return `${day}rd`;
    return `${day}th`;
  };

  // Calculate lease progress
  const startDate = new Date(lease.lease_start_date);
  const endDate = new Date(lease.lease_end_date);
  const today = new Date();
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/pm/leases">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Lease Details</h2>
            <p className="text-muted-foreground">
              {property?.address}
              {unit && ` - Unit ${unit.unit_number}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(lease.status === "active" || lease.status === "month_to_month") && (
            <TerminateLeaseDialog
              leaseId={lease.id}
              leaseEndDate={lease.lease_end_date}
              noticePeriodDays={lease.notice_period_days}
            />
          )}
          <Badge variant={getStatusVariant(lease.status)} className="text-sm px-3 py-1">
            {lease.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${lease.monthly_rent?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Due {getDayOrdinal(lease.rent_due_day)} of each month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Deposit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${lease.security_deposit?.toLocaleString()}</div>
            {lease.pet_deposit > 0 && (
              <p className="text-xs text-muted-foreground">
                + ${lease.pet_deposit} pet deposit
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lease Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {Math.round(totalDays / 365)} Year{Math.round(totalDays / 365) !== 1 ? 's' : ''}
            </div>
            <p className="text-xs text-muted-foreground">
              {lease.status === 'active' && daysRemaining > 0
                ? `${daysRemaining} days remaining`
                : 'View dates below'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notice Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lease.notice_period_days}</div>
            <p className="text-xs text-muted-foreground">days required</p>
          </CardContent>
        </Card>
      </div>

      {/* Lease Progress (for active leases) */}
      {lease.status === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle>Lease Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Start: {formatDate(lease.lease_start_date)}</span>
              <span>End: {formatDate(lease.lease_end_date)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-muted-foreground text-center">
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Lease expired'}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Property Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <CardTitle>Property Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="font-medium">{property?.address}</div>
              <div className="text-sm">
                {property?.city}, {property?.state_province} {property?.zip_postal_code}
              </div>
            </div>
            {unit && (
              <div>
                <div className="text-sm text-muted-foreground">Unit</div>
                <div className="font-medium">{unit.unit_number}</div>
                <div className="text-sm">
                  {unit.bedrooms} bed • {unit.bathrooms} bath
                </div>
              </div>
            )}
            {property && (
              <Link href={`/app/pm/properties/${property.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  View Property Details
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Tenant Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <CardTitle>Tenant Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{lease.tenant_name}</div>
            </div>
            {lease.tenant_email && (
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="text-sm">{lease.tenant_email}</div>
              </div>
            )}
            {lease.tenant_phone && (
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="text-sm">{lease.tenant_phone}</div>
              </div>
            )}
            {lease.ghl_contact_id && (
              <div>
                <Badge variant="outline" className="text-xs">
                  <FileSignature className="h-3 w-3 mr-1" />
                  GHL Contact Linked
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lease Terms */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <CardTitle>Lease Terms</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Start Date</span>
              <span className="font-semibold">{formatDate(lease.lease_start_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">End Date</span>
              <span className="font-semibold">{formatDate(lease.lease_end_date)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Rent</span>
              <span className="font-semibold">${lease.monthly_rent?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Security Deposit</span>
              <span className="font-semibold">${lease.security_deposit?.toLocaleString()}</span>
            </div>
            {lease.pet_deposit > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pet Deposit</span>
                <span className="font-semibold">${lease.pet_deposit?.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lease Documents & Signature */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              <CardTitle>Documents & Signature</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Document Type</div>
              <Badge variant="outline">
                {lease.lease_document_type === 'custom' ? 'Custom Lease' : 'Standard Template'}
              </Badge>
            </div>
            {lease.ghl_contract_id && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">GHL Contract</div>
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-xs">
                    Contract Created
                  </Badge>
                  {lease.ghl_contract_url && (
                    <a
                      href={lease.ghl_contract_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        View in GHL
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
            {lease.custom_lease_url && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Custom Document</div>
                <a
                  href={lease.custom_lease_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="h-3 w-3 mr-2" />
                    View Custom Lease
                  </Button>
                </a>
              </div>
            )}
            {application && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Source</div>
                <Link href={`/app/pm/applications/${application.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="h-3 w-3 mr-2" />
                    View Application
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Move-Out Requirements */}
      {(lease.requires_professional_carpet_cleaning ||
        lease.requires_professional_house_cleaning ||
        lease.custom_requirements) && (
        <Card>
          <CardHeader>
            <CardTitle>Move-Out Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lease.requires_professional_carpet_cleaning && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Required</Badge>
                <span className="text-sm">Professional carpet cleaning</span>
              </div>
            )}
            {lease.requires_professional_house_cleaning && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Required</Badge>
                <span className="text-sm">Professional house cleaning</span>
              </div>
            )}
            {lease.custom_requirements && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm text-muted-foreground mb-1">Additional Requirements</div>
                <div className="text-sm whitespace-pre-wrap">{lease.custom_requirements}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Termination Notice (if lease is terminating) */}
      {lease.status === "terminating" && lease.termination_date && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="text-yellow-600">Termination Notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Notice Received</span>
              <span className="font-semibold">
                {formatDate(lease.termination_notice_date || lease.termination_date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Termination Date</span>
              <span className="font-semibold">{formatDate(lease.termination_date)}</span>
            </div>
            {lease.termination_reason && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Reason</div>
                <div className="text-sm">{lease.termination_reason}</div>
              </div>
            )}
            <div className="pt-3 border-t">
              <Badge variant="warning">Recurring invoices stopped</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Invoice Information */}
      {lease.auto_invoice_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-Invoice Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="success">Enabled</Badge>
              <span className="text-sm text-muted-foreground">
                Invoices will be automatically generated and sent via GoHighLevel
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
