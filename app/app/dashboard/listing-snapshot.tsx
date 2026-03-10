import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, AlertTriangle } from "lucide-react";
import Link from "next/link";

type ListingStat = {
  totalActive: number;
  avgDOM: number;
  staleCount: number;
  staleListings: { id: string; address: string; dom: number }[];
};

export default function ListingSnapshot({ stats }: { stats: ListingStat }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Active Listings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalActive}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.avgDOM}</div>
            <div className="text-xs text-muted-foreground">Avg DOM</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${stats.staleCount > 0 ? "text-amber-600" : ""}`}>
              {stats.staleCount}
            </div>
            <div className="text-xs text-muted-foreground">21+ DOM</div>
          </div>
        </div>

        {stats.staleListings.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              Stale listings needing attention
            </div>
            {stats.staleListings.slice(0, 3).map((listing) => (
              <Link
                key={listing.id}
                href={`/app/open-houses/${listing.id}`}
                className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50 transition-colors no-underline"
              >
                <span className="truncate">{listing.address}</span>
                <Badge variant="warning" className="text-[10px] ml-2">
                  {listing.dom} days
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {stats.totalActive === 0 && (
          <p className="text-sm text-muted-foreground">
            No active listings.{" "}
            <Link
              href="/app/open-houses/new"
              className="text-primary underline"
            >
              Create one
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
