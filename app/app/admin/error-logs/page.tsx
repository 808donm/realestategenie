import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-check";
import ErrorLogsClient from "./error-logs.client";

export default async function ErrorLogsPage() {
  await requireAdmin();

  const supabase = await supabaseServer();

  // Fetch recent error logs (last 1000 entries)
  const { data: rawErrorLogs, error } = await supabase
    .from("error_logs")
    .select(
      `
      id,
      endpoint,
      error_message,
      error_code,
      severity,
      stack_trace,
      user_agent,
      created_at,
      agent:agents(id, display_name, email)
    `
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Failed to fetch error logs:", error);
  }

  // Transform to expected type (Supabase returns relations as arrays)
  const errorLogs = (rawErrorLogs || []).map((log: any) => ({
    ...log,
    agent: log.agent?.[0] || null,
  }));

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
          Error Logs
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          Monitor and troubleshoot application errors
        </p>
      </div>

      <ErrorLogsClient errorLogs={errorLogs} />
    </div>
  );
}
