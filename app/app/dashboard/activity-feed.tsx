"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Home, Zap, Webhook } from "lucide-react";

type Activity = {
  id: string;
  type: "lead" | "open_house" | "integration" | "webhook";
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/activity");
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "lead":
        return <Users className="h-4 w-4" />;
      case "open_house":
        return <Home className="h-4 w-4" />;
      case "integration":
        return <Zap className="h-4 w-4" />;
      case "webhook":
        return <Webhook className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: Activity["type"]) => {
    switch (type) {
      case "lead":
        return "text-success";
      case "open_house":
        return "text-primary";
      case "integration":
        return "text-warning";
      case "webhook":
        return "text-info";
      default:
        return "text-muted-foreground";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest events and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-64 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events and updates</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchActivities} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No activity yet. Create an open house to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-muted ${getTypeColor(
                    activity.type
                  )}`}
                >
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">{activity.title}</p>
                    {activity.metadata?.heatScore !== undefined && (
                      <Badge
                        variant={
                          activity.metadata.heatScore >= 80
                            ? "danger"
                            : activity.metadata.heatScore >= 50
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {activity.metadata.heatScore >= 80
                          ? "HOT"
                          : activity.metadata.heatScore >= 50
                          ? "WARM"
                          : "COLD"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
