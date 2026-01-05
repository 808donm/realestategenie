import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminDiagnosticPage() {
  const supabase = await supabaseServer();

  // Check current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ color: "#ef4444" }}>Not Authenticated</h1>
        <p>You must be signed in to view this page.</p>
      </div>
    );
  }

  // Check if user exists in agents table
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, email, display_name, is_admin, account_status")
    .eq("id", user.id)
    .single();

  // Check if admin tables exist
  const checks = {
    userAuthenticated: !!user,
    userEmail: user.email,
    agentRecordExists: !!agent,
    agentError: agentError?.message,
    isAdmin: agent?.is_admin,
    accountStatus: agent?.account_status,
  };

  // Try to check if admin tables exist
  let tablesExist = {
    userInvitations: false,
    errorLogs: false,
  };

  try {
    const { error: inviteError } = await supabase
      .from("user_invitations")
      .select("id")
      .limit(1);
    tablesExist.userInvitations = !inviteError;
  } catch (e) {
    tablesExist.userInvitations = false;
  }

  try {
    const { error: logError } = await supabase
      .from("error_logs")
      .select("id")
      .limit(1);
    tablesExist.errorLogs = !logError;
  } catch (e) {
    tablesExist.errorLogs = false;
  }

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>
        Admin System Diagnostic
      </h1>

      <div style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          User Status
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px 0", fontWeight: 600 }}>Authenticated</td>
              <td style={{ padding: "12px 0" }}>
                <StatusBadge status={checks.userAuthenticated} />
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px 0", fontWeight: 600 }}>Email</td>
              <td style={{ padding: "12px 0", fontFamily: "monospace" }}>
                {checks.userEmail}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px 0", fontWeight: 600 }}>Agent Record</td>
              <td style={{ padding: "12px 0" }}>
                <StatusBadge status={checks.agentRecordExists} />
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px 0", fontWeight: 600 }}>Is Admin</td>
              <td style={{ padding: "12px 0" }}>
                <StatusBadge status={checks.isAdmin || false} />
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", fontWeight: 600 }}>Account Status</td>
              <td style={{ padding: "12px 0", fontFamily: "monospace" }}>
                {checks.accountStatus || "N/A"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          Database Tables
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px 0", fontWeight: 600 }}>user_invitations</td>
              <td style={{ padding: "12px 0" }}>
                <StatusBadge status={tablesExist.userInvitations} />
              </td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", fontWeight: 600 }}>error_logs</td>
              <td style={{ padding: "12px 0" }}>
                <StatusBadge status={tablesExist.errorLogs} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {(!tablesExist.userInvitations || !tablesExist.errorLogs) && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#92400e", margin: "0 0 8px 0" }}>
            ⚠️ Migration Required
          </h3>
          <p style={{ color: "#92400e", margin: "0 0 12px 0" }}>
            The admin system database tables are missing. You need to run migration 014.
          </p>
          <p style={{ color: "#92400e", margin: "0 0 8px 0", fontWeight: 600 }}>
            Steps to fix:
          </p>
          <ol style={{ color: "#92400e", margin: "0", paddingLeft: 20 }}>
            <li>Go to Supabase Dashboard → SQL Editor</li>
            <li>Open the file: <code>supabase/migrations/014_admin_system.sql</code></li>
            <li>Copy the entire contents and run it in the SQL Editor</li>
            <li>Refresh this page</li>
          </ol>
        </div>
      )}

      {!checks.isAdmin && checks.agentRecordExists && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #ef4444",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#991b1b", margin: "0 0 8px 0" }}>
            🚫 Not an Admin
          </h3>
          <p style={{ color: "#991b1b", margin: "0 0 12px 0" }}>
            Your account exists but does not have admin privileges.
          </p>
          <p style={{ color: "#991b1b", margin: "0 0 8px 0", fontWeight: 600 }}>
            To grant admin access, run this SQL:
          </p>
          <pre
            style={{
              background: "#fef2f2",
              padding: 12,
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "monospace",
              overflow: "auto",
              color: "#991b1b",
            }}
          >
            {`UPDATE agents
SET is_admin = TRUE, account_status = 'active'
WHERE email = '${user.email}';`}
          </pre>
        </div>
      )}

      {checks.isAdmin && tablesExist.userInvitations && tablesExist.errorLogs && (
        <div
          style={{
            background: "#d1fae5",
            border: "1px solid #10b981",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#065f46", margin: "0 0 8px 0" }}>
            ✓ All Checks Passed
          </h3>
          <p style={{ color: "#065f46", margin: 0 }}>
            Your admin system is properly configured. You can access the admin panel at{" "}
            <a href="/app/admin" style={{ color: "#059669", fontWeight: 600 }}>
              /app/admin
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: boolean }) {
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        background: status ? "#d1fae5" : "#fee2e2",
        color: status ? "#065f46" : "#991b1b",
      }}
    >
      {status ? "✓ Yes" : "✗ No"}
    </span>
  );
}
