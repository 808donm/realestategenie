"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type HeatScoreDistribution = {
  hot: number;
  warm: number;
  cold: number;
};

export default function HeatScoreChart() {
  const [distribution, setDistribution] = useState<HeatScoreDistribution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistribution();
  }, []);

  const fetchDistribution = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setDistribution({
          hot: data.leads.hot,
          warm: data.leads.warm,
          cold: data.leads.cold,
        });
      }
    } catch (error) {
      console.error("Failed to fetch heat score distribution:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Heat Score Distribution</CardTitle>
          <CardDescription>Breakdown by qualification level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!distribution) return null;

  const total = distribution.hot + distribution.warm + distribution.cold;
  const hotPercent = total > 0 ? (distribution.hot / total) * 100 : 0;
  const warmPercent = total > 0 ? (distribution.warm / total) * 100 : 0;
  const coldPercent = total > 0 ? (distribution.cold / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Heat Score Distribution</CardTitle>
        <CardDescription>Breakdown by qualification level</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No leads yet. Create an open house to start capturing leads!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Bar Chart */}
            <div className="space-y-4">
              {/* Hot Leads */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="danger">Hot (80-100)</Badge>
                    <span className="text-sm font-medium">{distribution.hot} leads</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {hotPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-4">
                  <div
                    className="bg-danger h-4 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${hotPercent}%` }}
                  >
                    {hotPercent > 15 && (
                      <span className="text-xs font-bold text-white">
                        {distribution.hot}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Warm Leads */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Warm (50-79)</Badge>
                    <span className="text-sm font-medium">{distribution.warm} leads</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {warmPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-4">
                  <div
                    className="bg-primary h-4 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${warmPercent}%` }}
                  >
                    {warmPercent > 15 && (
                      <span className="text-xs font-bold text-white">
                        {distribution.warm}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Cold Leads */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Cold (0-49)</Badge>
                    <span className="text-sm font-medium">{distribution.cold} leads</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {coldPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-4">
                  <div
                    className="bg-secondary h-4 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${coldPercent}%` }}
                  >
                    {coldPercent > 15 && (
                      <span className="text-xs font-bold text-muted-foreground">
                        {distribution.cold}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-danger">{distribution.hot}</div>
                <div className="text-xs text-muted-foreground">Hot Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{distribution.warm}</div>
                <div className="text-xs text-muted-foreground">Warm Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {distribution.cold}
                </div>
                <div className="text-xs text-muted-foreground">Cold Leads</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
