import {
  LayoutDashboard,
  CalendarDays,
  Kanban,
  ListTodo,
  UserPlus,
  Users,
  DoorOpen,
  Search,
  Building2,
  MapPin,
  Calculator,
  Map,
  Crosshair,
  Dog,
  Radar,
  FileBarChart,
  TrendingUp,
  Briefcase,
  UsersRound,
  Building,
  Shield,
  AlertTriangle,
  Bell,
  Mail,
  Plug,
  CreditCard,
  Settings2,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

export type ConditionalNavItem = NavItem & {
  condition: "broker" | "team_lead" | "account_admin" | "platform_admin" | "site_admin" | "global_admin";
  disabledTooltip?: string;
  showDisabled?: boolean; // render as disabled instead of hiding
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "my-day",
    label: "My Day",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
      { label: "Calendar", href: "/app/calendar", icon: CalendarDays },
      { label: "Pipeline", href: "/app/pipeline", icon: Kanban },
      { label: "Tasks", href: "/app/tasks", icon: ListTodo },
    ],
  },
  {
    id: "clients",
    label: "Clients",
    icon: Users,
    items: [
      { label: "Leads", href: "/app/leads", icon: UserPlus },
      { label: "Contacts", href: "/app/contacts", icon: Users },
      { label: "Open Houses", href: "/app/open-houses", icon: DoorOpen },
    ],
  },
  {
    id: "deals",
    label: "Deals",
    icon: Search,
    items: [
      { label: "MLS", href: "/app/mls", icon: Search },
      { label: "Property Intel", href: "/app/property-data", icon: Building2 },
      { label: "Market Analytics", href: "/app/market-analytics", icon: TrendingUp },
      { label: "Neighborhoods", href: "/app/neighborhood-profiles", icon: MapPin },
      { label: "Calculators", href: "/app/analyzers", icon: Calculator },
      { label: "Hazard Map", href: "/app/hazard-map", icon: AlertTriangle },
    ],
  },
  {
    id: "opportunities",
    label: "Opportunities",
    icon: Crosshair,
    items: [
      { label: "Seller Map", href: "/app/seller-map", icon: Map },
      { label: "Bird Dog", href: "/app/bird-dog", icon: Dog },
      { label: "Market Monitor", href: "/app/market-monitor", icon: Bell },
      { label: "Email Blast", href: "/app/mls-blast", icon: Mail },
      { label: "Prospecting", href: "/app/prospecting", icon: Crosshair },
      { label: "Farm & Watchdog", href: "/app/farm", icon: Radar },
      { label: "Reports", href: "/app/reports", icon: FileBarChart },
    ],
  },
];

export const CONDITIONAL_ITEMS: ConditionalNavItem[] = [
  {
    label: "Broker Dashboard",
    href: "/app/broker",
    icon: Briefcase,
    condition: "broker",
    showDisabled: true,
    disabledTooltip: "Upgrade to Brokerage Growth to unlock",
  },
  {
    label: "Team Dashboard",
    href: "/app/team-lead",
    icon: UsersRound,
    condition: "team_lead",
  },
  {
    label: "Team",
    href: "/app/team",
    icon: Building,
    condition: "account_admin",
  },
  {
    label: "Admin",
    href: "/app/admin",
    icon: Shield,
    condition: "site_admin",
  },
  {
    label: "Global Admin",
    href: "/app/admin",
    icon: Shield,
    condition: "global_admin",
  },
];

export const SETTINGS_ITEMS: NavItem[] = [
  { label: "Integrations", href: "/app/integrations", icon: Plug },
  { label: "Billing", href: "/app/billing", icon: CreditCard },
  { label: "Settings", href: "/app/settings/profile", icon: Settings2 },
];

export const HELP_ICON = HelpCircle;

// Route groupings for mobile bottom bar active state detection
export const MOBILE_TAB_ROUTES: Record<string, string[]> = {
  dashboard: ["/app/dashboard", "/app/calendar", "/app/pipeline", "/app/tasks"],
  clients: ["/app/leads", "/app/contacts", "/app/open-houses"],
  deals: ["/app/mls", "/app/property-data", "/app/market-analytics", "/app/neighborhood-profiles", "/app/analyzers", "/app/hazard-map"],
  listings: ["/app/seller-map", "/app/farm", "/app/reports", "/app/bird-dog", "/app/market-monitor", "/app/prospecting"],
};
