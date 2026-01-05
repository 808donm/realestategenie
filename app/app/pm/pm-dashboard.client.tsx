"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Building2,
  FileText,
  FileSignature,
  Wrench,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Users
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type DashboardData = {
  rentCollected: {
    collected: number;
    billed: number;
    collectionRate: number;
  };
  pastDue: {
    amount: number;
    tenantCount: number;
  };
  occupancy: {
    occupied: number;
    total: number;
    vacancyRate: number;
  };
  leasesTerminating: {
    within30Days: number;
    within60Days: number;
    within90Days: number;
  };
  maintenance: {
    openWorkOrders: number;
    openOver7Days: number;
  };
  needsAttention: {
    count: number;
    issues: Array<{
      type: string;
      priority: string;
      message: string;
      count: number;
    }>;
  };
};

export default function PMDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/pm/dashboard");

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Main Dashboard Tiles - 6 tiles in 3x2 grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Tile 1: Rent Collected (This Month) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rent Collected (This Month)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.rentCollected.collected.toLocaleString()} / ${data.rentCollected.billed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Collection Rate: {data.rentCollected.collectionRate}%
            </p>
            {data.rentCollected.collectionRate >= 95 ? (
              <div className="flex items-center text-xs text-green-600 mt-2">
                <TrendingUp className="h-3 w-3 mr-1" />
                On track
              </div>
            ) : (
              <div className="flex items-center text-xs text-amber-600 mt-2">
                <TrendingDown className="h-3 w-3 mr-1" />
                Below target
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tile 2: Past-Due Rent */}
        <Card className={data.pastDue.amount > 0 ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past-Due Rent</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data.pastDue.amount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.pastDue.amount > 0 ? 'text-red-600' : ''}`}>
              ${data.pastDue.amount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.pastDue.tenantCount} tenant{data.pastDue.tenantCount !== 1 ? 's' : ''} late
            </p>
            {data.pastDue.amount > 0 && (
              <Link href="/app/pm/payments?filter=overdue">
                <Button variant="link" className="h-auto p-0 text-xs mt-2">
                  View details →
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Tile 3: Occupancy */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.occupancy.occupied} / {data.occupancy.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vacancy Rate: {data.occupancy.vacancyRate}%
            </p>
            {data.occupancy.vacancyRate > 10 && (
              <div className="flex items-center text-xs text-amber-600 mt-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                High vacancy
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tile 4: Leases Terminating Soon */}
        <Card className={data.leasesTerminating.within30Days > 0 ? "border-amber-200 bg-amber-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leases Terminating Soon</CardTitle>
            <Calendar className={`h-4 w-4 ${data.leasesTerminating.within30Days > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.leasesTerminating.within30Days}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Within 30 days
            </p>
            <div className="text-xs mt-2 space-y-1">
              <div className="text-muted-foreground">
                {data.leasesTerminating.within60Days} within 60 days
              </div>
              <div className="text-muted-foreground">
                {data.leasesTerminating.within90Days} within 90 days
              </div>
            </div>
            {data.leasesTerminating.within30Days > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                Potential vacancies ahead
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tile 5: Maintenance Open */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Open</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.maintenance.openWorkOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Open work orders
            </p>
            {data.maintenance.openOver7Days > 0 && (
              <div className="flex items-center text-xs text-amber-600 mt-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                {data.maintenance.openOver7Days} open &gt; 7 days
              </div>
            )}
            {data.maintenance.openWorkOrders > 0 && (
              <Link href="/app/pm/work-orders">
                <Button variant="link" className="h-auto p-0 text-xs mt-2">
                  View all →
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Tile 6: Needs Attention Today */}
        <Card className={data.needsAttention.count > 0 ? "border-blue-200 bg-blue-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention Today</CardTitle>
            <AlertCircle className={`h-4 w-4 ${data.needsAttention.count > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.needsAttention.count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.needsAttention.count === 0 ? "All clear!" : "Issues requiring action"}
            </p>
            {data.needsAttention.count > 0 && (
              <div className="mt-3 space-y-2">
                {data.needsAttention.issues.slice(0, 3).map((issue, index) => (
                  <div key={index} className="text-xs flex items-start gap-1">
                    <div className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${
                      issue.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <span className="text-muted-foreground">{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Link href="/app/pm/properties">
            <Button>
              <Building2 className="mr-2 h-4 w-4" />
              Manage Properties
            </Button>
          </Link>
          <Link href="/app/pm/showings">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Property Showings
            </Button>
          </Link>
          <Link href="/app/pm/applications">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              View Applications
            </Button>
          </Link>
          <Link href="/app/pm/leases">
            <Button variant="outline">
              <FileSignature className="mr-2 h-4 w-4" />
              View Leases
            </Button>
          </Link>
          <Link href="/app/pm/work-orders">
            <Button variant="outline">
              <Wrench className="mr-2 h-4 w-4" />
              View Work Orders
            </Button>
          </Link>
          <Link href="/app/pm/payments">
            <Button variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Rent Payments
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
