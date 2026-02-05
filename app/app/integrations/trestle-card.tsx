"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function TrestleIntegrationCard({ integration }: { integration: Integration }) {
  const isConnected = integration?.status === "connected";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z"/>
              </svg>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Trestle by CoreLogic
                <Badge variant="outline" className="text-xs font-normal">
                  Coming Soon
                </Badge>
              </CardTitle>
              <CardDescription>MLS & IDX Data Exchange</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect to the Trestle API for real-time MLS property listings, agent rosters, and RESO Data Dictionary 2.0 standardized data.
        </p>

        {/* Feature highlights */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="p-3 border rounded-lg bg-muted/20">
            <h4 className="font-medium text-sm">Property Listings</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Access active, pending, and sold listings with full RESO compliance
            </p>
          </div>
          <div className="p-3 border rounded-lg bg-muted/20">
            <h4 className="font-medium text-sm">Agent & Office Rosters</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Member profiles, office hierarchies, and team structures
            </p>
          </div>
          <div className="p-3 border rounded-lg bg-muted/20">
            <h4 className="font-medium text-sm">Media & Photos</h4>
            <p className="text-xs text-muted-foreground mt-1">
              High-resolution property images and virtual tour links
            </p>
          </div>
          <div className="p-3 border rounded-lg bg-muted/20">
            <h4 className="font-medium text-sm">Open Houses</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled showings with live stream and virtual event support
            </p>
          </div>
        </div>

        {/* Technical specs */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Technical Details</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>API:</strong> RESO Web API & RETS 1.8</li>
            <li>• <strong>Auth:</strong> OAuth2 Client Credentials</li>
            <li>• <strong>Endpoint:</strong> api-cotality.com (Q4 2025)</li>
            <li>• <strong>Standard:</strong> RESO Data Dictionary 2.0</li>
            <li>• <strong>Identifier:</strong> CLIP (Cotality Integrated Property)</li>
          </ul>
        </div>

        <button
          disabled
          className="w-full py-2 px-4 border rounded-md text-sm font-medium text-muted-foreground bg-muted/50 cursor-not-allowed"
        >
          Connect Trestle (Coming Soon)
        </button>

        <div className="text-xs text-muted-foreground">
          <strong>Use Cases:</strong> IDX property search, market analytics, listing auto-sync, 1031 exchange searches
        </div>
      </CardContent>
    </Card>
  );
}
