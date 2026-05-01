import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type MarketStat = {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
};

export default function MarketPulse({ stats }: { stats: MarketStat[] }) {
  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Market Pulse</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect MLS or Property Data to see market stats for your area.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Market Pulse</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const TrendIcon = stat.trend === "up" ? TrendingUp : stat.trend === "down" ? TrendingDown : Minus;
            const trendColor =
              stat.trend === "up"
                ? "text-green-600 dark:text-green-400"
                : stat.trend === "down"
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground";

            return (
              <div key={stat.label} className="p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold">{stat.value}</span>
                  {stat.trend && <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
