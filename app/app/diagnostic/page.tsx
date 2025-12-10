import { supabaseServer } from "@/lib/supabase/server";

export default async function DiagnosticPage() {
  const supabase = await supabaseServer();

  const checks = {
    authenticated: false,
    agentsTable: false,
    openHouseEventsTable: false,
    agentProfile: false,
    error: null as string | null,
  };

  try {
    // Check 1: Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      checks.error = `Auth error: ${authError.message}`;
    } else if (user) {
      checks.authenticated = true;
    }

    // Check 2: Agents table exists
    const { error: agentsError } = await supabase
      .from("agents")
      .select("id")
      .limit(1);

    if (!agentsError) {
      checks.agentsTable = true;
    } else {
      checks.error = `Agents table error: ${agentsError.message}`;
    }

    // Check 3: Open house events table exists
    const { error: eventsError } = await supabase
      .from("open_house_events")
      .select("id")
      .limit(1);

    if (!eventsError) {
      checks.openHouseEventsTable = true;
    } else if (!checks.error) {
      checks.error = `Open house events table error: ${eventsError.message}`;
    }

    // Check 4: Agent profile exists
    if (user && checks.agentsTable) {
      const { data: agent, error: profileError } = await supabase
        .from("agents")
        .select("id, email, display_name")
        .eq("id", user.id)
        .single();

      if (!profileError && agent) {
        checks.agentProfile = true;
      } else if (profileError && !checks.error) {
        checks.error = `Agent profile error: ${profileError.message}`;
      }
    }
  } catch (e: any) {
    checks.error = `Unexpected error: ${e.message}`;
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0 }}>
        Database Diagnostic
      </h1>

      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>System Checks</h2>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {/* Authentication */}
          <div
            style={{
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: checks.authenticated ? "#d4edda" : "#f8d7da",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {checks.authenticated ? "✅" : "❌"} Authentication
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {checks.authenticated
                ? "User is authenticated"
                : "User is not authenticated - please sign in"}
            </div>
          </div>

          {/* Agents Table */}
          <div
            style={{
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: checks.agentsTable ? "#d4edda" : "#f8d7da",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {checks.agentsTable ? "✅" : "❌"} Agents Table
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {checks.agentsTable
                ? "Table exists and is accessible"
                : "Table does not exist - run database migration"}
            </div>
          </div>

          {/* Open House Events Table */}
          <div
            style={{
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: checks.openHouseEventsTable ? "#d4edda" : "#f8d7da",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {checks.openHouseEventsTable ? "✅" : "❌"} Open House Events
              Table
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {checks.openHouseEventsTable
                ? "Table exists and is accessible"
                : "Table does not exist - run database migration"}
            </div>
          </div>

          {/* Agent Profile */}
          <div
            style={{
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: checks.agentProfile ? "#d4edda" : "#f8d7da",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {checks.agentProfile ? "✅" : "❌"} Agent Profile
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              {checks.agentProfile
                ? "Your agent profile exists"
                : "Agent profile not found - may be created after migration"}
            </div>
          </div>
        </div>

        {checks.error && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 8,
            }}
          >
            <div style={{ fontWeight: 700, color: "#856404" }}>
              ⚠️ Error Details
            </div>
            <pre
              style={{
                fontSize: 12,
                marginTop: 8,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {checks.error}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: "#e7f3ff",
            border: "1px solid #2196f3",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700 }}>📝 Next Steps</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            {!checks.agentsTable || !checks.openHouseEventsTable ? (
              <>
                <p style={{ margin: "8px 0" }}>
                  <strong>Your database tables are not set up yet.</strong> You
                  need to run the database migration:
                </p>
                <ol style={{ marginLeft: 20, marginTop: 8 }}>
                  <li>
                    Go to your{" "}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2196f3" }}
                    >
                      Supabase Dashboard
                    </a>
                  </li>
                  <li>Click on "SQL Editor" in the left sidebar</li>
                  <li>
                    Copy the contents of{" "}
                    <code>supabase/complete_setup.sql</code>
                  </li>
                  <li>Paste into the SQL Editor</li>
                  <li>Click "Run"</li>
                  <li>Refresh this page to verify</li>
                </ol>
              </>
            ) : !checks.authenticated ? (
              <p style={{ margin: "8px 0" }}>
                Please sign in to continue using the app.
              </p>
            ) : (
              <p style={{ margin: "8px 0" }}>
                ✅ All checks passed! You're ready to create open houses.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
