import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default async function PMApplicationsPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not signed in.</div>;
  }

  const { data: applications, error } = await supabase
    .from("pm_applications")
    .select(`
      *,
      pm_properties(address),
      pm_units(unit_number)
    `)
    .eq("agent_id", userData.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Rental Applications</h2>
        <p className="text-muted-foreground">Review and manage rental applications</p>
      </div>

      {/* Applications List */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-destructive">Error loading applications: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {!error && (!applications || applications.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
            <p className="text-muted-foreground">
              Applications will appear here when visitors check in to rental open houses
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications?.map((app) => (
            <Link key={app.id} href={`/app/pm/applications/${app.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{app.applicant_name}</h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        {app.applicant_email} • {app.applicant_phone}
                      </div>
                      {app.pm_properties && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Property: {app.pm_properties.address}
                          {app.pm_units && ` - Unit ${app.pm_units.unit_number}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={
                        app.status === 'approved' ? 'success' :
                        app.status === 'rejected' ? 'danger' :
                        'default'
                      }>
                        {app.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
