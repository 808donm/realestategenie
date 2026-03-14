"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function GoogleCalendarCard({
  integration,
}: {
  integration: Integration;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const isConnected = integration?.status === "connected";
  const hasError = integration?.status === "error";

  const handleConnect = () => {
    window.location.href = "/api/integrations/google-calendar/connect";
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google Calendar? Two-way sync will stop.")) return;

    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/google-calendar/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Google Calendar disconnected");
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error("Disconnect failed", { description: data.error });
      }
    } catch (error: any) {
      toast.error("Disconnect failed", { description: error.message });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>Two-way calendar sync</CardDescription>
            </div>
          </div>
          {isConnected && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </Badge>
          )}
          {hasError && (
            <Badge variant="danger" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              Error
            </Badge>
          )}
          {!isConnected && !hasError && (
            <Badge variant="outline">Not Connected</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sync events between your Google Calendar and the merged calendar.
          Google Calendar takes precedence on conflicts.
        </p>

        {isConnected && integration?.last_sync_at && (
          <div className="text-sm text-muted-foreground">
            Last synced: {new Date(integration.last_sync_at).toLocaleString()}
          </div>
        )}

        {hasError && integration?.last_error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {integration.last_error}
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={handleConnect} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              variant="outline"
              className="w-full"
            >
              {disconnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Disconnect
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <strong>Features:</strong> Two-way event sync, real-time webhook updates, conflict resolution (Google wins)
        </div>
      </CardContent>
    </Card>
  );
}
