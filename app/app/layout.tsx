import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import SignOutButton from "./dashboard/signout-button";
import UsageWarningBanner from "./components/usage-warning-banner";
import ChangePasswordForm from "./change-password/change-password-form";

import { getSubscriptionStatus, getSuggestedUpgradePlan } from "@/lib/subscriptions/utils";
import { checkFeatureAccess } from "@/lib/subscriptions/server-utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";
  const userId = data.user?.id;

  // Get user role
  const { data: agent } = await supabase
    .from("agents")
    .select("role, display_name, must_change_password")
    .eq("id", userId)
    .single();

  const userRole = agent?.role || "agent";
  const displayName = agent?.display_name?.trim() || email;

  // Check if user is account owner or admin
  const { data: accountMember } = await supabase
    .from("account_members")
    .select("account_role")
    .eq("agent_id", userId)
    .eq("is_active", true)
    .single();

  const isAccountAdmin = accountMember?.account_role === "owner" || accountMember?.account_role === "admin";
  const hasNoAccount = !accountMember;

  // Get subscription status for usage warnings
  let subscriptionStatus = null;
  let suggestedPlan = null;

  if (userId) {
    subscriptionStatus = await getSubscriptionStatus(userId);
    if (subscriptionStatus?.plan) {
      suggestedPlan = await getSuggestedUpgradePlan(subscriptionStatus.plan.id);
    }
  }

  // Check broker dashboard access
  const hasBrokerDashboard = await checkFeatureAccess("broker-dashboard");

  // Force password change — block all app access until password is updated
  if (agent?.must_change_password) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-[1100px] mx-auto px-4 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black">
                <Image
                  src="/logo.png"
                  alt="The Real Estate Genie"
                  width={120}
                  height={120}
                  priority
                  style={{ borderRadius: 6 }}
                />
                <span className="text-lg tracking-wide hidden sm:inline">
                  The Real Estate Genie<span className="text-xs align-super">™</span>
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xs opacity-75">{displayName}</span>
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>
        <main>
          <div style={{ maxWidth: 500, margin: "0 auto", padding: "48px 18px" }}>
            <h1 className="text-2xl font-bold mb-2">Change Your Password</h1>
            <p className="text-gray-500 mb-6">
              Your account was created with a temporary password. Please set a new password to continue.
            </p>
            <ChangePasswordForm />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-4 py-5">
          {/* Logo and Email - Full Width on Mobile */}
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <Link
              href="/app/dashboard"
              className="flex items-center gap-2 font-black no-underline"
            >
              <Image
                src="/logo.png"
                alt="The Real Estate Genie"
                width={120}
                height={120}
                priority
                style={{ borderRadius: 6 }}
              />
              <span className="text-lg tracking-wide hidden sm:inline">
                The Real Estate Genie<span className="text-xs align-super">™</span>
              </span>
            </Link>

            {/* Email and Sign Out - Desktop */}
            <div className="hidden md:flex gap-3 items-center">
              <span className="text-xs opacity-75">{displayName}</span>
              <SignOutButton />
            </div>
          </div>

          {/* Navigation - Responsive Grid */}
          <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 md:gap-3">
            <NavLink href="/app/dashboard">Dashboard</NavLink>
            <NavLink
              href="/app/broker"
              disabled={!hasBrokerDashboard}
              title={!hasBrokerDashboard ? "Upgrade to Brokerage Growth to unlock" : undefined}
            >
              Broker Dashboard
            </NavLink>
            {userRole === "team_lead" && (
              <NavLink href="/app/team-lead">Team Dashboard</NavLink>
            )}
            <NavLink href="/app/mls">MLS</NavLink>
            <NavLink href="/app/pipeline">Pipeline</NavLink>
            <NavLink href="/app/open-houses">Open Houses</NavLink>
            <NavLink href="/app/leads">Leads</NavLink>
            <NavLink href="/app/contacts">Contacts</NavLink>
            <NavLink href="/app/analyzers">Calculators</NavLink>
            <NavLink href="/app/reports">Reports</NavLink>
            <NavLink href="/app/neighborhood-profiles">Neighborhoods</NavLink>
            <NavLink href="/app/pm/leases">Property Management</NavLink>
            <NavLink href="/app/integrations">Integrations</NavLink>
            <NavLink href="/app/billing">Billing</NavLink>
            <NavLink href="/app/settings/profile">Settings</NavLink>
            {(isAccountAdmin || hasNoAccount) && (
              <NavLink href="/app/team">Team</NavLink>
            )}
            {userRole === "admin" && (
              <NavLink href="/app/admin">Admin</NavLink>
            )}
          </nav>

          {/* Sign Out - Mobile */}
          <div className="md:hidden mt-4 pt-4 border-t border-gray-100">
            <div className="flex gap-3 items-center justify-end">
              <span className="text-xs opacity-75">{displayName}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Usage Warning Banners */}
      {subscriptionStatus && subscriptionStatus.hasActiveAlerts && (
        <UsageWarningBanner
          alerts={subscriptionStatus.alerts}
          plan={subscriptionStatus.plan}
          suggestedPlan={suggestedPlan}
        />
      )}

      <main>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 18px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({
  href,
  children,
  disabled = false,
  title,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  if (disabled) {
    return (
      <span
        className="no-underline font-bold py-2 px-3 border border-gray-200 rounded-xl bg-gray-100 text-center text-sm md:text-base text-gray-400 cursor-not-allowed opacity-60"
        title={title}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="no-underline font-bold py-2 px-3 border border-gray-200 rounded-xl bg-white text-center text-sm md:text-base hover:bg-gray-50 transition-colors"
      title={title}
    >
      {children}
    </Link>
  );
}
