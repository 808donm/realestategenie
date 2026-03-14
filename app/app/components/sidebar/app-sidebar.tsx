"use client";

import Image from "next/image";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebarState } from "./use-sidebar-state";
import SidebarNavSection from "./sidebar-nav-section";
import SidebarNavItem from "./sidebar-nav-item";
import {
  NAV_SECTIONS,
  CONDITIONAL_ITEMS,
  SETTINGS_ITEMS,
  HELP_ICON,
} from "./sidebar-config";
import { HelpPanel } from "../help-panel.client";
import SignOutButton from "../../dashboard/signout-button";

export type AppSidebarProps = {
  userRole: string;
  isPlatformAdmin: boolean;
  isAccountAdmin: boolean;
  hasNoAccount: boolean;
  hasBrokerDashboard: boolean;
  displayName: string;
};

export default function AppSidebar({
  userRole,
  isPlatformAdmin,
  isAccountAdmin,
  hasNoAccount,
  hasBrokerDashboard,
  displayName,
}: AppSidebarProps) {
  const {
    isCollapsed,
    toggleCollapse,
    openSections,
    toggleSection,
    hydrated,
  } = useSidebarState();

  // Filter conditional items based on user permissions
  const visibleConditionalItems = CONDITIONAL_ITEMS.filter((item) => {
    switch (item.condition) {
      case "broker":
        // Always show (disabled if no access)
        return true;
      case "team_lead":
        return userRole === "team_lead";
      case "account_admin":
        return isAccountAdmin || hasNoAccount;
      case "platform_admin":
        return isPlatformAdmin;
      default:
        return false;
    }
  });

  const isConditionalDisabled = (condition: string) => {
    if (condition === "broker") return !hasBrokerDashboard;
    return false;
  };

  return (
    <aside
      className={`sticky top-0 h-screen overflow-y-auto bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 flex-col transition-all duration-300 hidden md:flex ${
        isCollapsed ? "w-16" : "w-60"
      } ${!hydrated ? "opacity-0" : "opacity-100"}`}
    >
      {/* Logo / Header */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-gray-100 dark:border-gray-800">
        <Link href="/app/dashboard" className="flex items-center gap-2 no-underline shrink-0">
          <Image
            src="/logo.png"
            alt="The Real Estate Genie"
            width={36}
            height={36}
            style={{ borderRadius: 4 }}
          />
          {!isCollapsed && (
            <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
              Real Estate
              <br />
              <span className="text-xs font-semibold">Genie<span className="text-[8px] align-super">™</span></span>
            </span>
          )}
        </Link>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggleCollapse}
        className="flex items-center justify-center py-2 mx-2 mt-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <PanelLeftOpen className="w-4 h-4" />
        ) : (
          <PanelLeftClose className="w-4 h-4" />
        )}
      </button>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => (
          <SidebarNavSection
            key={section.id}
            section={section}
            isOpen={openSections[section.id] ?? true}
            onToggle={() => toggleSection(section.id)}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* Conditional Items */}
        {visibleConditionalItems.length > 0 && (
          <div className="py-1">
            {!isCollapsed && (
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-black dark:text-gray-200">
                More
              </div>
            )}
            {visibleConditionalItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isCollapsed={isCollapsed}
                disabled={isConditionalDisabled(item.condition)}
                disabledTooltip={item.disabledTooltip}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom Section: Settings, Help, User */}
      <div className="border-t border-gray-100 dark:border-gray-800 py-2">
        {SETTINGS_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* Help Panel */}
        <HelpPanel
          trigger={
            <button
              className={`flex items-center gap-3 rounded-lg text-sm transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 w-full ${
                isCollapsed
                  ? "justify-center px-2 py-2 mx-1"
                  : "px-3 py-2 mx-2"
              }`}
              title={isCollapsed ? "Help" : undefined}
            >
              <HELP_ICON className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Help</span>}
            </button>
          }
        />
      </div>

      {/* User Footer */}
      <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-3">
        {!isCollapsed && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
            {displayName}
          </div>
        )}
        <SignOutButton />
      </div>
    </aside>
  );
}
