import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import SignOutButton from "./dashboard/signout-button";
import UsageWarningBanner from "./components/usage-warning-banner";
import ChangePasswordForm from "./change-password/change-password-form";
import AppSidebar from "./components/sidebar/app-sidebar";
import MobileBottomBar from "./components/sidebar/mobile-bottom-bar";

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
    .select("role, display_name, must_change_password, is_admin")
    .eq("id", userId)
    .single();

  const userRole = agent?.role || "agent";
  const displayName = agent?.display_name?.trim() || email;
  const isPlatformAdmin = agent?.is_admin === true;

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

  const sidebarProps = {
    userRole,
    isPlatformAdmin,
    isAccountAdmin,
    hasNoAccount,
    hasBrokerDashboard,
    displayName,
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      {/* Desktop Sidebar */}
      <AppSidebar {...sidebarProps} />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Usage Warning Banners */}
        {subscriptionStatus && subscriptionStatus.hasActiveAlerts && (
          <UsageWarningBanner
            alerts={subscriptionStatus.alerts}
            plan={subscriptionStatus.plan}
            suggestedPlan={suggestedPlan}
          />
        )}

        <main className="flex-1">
          <div className="max-w-[1100px] mx-auto px-4 py-5 pb-20 md:pb-5">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Bar */}
      <MobileBottomBar {...sidebarProps} />
    </div>
  );
}
