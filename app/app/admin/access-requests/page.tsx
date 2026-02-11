import { requireAdmin } from "@/lib/auth/admin-check";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AccessRequestsClient from "./access-requests-client";

// Force dynamic rendering - this page requires authentication
export const dynamic = 'force-dynamic';

export default async function AccessRequestsPage() {
  await requireAdmin();

  // Fetch all access requests
  const { data: accessRequests } = await supabaseAdmin
    .from("access_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
          Access Requests
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          Review and approve applications from potential users
        </p>
      </div>

      <AccessRequestsClient initialRequests={accessRequests || []} />
    </div>
  );
}
