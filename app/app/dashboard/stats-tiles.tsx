"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, TrendingUp, Zap } from "lucide-react";

type DashboardStats = {
  leads: {
    total: number;
    hot: number;
    warm: number;
    cold: number;
    thisWeek: number;
  };
  openHouses: {
    total: number;
    published: number;
    active: number;
  };
  integrations: {
    ghl: {
      connected: boolean;
      lastUpdated: string | null;
    };
    n8n: {
      connected: boolean;
      lastUpdated: string | null;
      webhookSuccessRate: number | null;
    };
  };
};

export default function StatsTiles() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.leads.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.leads.thisWeek > 0 && `+${stats.leads.thisWeek} this week`}
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="danger" className="text-xs">
              {stats.leads.hot} hot
            </Badge>
            <Badge variant="default" className="text-xs">
              {stats.leads.warm} warm
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Open Houses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Houses</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.openHouses.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.openHouses.active} active right now
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="success" className="text-xs">
              {stats.openHouses.published} published
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Hot Leads Conversion */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.leads.hot}</div>
          <p className="text-xs text-muted-foreground">
            {stats.leads.total > 0
              ? `${Math.round((stats.leads.hot / stats.leads.total) * 100)}% of total`
              : "No leads yet"}
          </p>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-danger h-2 rounded-full transition-all"
              style={{
                width: stats.leads.total > 0
                  ? `${(stats.leads.hot / stats.leads.total) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Integrations Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Integrations</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.integrations.ghl.connected ? 1 : 0) +
              (stats.integrations.n8n.connected ? 1 : 0)}
            /2
          </div>
          <p className="text-xs text-muted-foreground">Connected</p>
          <div className="flex gap-2 mt-2">
            {stats.integrations.ghl.connected && (
              <Badge variant="success" className="text-xs">
                GHL
              </Badge>
            )}
            {stats.integrations.n8n.connected && (
              <Badge variant="success" className="text-xs">
                n8n
              </Badge>
            )}
            {!stats.integrations.ghl.connected && !stats.integrations.n8n.connected && (
              <Badge variant="secondary" className="text-xs">
                None
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
