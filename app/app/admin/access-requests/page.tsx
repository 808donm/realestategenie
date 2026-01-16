import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import AccessRequestsClient from "./access-requests-client";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function AccessRequestsPage() {
  const supabase = await supabaseServer();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Check if user is an admin
  const { data: agent } = await supabase
    .from("agents")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!agent || agent.role !== "admin") {
    redirect("/app");
  }

  // Fetch all access requests
  const { data: accessRequests } = await admin
    .from("access_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Access Requests</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve applications from potential users
          </p>
        </div>

        <AccessRequestsClient initialRequests={accessRequests || []} />
      </div>
    </div>
  );
}
