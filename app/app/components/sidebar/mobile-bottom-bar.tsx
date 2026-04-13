"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Search, Map, Menu, X } from "lucide-react";
import { NAV_SECTIONS, CONDITIONAL_ITEMS, SETTINGS_ITEMS, MOBILE_TAB_ROUTES } from "./sidebar-config";
import SidebarNavItem from "./sidebar-nav-item";
import { HelpPanel } from "../help-panel.client";
import { HELP_ICON } from "./sidebar-config";
import SignOutButton from "../../dashboard/signout-button";

type MobileBottomBarProps = {
  userRole: string;
  isPlatformAdmin: boolean;
  isAccountAdmin: boolean;
  hasNoAccount: boolean;
  hasBrokerDashboard: boolean;
  displayName: string;
  adminLevel?: string;
};

const TABS = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, href: "/app/dashboard" },
  { id: "clients", label: "Clients", icon: Users, href: "/app/leads" },
  { id: "deals", label: "Deals", icon: Search, href: "/app/mls" },
  { id: "listings", label: "Listings", icon: Map, href: "/app/seller-map" },
] as const;

export default function MobileBottomBar({
  userRole,
  isPlatformAdmin,
  isAccountAdmin,
  hasNoAccount,
  hasBrokerDashboard,
  adminLevel = "none",
}: MobileBottomBarProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isTabActive = (tabId: string) => {
    const routes = MOBILE_TAB_ROUTES[tabId] || [];
    return routes.some((route) => pathname === route || pathname.startsWith(route + "/"));
  };

  // Check if current route doesn't match any tab (for More tab highlight)
  const isMoreActive = !TABS.some((tab) => isTabActive(tab.id)) && pathname.startsWith("/app/");

  const visibleConditionalItems = CONDITIONAL_ITEMS.filter((item) => {
    switch (item.condition) {
      case "broker":
        return true;
      case "team_lead":
        return userRole === "team_lead";
      case "account_admin":
        return isAccountAdmin || hasNoAccount;
      case "platform_admin":
        return isPlatformAdmin;
      case "site_admin":
        return adminLevel === "admin" || adminLevel === "global";
      case "global_admin":
        return adminLevel === "global";
      default:
        return false;
    }
  });

  return (
    <>
      {/* Tablet Hamburger Button (visible md–lg, hidden on mobile where bottom bar shows, hidden on desktop where sidebar shows) */}
      <button
        onClick={() => setIsMoreOpen(true)}
        className="fixed top-4 left-4 z-40 hidden md:flex lg:hidden items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-600 hover:bg-gray-50 transition-colors noprint"
        title="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 z-40 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {TABS.map((tab) => {
            const active = isTabActive(tab.id);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full no-underline transition-colors ${
                  active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}

          {/* More Tab */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              isMoreActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* More Sheet (slide-up) — visible on mobile + tablet */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMoreOpen(false)} />

          {/* Sheet */}
          <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-gray-950 rounded-t-2xl max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] animate-slide-up">
            {/* Handle */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-950">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Navigation</span>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* All Nav Sections */}
            <div className="py-2" onClick={() => setIsMoreOpen(false)}>
              {NAV_SECTIONS.map((section) => (
                <div key={section.id} className="py-1">
                  <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {section.label}
                  </div>
                  {section.items.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      isCollapsed={false}
                    />
                  ))}
                </div>
              ))}

              {/* Conditional Items */}
              {visibleConditionalItems.length > 0 && (
                <div className="py-1">
                  <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">More</div>
                  {visibleConditionalItems.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      isCollapsed={false}
                      disabled={item.condition === "broker" && !hasBrokerDashboard}
                      disabledTooltip={item.disabledTooltip}
                    />
                  ))}
                </div>
              )}

              {/* Settings */}
              <div className="py-1 border-t border-gray-100 dark:border-gray-800 mt-1">
                <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Settings</div>
                {SETTINGS_ITEMS.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isCollapsed={false}
                  />
                ))}
              </div>
            </div>

            {/* Help + Sign Out */}
            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-2">
              <HelpPanel
                trigger={
                  <button className="flex items-center gap-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 w-full">
                    <HELP_ICON className="w-4 h-4 shrink-0" />
                    <span>Help</span>
                  </button>
                }
              />
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
