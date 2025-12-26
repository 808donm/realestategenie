import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  User,
  Briefcase,
  Home,
  Users,
  PawPrint,
  Car,
  Shield,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import ApplicationActions from "./application-actions.client";

export default async function ApplicationDetailPage({
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

  // Fetch application with related data
  const { data: application, error } = await supabase
    .from("pm_applications")
    .select(
      `
      *,
      pm_properties (
        id,
        address,
        city,
        state_province,
        postal_code,
        monthly_rent
      ),
      lead_submissions (
        id,
        open_house_event_id,
        created_at
      )
    `
    )
    .eq("id", id)
    .eq("agent_id", user.id)
    .single();

  if (error || !application) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-destructive">Application Not Found</h1>
        <p className="text-muted-foreground mt-2">
          This application does not exist or you don't have permission to view it.
        </p>
        <Link href="/pm/applications">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      default:
        return "secondary";
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
        <Link href="/pm/applications">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Button>
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{application.applicant_name}</h1>
            <p className="text-muted-foreground mt-1">
              Application submitted on {formatDate(application.created_at)}
            </p>
          </div>
          <Badge variant={getStatusVariant(application.status)} className="text-base px-4 py-2">
            {application.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Property Info */}
      {application.pm_properties && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{application.pm_properties.address}</p>
                <p className="text-sm">
                  {application.pm_properties.city}, {application.pm_properties.state_province}{" "}
                  {application.pm_properties.postal_code}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-medium text-lg">
                  {formatCurrency(application.pm_properties.monthly_rent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{application.applicant_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </p>
                <p className="font-medium text-sm">{application.applicant_email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </p>
                <p className="font-medium text-sm">{application.applicant_phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Number of Occupants
                </p>
                <p className="font-medium">{application.number_of_occupants || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Desired Move-In Date
                </p>
                <p className="font-medium">{formatDate(application.move_in_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Employment Status</p>
              <p className="font-medium capitalize">
                {application.employment_status?.replace("_", " ") || "N/A"}
              </p>
            </div>
            {application.employer_name && (
              <div>
                <p className="text-sm text-muted-foreground">Employer</p>
                <p className="font-medium">{application.employer_name}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {application.job_title && (
                <div>
                  <p className="text-sm text-muted-foreground">Job Title</p>
                  <p className="font-medium">{application.job_title}</p>
                </div>
              )}
              {application.employment_length && (
                <div>
                  <p className="text-sm text-muted-foreground">Length of Employment</p>
                  <p className="font-medium">{application.employment_length}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Annual Income
                </p>
                <p className="font-medium text-lg">
                  {formatCurrency(application.annual_income)}
                </p>
              </div>
              {application.employer_phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Employer Phone</p>
                  <p className="font-medium">{application.employer_phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Residence */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Current Residence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Address</p>
            <p className="font-medium">{application.current_address || "N/A"}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {application.landlord_name && (
              <div>
                <p className="text-sm text-muted-foreground">Landlord Name</p>
                <p className="font-medium">{application.landlord_name}</p>
              </div>
            )}
            {application.landlord_phone && (
              <div>
                <p className="text-sm text-muted-foreground">Landlord Phone</p>
                <p className="font-medium">{application.landlord_phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Current Rent</p>
              <p className="font-medium">{formatCurrency(application.current_rent)}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {application.years_at_address && (
              <div>
                <p className="text-sm text-muted-foreground">Years at Address</p>
                <p className="font-medium">{application.years_at_address}</p>
              </div>
            )}
            {application.reason_for_moving && (
              <div>
                <p className="text-sm text-muted-foreground">Reason for Moving</p>
                <p className="font-medium">{application.reason_for_moving}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* References */}
      {application.applicant_references && application.applicant_references.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              References
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {application.applicant_references.map((ref: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4">
                  <p className="font-medium">{ref.name}</p>
                  <p className="text-sm text-muted-foreground">{ref.relationship}</p>
                  {ref.phone && (
                    <p className="text-sm flex items-center gap-1 mt-2">
                      <Phone className="h-3 w-3" />
                      {ref.phone}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Pets & Vehicles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5" />
              Pets & Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <PawPrint className="h-3 w-3" />
                Pets
              </p>
              <p className="font-medium">{application.pets || "None"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Car className="h-3 w-3" />
                Vehicles
              </p>
              <p className="font-medium">{application.vehicles || "None"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        {application.emergency_contact && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{application.emergency_contact.name || "N/A"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {application.emergency_contact.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{application.emergency_contact.phone}</p>
                  </div>
                )}
                {application.emergency_contact.relationship && (
                  <div>
                    <p className="text-sm text-muted-foreground">Relationship</p>
                    <p className="font-medium">{application.emergency_contact.relationship}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Consents & Authorizations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Consents & Authorizations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {application.background_check_consent ? (
                <Badge variant="success">✓ Authorized</Badge>
              ) : (
                <Badge variant="secondary">Not Authorized</Badge>
              )}
              <span className="text-sm">Background Check</span>
            </div>
            <div className="flex items-center gap-2">
              {application.credit_authorized ? (
                <Badge variant="success">✓ Authorized</Badge>
              ) : (
                <Badge variant="secondary">Not Authorized</Badge>
              )}
              <span className="text-sm">Credit Check</span>
            </div>
          </div>
          {application.credit_authorization_signed_at && (
            <p className="text-sm text-muted-foreground mt-4">
              Credit authorization signed on{" "}
              {formatDate(application.credit_authorization_signed_at)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <ApplicationActions
        applicationId={application.id}
        currentStatus={application.status}
        propertyId={application.pm_property_id}
      />
    </div>
  );
}
