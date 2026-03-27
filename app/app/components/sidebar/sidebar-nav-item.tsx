"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export default function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isCollapsed,
  disabled = false,
  disabledTooltip,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  const pathname = usePathname();

  // Active detection: exact match for dashboard, startsWith for nested routes
  const isActive =
    href === "/app/dashboard" ? pathname === "/app/dashboard" : pathname === href || pathname.startsWith(href + "/");

  const baseClasses = "flex items-center gap-3 rounded-lg text-sm transition-colors relative group";
  const sizeClasses = isCollapsed ? "justify-center px-2 py-2 mx-1" : "px-3 py-2 mx-2";

  if (disabled) {
    return (
      <span
        className={`${baseClasses} ${sizeClasses} text-gray-400 cursor-not-allowed opacity-50`}
        title={disabledTooltip || label}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${baseClasses} ${sizeClasses} no-underline ${
        isActive
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 font-medium"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
      title={isCollapsed ? label : undefined}
    >
      {isActive && <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-600 rounded-r" />}
      <Icon className="w-4 h-4 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
