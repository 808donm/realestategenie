import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Building2, AlertCircle } from "lucide-react";
import TeamMembersList from "./team-members-list";
import InviteMemberButton from "./invite-member-button";
import CreateMemberButton from "./create-member-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AccountMember = {
  id: string;
  account_role: string;
  joined_at: string;
  office_id: string | null;
  agents: {
    id: string;
    email: string;
    display_name: string | null;
  };
  offices: {
    id: string;
    name: string;
  } | null;
};

type AccountUsageStatus = {
  account_id: string;
  account_name: string;
  plan_name: string;
  plan_slug: string;
  tier_level: number;
  current_agents: number;
  current_assistants: number;
  current_administrators: number;
  current_offices: number;
  agents_limit: number;
  assistants_limit: number;
  administrators_limit: number;
  offices_limit: number;
  agents_available: number;
  assistants_available: number;
  administrators_available: number;
  offices_available: number;
  agents_usage_pct: number;
  assistants_usage_pct: number;
  administrators_usage_pct: number;
  agents_warning: boolean;
  assistants_warning: boolean;
  administrators_warning: boolean;
  agents_critical: boolean;
  assistants_critical: boolean;
  administrators_critical: boolean;
};

export default async function TeamManagementPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Check if user is account owner or admin
  let { data: accountMember } = await supabase
    .from("account_members")
    .select("account_id, account_role")
    .eq("agent_id", userData.user.id)
    .eq("is_active", true)
    .single();

  // Bootstrap: if user has no account, create one and make them the owner
  if (!accountMember) {
    const agent = await supabase
      .from("agents")
      .select("display_name, email")
      .eq("id", userData.user.id)
      .single();

    const accountName = agent.data?.display_name?.trim()
      ? `${agent.data.display_name.trim()}'s Team`
      : "My Team";

    // Look up default subscription plan (Brokerage Growth — 10 agents, 5 assistants, 1 admin)
    const { data: defaultPlan } = await supabaseAdmin
      .from("subscription_plans")
      .select("id")
      .eq("slug", "brokerage-growth")
      .single();

    // Use admin client to bypass RLS for initial account creation
    const { data: newAccount, error: accountError } = await supabaseAdmin
      .from("accounts")
      .insert({
        name: accountName,
        owner_id: userData.user.id,
        billing_email: agent.data?.email || userData.user.email || "",
        subscription_plan_id: defaultPlan?.id || null,
      })
      .select("id")
      .single();

    if (accountError || !newAccount) {
      console.error("Failed to create account:", accountError);
      return (
        <div style={{ padding: 24, color: "crimson" }}>
          Failed to set up your team account. Please try again.
        </div>
      );
    }

    const { error: memberError } = await supabaseAdmin
      .from("account_members")
      .insert({
        account_id: newAccount.id,
        agent_id: userData.user.id,
        account_role: "owner",
      });

    if (memberError) {
      console.error("Failed to create account member:", memberError);
      return (
        <div style={{ padding: 24, color: "crimson" }}>
          Failed to set up your team membership. Please try again.
        </div>
      );
    }

    // Grant platform admin to the account owner
    await supabaseAdmin
      .from("agents")
      .update({ is_admin: true })
      .eq("id", userData.user.id);

    // Set directly — we just created these, no need to re-fetch through RLS
    accountMember = { account_id: newAccount.id, account_role: "owner" };
  }

  if (!accountMember || (accountMember.account_role !== "owner" && accountMember.account_role !== "admin")) {
    redirect("/app/dashboard");
  }

  const accountId = accountMember.account_id;

  // Use admin client for data queries — RLS self-referential policies on
  // account_members can block reads for freshly bootstrapped accounts.
  const db = supabaseAdmin;

  // Get account usage status
  const { data: usageStatus } = await db
    .from("account_usage_status")
    .select("*")
    .eq("account_id", accountId)
    .single();

  // Get all account members
  const { data: members } = await db
    .from("account_members")
    .select(`
      id,
      account_role,
      joined_at,
      office_id,
      agents!inner (
        id,
        email,
        display_name
      ),
      offices (
        id,
        name
      )
    `)
    .eq("account_id", accountId)
    .eq("is_active", true)
    .order("joined_at", { ascending: true });

  // Get offices for dropdown
  const { data: offices } = await db
    .from("offices")
    .select("id, name")
    .eq("account_id", accountId)
    .eq("is_active", true)
    .order("name");

  const usage = usageStatus as AccountUsageStatus | null;
  const teamMembers = (members || []) as unknown as AccountMember[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-500 mt-1">Manage your team members, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <CreateMemberButton
            accountId={accountId}
            usage={usage}
            offices={offices || []}
          />
          <InviteMemberButton
            accountId={accountId}
            usage={usage}
            offices={offices || []}
          />
        </div>
      </div>

      {/* Usage Overview Cards */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usage.current_agents} / {usage.agents_limit}
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.agents_critical
                      ? "bg-red-600"
                      : usage.agents_warning
                      ? "bg-yellow-500"
                      : "bg-green-600"
                  }`}
                  style={{ width: `${Math.min(100, usage.agents_usage_pct)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {usage.agents_available} {usage.agents_available === 1 ? "seat" : "seats"} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assistants</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usage.current_assistants} / {usage.assistants_limit}
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.assistants_critical
                      ? "bg-red-600"
                      : usage.assistants_warning
                      ? "bg-yellow-500"
                      : "bg-green-600"
                  }`}
                  style={{ width: `${Math.min(100, usage.assistants_usage_pct)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {usage.assistants_available} {usage.assistants_available === 1 ? "seat" : "seats"} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administrators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usage.current_administrators} / {usage.administrators_limit}
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.administrators_critical
                      ? "bg-red-600"
                      : usage.administrators_warning
                      ? "bg-yellow-500"
                      : "bg-green-600"
                  }`}
                  style={{ width: `${Math.min(100, usage.administrators_usage_pct)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {usage.administrators_available} {usage.administrators_available === 1 ? "seat" : "seats"} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offices</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usage.current_offices} / {usage.offices_limit}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{usage.plan_name}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warning if at capacity */}
      {usage && (usage.agents_critical || usage.assistants_critical || usage.administrators_critical) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">Seat Limit Reached</h3>
            <p className="text-sm text-yellow-800 mt-1">
              You've reached your seat limit for one or more roles. To add more team members, please upgrade your plan.
            </p>
          </div>
        </div>
      )}

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMembersList
            members={teamMembers}
            currentUserId={userData.user.id}
            accountRole={accountMember.account_role}
            offices={offices || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
