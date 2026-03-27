"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { NavSection } from "./sidebar-config";
import SidebarNavItem from "./sidebar-nav-item";

export default function SidebarNavSection({
  section,
  isOpen,
  onToggle,
  isCollapsed,
}: {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
}) {
  const Icon = section.icon;

  if (isCollapsed) {
    // In collapsed mode, show section icon as a visual divider
    // Items are shown directly without section headers
    return (
      <div className="py-1">
        {section.items.map((item) => (
          <SidebarNavItem key={item.href} href={item.href} icon={item.icon} label={item.label} isCollapsed={true} />
        ))}
      </div>
    );
  }

  return (
    <div className="py-1">
      {/* Section header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-3 py-1.5 mx-0 text-xs font-semibold uppercase tracking-wider text-black dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">{section.label}</span>
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Section items with animated collapse */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {section.items.map((item) => (
          <SidebarNavItem key={item.href} href={item.href} icon={item.icon} label={item.label} isCollapsed={false} />
        ))}
      </div>
    </div>
  );
}
