"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronRight } from "lucide-react";

interface SyncStatus {
  provider: string;
  status: "connected" | "disconnected" | "error";
  last_sync_at: string | null;
  last_error: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  google_calendar: "Google Calendar",
  microsoft_calendar: "Outlook Calendar",
  ghl: "CRM",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SyncHealthWidget() {
  const [syncs, setSyncs] = useState<SyncStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/integrations/sync-health")
      .then((r) => r.json())
      .then((data) => setSyncs(data.integrations || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return null;
  if (syncs.length === 0) return null;

  const hasErrors = syncs.some((s) => s.status === "error" || s.last_error);

  return (
    <Card className={hasErrors ? "border-warning/40" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Sync Health
          </CardTitle>
          <Link
            href="/app/integrations"
            className="text-xs text-primary hover:opacity-80 flex items-center gap-0.5 no-underline"
          >
            Manage <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {syncs.map((sync) => {
            const label = PROVIDER_LABELS[sync.provider] || sync.provider;
            const isError = sync.status === "error" || !!sync.last_error;
            const isDisconnected = sync.status === "disconnected";

            return (
              <div
                key={sync.provider}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                  isError
                    ? "bg-red-50 dark:bg-red-950/30"
                    : isDisconnected
                      ? "bg-muted"
                      : "bg-green-50 dark:bg-green-950/30"
                }`}
              >
                {isError ? (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                ) : isDisconnected ? (
                  <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">{label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {isDisconnected ? (
                      "Not connected"
                    ) : sync.last_sync_at ? (
                      <>Last synced {timeAgo(sync.last_sync_at)}</>
                    ) : (
                      "Never synced"
                    )}
                  </div>
                  {sync.last_error && (
                    <div className="text-[10px] text-red-500 dark:text-red-400 mt-0.5 truncate">{sync.last_error}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
