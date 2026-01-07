"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wrench, MessageSquare, FileText, DollarSign, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TenantNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/tenant/dashboard", label: "Dashboard", icon: Home },
    { href: "/tenant/work-orders", label: "Work Orders", icon: Wrench },
    { href: "/tenant/messages", label: "Messages", icon: MessageSquare },
    { href: "/tenant/lease", label: "My Lease", icon: FileText },
    { href: "/tenant/invoices", label: "Payments", icon: DollarSign },
  ];

  return (
    <nav className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/tenant/dashboard" className="font-bold text-xl">
            Tenant Portal
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>

          {/* Sign Out */}
          <form action="/api/auth/signout" method="post">
            <Button variant="ghost" size="sm" type="submit" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </form>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-sm transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
