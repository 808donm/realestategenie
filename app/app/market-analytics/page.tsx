import MarketAnalyticsDashboard from "./market-analytics.client";

export const dynamic = "force-dynamic";

export default function MarketAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Market Analytics</h2>
        <p className="text-muted-foreground mt-1">County-level market statistics, trends, and comparisons</p>
      </div>
      <MarketAnalyticsDashboard />
    </div>
  );
}
