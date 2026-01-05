"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";

type IntegrationHealth = {
  ghl: {
    connected: boolean;
    lastUpdated: string | null;
  };
  qbo?: {
    connected: boolean;
    lastUpdated: string | null;
  };
  pandadoc?: {
    connected: boolean;
    lastUpdated: string | null;
  };
};

export default function IntegrationHealth() {
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setHealth(data.integrations);
      }
    } catch (error) {
      console.error("Failed to fetch integration health:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Integration Health</CardTitle>
          <CardDescription>Status of your connected integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  const getHealthIcon = (connected: boolean) => {
    if (connected) {
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    }
    return <XCircle className="h-5 w-5 text-muted-foreground" />;
  };

  const getHealthStatus = (connected: boolean, successRate?: number | null) => {
    if (!connected) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    if (successRate !== undefined && successRate !== null) {
      if (successRate >= 90) {
        return <Badge variant="success">Healthy</Badge>;
      } else if (successRate >= 70) {
        return <Badge variant="default">Degraded</Badge>;
      } else {
        return <Badge variant="danger">Issues</Badge>;
      }
    }
    return <Badge variant="success">Connected</Badge>;
  };

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Integration Health</CardTitle>
            <CardDescription>Status of your connected integrations</CardDescription>
          </div>
          <Link href="/app/integrations">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* GoHighLevel */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getHealthIcon(health.ghl.connected)}
              <div>
                <div className="font-semibold">GoHighLevel CRM</div>
                <div className="text-sm text-muted-foreground">
                  {health.ghl.connected
                    ? `Last sync: ${formatLastUpdated(health.ghl.lastUpdated)}`
                    : "Not configured"}
                </div>
              </div>
            </div>
            {getHealthStatus(health.ghl.connected)}
          </div>

          {/* QuickBooks Online */}
          {health.qbo && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getHealthIcon(health.qbo.connected)}
                <div>
                  <div className="font-semibold">QuickBooks Online</div>
                  <div className="text-sm text-muted-foreground">
                    {health.qbo.connected
                      ? `Last sync: ${formatLastUpdated(health.qbo.lastUpdated)}`
                      : "Not configured"}
                  </div>
                </div>
              </div>
              {getHealthStatus(health.qbo.connected)}
            </div>
          )}

          {/* PandaDoc */}
          {health.pandadoc && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getHealthIcon(health.pandadoc.connected)}
                <div>
                  <div className="font-semibold">PandaDoc</div>
                  <div className="text-sm text-muted-foreground">
                    {health.pandadoc.connected
                      ? `Last sync: ${formatLastUpdated(health.pandadoc.lastUpdated)}`
                      : "Not configured"}
                  </div>
                </div>
              </div>
              {getHealthStatus(health.pandadoc.connected)}
            </div>
          )}

          {/* Call to Action */}
          {!health.ghl.connected && (
            <div className="flex items-start gap-2 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm">Action Required</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Connect GoHighLevel to automatically sync leads to your CRM and enable automated
                  follow-ups.
                </div>
                <Link href="/app/integrations">
                  <Button variant="outline" size="sm" className="mt-2">
                    Setup Integrations
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
