import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CreditCheckSection from "./credit-check-section";
import ApplicationActions from "./application-actions";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not authenticated</div>;
  }

  // Fetch application with related data
  const { data: application, error } = await supabase
    .from("pm_applications")
    .select(`
      *,
      pm_properties (
        id,
        address,
        property_type
      ),
      pm_units (
        id,
        unit_number
      ),
      lead_submissions (
        id,
        submitted_at
      )
    `)
    .eq("id", id)
    .eq("agent_id", userData.user.id)
    .single();

  if (error || !application) {
    notFound();
  }

  const statusColors = {
    pending: "default",
    screening: "warning",
    approved: "success",
    rejected: "danger",
    withdrawn: "secondary",
  } as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/app/pm/applications">
              <Button variant="outline" size="sm">
                ← Back to Applications
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Rental Application</h1>
            <Badge variant={statusColors[application.status as keyof typeof statusColors]}>
              {application.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Submitted {new Date(application.created_at).toLocaleDateString()}
          </p>
        </div>

        {application.status === "approved" && (
          <Link href={`/app/pm/leases/create?application_id=${application.id}`}>
            <Button size="lg">Create Lease</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Information */}
          <Card>
            <CardHeader>
              <CardTitle>Applicant Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-semibold">{application.applicant_name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-semibold">{application.applicant_email || "Not provided"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-semibold">{application.applicant_phone || "Not provided"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Move-In Date</div>
                <div className="font-semibold">
                  {application.move_in_date
                    ? new Date(application.move_in_date).toLocaleDateString()
                    : "Not specified"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle>Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div className="font-semibold">
                    {application.pm_properties?.address || "Not specified"}
                  </div>
                </div>
                {application.pm_units && (
                  <div>
                    <div className="text-sm text-muted-foreground">Unit</div>
                    <div className="font-semibold">
                      {application.pm_units.unit_number}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Employment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-semibold capitalize">
                  {application.employment_status || "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Employer</div>
                <div className="font-semibold">
                  {application.employer_name || "Not provided"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Annual Income</div>
                <div className="font-semibold">
                  {application.annual_income
                    ? `$${Number(application.annual_income).toLocaleString()}`
                    : "Not provided"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Residence */}
          <Card>
            <CardHeader>
              <CardTitle>Current Residence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div className="font-semibold">
                    {application.current_address || "Not provided"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* References */}
          {application.applicant_references && (
            <Card>
              <CardHeader>
                <CardTitle>References</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(application.applicant_references) &&
                    application.applicant_references.map((ref: any, idx: number) => (
                      <div key={idx} className="pb-4 border-b last:border-b-0 last:pb-0">
                        <div className="font-semibold">{ref.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {ref.relationship} • {ref.phone}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pets */}
          {application.pets && (
            <Card>
              <CardHeader>
                <CardTitle>Pets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.isArray(application.pets) &&
                    application.pets.map((pet: any, idx: number) => (
                      <div key={idx} className="text-sm">
                        {pet.type} - {pet.breed} ({pet.weight} lbs)
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Contact */}
          {application.emergency_contact && (
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-semibold">
                    {(application.emergency_contact as any)?.name || "Not provided"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Relationship</div>
                  <div className="font-semibold">
                    {(application.emergency_contact as any)?.relationship || "Not provided"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-semibold">
                    {(application.emergency_contact as any)?.phone || "Not provided"}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Credit Check Section */}
          <CreditCheckSection application={application} />

          {/* Actions */}
          <ApplicationActions application={application} />
        </div>
      </div>
    </div>
  );
}
