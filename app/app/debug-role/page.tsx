import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DebugRolePage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div className="p-8">Not logged in</div>;
  }

  // Check role via regular query
  const { data: agent } = await supabase
    .from("agents")
    .select("id, email, role, display_name")
    .eq("id", userData.user.id)
    .single();

  // Check role via admin client
  const { data: agentAdmin } = await supabaseAdmin
    .from("agents")
    .select("id, email, role, display_name")
    .eq("id", userData.user.id)
    .single();

  // Check subscription
  const { data: subscription } = await supabaseAdmin
    .from("agent_subscriptions")
    .select(`
      id,
      status,
      agent_id,
      subscription_plan_id,
      subscription_plans:subscription_plan_id (
        id,
        name,
        slug,
        tier_level
      )
    `)
    .eq("agent_id", userData.user.id)
    .eq("status", "active")
    .single();

  // Check if broker-dashboard feature exists
  const { data: brokerFeature } = await supabaseAdmin
    .from("features")
    .select("*")
    .eq("slug", "broker-dashboard")
    .single();

  // Check plan features for user's plan
  const { data: planFeatures } = await supabaseAdmin
    .from("plan_features")
    .select(`
      plan_id,
      feature_id,
      is_enabled,
      features (
        id,
        name,
        slug
      )
    `)
    .eq("plan_id", subscription?.subscription_plan_id || "")
    .eq("is_enabled", true);

  // Check RPC function
  let rpcResult = null;
  try {
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc("has_feature_access", {
        agent_uuid: userData.user.id,
        feature_slug: "broker-dashboard"
      });
    rpcResult = { data: rpcData, error: rpcError };
  } catch (e: any) {
    rpcResult = { error: e.message };
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>

      <div className="space-y-6">
        <div className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-2">Auth User ID</h2>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
            {userData.user.id}
          </pre>
        </div>

        <div className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-2">Agent Info (Regular Client)</h2>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(agent, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-2">Agent Info (Admin Client)</h2>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(agentAdmin, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-2">Active Subscription</h2>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(subscription, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-2">Broker Dashboard Feature</h2>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(brokerFeature, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-2">Plan Features (for your plan)</h2>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(planFeatures, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-2">RPC has_feature_access Result</h2>
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(rpcResult, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded border">
          <h2 className="font-semibold mb-2">Role Check Results</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Is broker or admin?</strong>{" "}
              {agent && (agent.role === "broker" || agent.role === "admin")
                ? "✅ YES"
                : "❌ NO"}
            </p>
            <p>
              <strong>Current role:</strong> {agent?.role || "NOT FOUND"}
            </p>
            <p>
              <strong>Expected:</strong> broker or admin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
