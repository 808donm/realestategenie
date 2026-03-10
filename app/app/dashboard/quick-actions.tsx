import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Home,
  UserPlus,
  BarChart3,
  FileText,
  Search,
  Calculator,
} from "lucide-react";

const actions = [
  {
    label: "New Open House",
    href: "/app/open-houses/new",
    icon: Home,
  },
  {
    label: "View Leads",
    href: "/app/leads",
    icon: UserPlus,
  },
  {
    label: "Pipeline",
    href: "/app/pipeline",
    icon: BarChart3,
  },
  {
    label: "MLS Search",
    href: "/app/mls",
    icon: Search,
  },
  {
    label: "Reports",
    href: "/app/reports",
    icon: FileText,
  },
  {
    label: "Calculators",
    href: "/app/analyzers",
    icon: Calculator,
  },
];

export default function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="no-underline">
                <Button
                  variant="outline"
                  className="w-full h-auto flex flex-col gap-1.5 py-3 px-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
