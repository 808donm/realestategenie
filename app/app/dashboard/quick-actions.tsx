"use client";

import { useState, useEffect } from "react";
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
  Phone,
  MessageSquare,
  Mail,
  ListTodo,
  X,
  Zap,
} from "lucide-react";

const navActions = [
  { label: "New Open House", href: "/app/open-houses/new", icon: Home },
  { label: "View Leads", href: "/app/leads", icon: UserPlus },
  { label: "Pipeline", href: "/app/pipeline", icon: BarChart3 },
  { label: "MLS Search", href: "/app/mls", icon: Search },
  { label: "Reports", href: "/app/reports", icon: FileText },
  { label: "Calculators", href: "/app/analyzers", icon: Calculator },
  { label: "Tasks", href: "/app/tasks", icon: ListTodo },
];

interface HotLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  heatScore: number;
}

export default function QuickActions() {
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);

  useEffect(() => {
    fetch("/api/leads/pipeline")
      .then((r) => r.json())
      .then((data) => {
        if (data.stages) {
          const allLeads = data.stages.flatMap((s: any) => s.leads || []);
          const hot = allLeads
            .filter((l: any) => l.heatScore >= 70 && (l.phone || l.email))
            .sort((a: any, b: any) => b.heatScore - a.heatScore)
            .slice(0, 5);
          setHotLeads(hot);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Navigation Actions */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {navActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="no-underline">
                  <Button variant="outline" className="w-full h-auto flex flex-col gap-1.5 py-3 px-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{action.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* One-Tap Contact Actions for Hot Leads */}
          {hotLeads.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Quick Contact — Hot Leads
              </h4>
              <div className="space-y-2">
                {hotLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{lead.name}</div>
                      <div className="text-xs text-gray-500">Score: {lead.heatScore}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                          title={`Call ${lead.name}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {lead.phone && (
                        <a
                          href={`sms:${lead.phone}`}
                          className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                          title={`Text ${lead.name}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="flex items-center justify-center w-8 h-8 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors"
                          title={`Email ${lead.name}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Quick Actions Bar (FAB) */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 noprint">
        {isFloatingOpen && (
          <div className="mb-3 flex flex-col gap-2 items-end animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Link href="/app/open-houses/new" className="no-underline">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full shadow-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <Home className="w-4 h-4 text-indigo-500" />
                New Open House
              </button>
            </Link>
            <Link href="/app/tasks" className="no-underline">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full shadow-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <ListTodo className="w-4 h-4 text-purple-500" />
                Add Task
              </button>
            </Link>
            <Link href="/app/leads" className="no-underline">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full shadow-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <UserPlus className="w-4 h-4 text-green-500" />
                View Leads
              </button>
            </Link>
            <Link href="/app/mls" className="no-underline">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full shadow-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <Search className="w-4 h-4 text-blue-500" />
                MLS Search
              </button>
            </Link>
          </div>
        )}
        <button
          onClick={() => setIsFloatingOpen(!isFloatingOpen)}
          className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-indigo-700 transition-all"
          title="Quick Actions"
        >
          {isFloatingOpen ? <X className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}
