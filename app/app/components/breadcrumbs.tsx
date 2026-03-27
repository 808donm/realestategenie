"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  calendar: "Calendar",
  pipeline: "Pipeline",
  leads: "Leads",
  contacts: "Contacts",
  "open-houses": "Open Houses",
  mls: "MLS",
  "property-data": "Property Intel",
  "neighborhood-profiles": "Neighborhoods",
  analyzers: "Calculators",
  "seller-map": "Seller Map",
  farm: "Farm & Watchdog",
  reports: "Reports",
  broker: "Broker Dashboard",
  "team-lead": "Team Lead",
  team: "Team",
  admin: "Admin",
  integrations: "Integrations",
  billing: "Billing",
  settings: "Settings",
  security: "Security",
  tasks: "Tasks",
  // Sub-routes
  new: "New",
  edit: "Edit",
  attendees: "Attendees",
  scorecard: "Scorecard",
  profile: "Profile",
  "1031": "1031 Exchange",
  brrr: "BRRR",
  "cash-to-close": "Cash to Close",
  "commission-split": "Commission Split",
  compare: "Compare",
  flip: "Flip",
  investment: "Investment",
  mortgage: "Mortgage",
  "net-sheet": "Net Sheet",
  "quick-flip": "Quick Flip",
  rental: "Rental",
  "wholesale-mao": "Wholesale MAO",
  // Reports
  "agent-leaderboard": "Agent Leaderboard",
  "speed-to-lead": "Speed to Lead",
  "compliance-audit": "Compliance Audit",
  "pipeline-velocity": "Pipeline Velocity",
  "lead-source-roi": "Lead Source ROI",
  "market-statistics": "Market Statistics",
  "monthly-statistics": "Monthly Statistics",
  "listing-inventory": "Listing Inventory",
  "pending-documents": "Pending Documents",
  "brokerage-market-share": "Brokerage Market Share",
  "company-dollar": "Company Dollar",
  "lead-assignment": "Lead Assignment",
  "team-commission-split": "Team Commission Split",
  "agent-retention-risk": "Agent Retention Risk",
  "tax-savings-reserve": "Tax Savings Reserve",
  "hawaii-island-statistics": "Hawaii Island",
  "hawaii-market-comparison": "Hawaii Market",
  "kauai-statistics": "Kauai",
  "maui-statistics": "Maui",
  checkout: "Checkout",
  upgrade: "Upgrade",
  invoices: "Invoices",
  "payment-methods": "Payment Methods",
  plans: "Plans",
  features: "Features",
  users: "Users",
  subscriptions: "Subscriptions",
  "access-requests": "Access Requests",
  invitations: "Invitations",
  "error-logs": "Error Logs",
  diagnostic: "Diagnostic",
  prospecting: "Prospecting",
};

// UUID pattern to detect dynamic route segments
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Breadcrumbs() {
  const pathname = usePathname();

  // Don't show on dashboard (it's the root)
  if (pathname === "/app/dashboard" || pathname === "/app") return null;

  const segments = pathname
    .replace(/^\/app\/?/, "")
    .split("/")
    .filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: { label: string; href: string }[] = [{ label: "Home", href: "/app/dashboard" }];

  let accPath = "/app";
  for (const seg of segments) {
    accPath += `/${seg}`;
    if (UUID_REGEX.test(seg)) {
      crumbs.push({ label: "Detail", href: accPath });
    } else {
      crumbs.push({
        label: ROUTE_LABELS[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        href: accPath,
      });
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="noprint flex items-center gap-1 text-xs text-gray-500 mb-3 flex-wrap">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
            {i === 0 && <Home className="w-3 h-3 mr-0.5" />}
            {isLast ? (
              <span className="font-medium text-gray-900">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-gray-700 hover:underline no-underline text-gray-500">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
