"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Database, Home, Users, TrendingUp, MapPin } from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function RealieIntegrationCard({
  integration,
  isPlatformAdmin,
}: {
  integration: Integration;
  isPlatformAdmin: boolean;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = integration?.status === "connected";
  const hasError = integration?.status === "error";

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your Realie.ai API key");
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch("/api/integrations/realie/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Realie.ai API connected!", {
          description: "Property data from county records is now your primary source",
        });
        setShowDialog(false);
        setApiKey("");
        window.location.reload();
      } else {
        toast.error("Connection failed", {
          description: data.error || "Unknown error",
        });
      }
    } catch (error: any) {
      toast.error("Connection failed", {
        description: error.message,
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/integrations/realie/test");
      const data = await response.json();

      if (response.ok && data.connected) {
        toast.success("Realie.ai connection is active!");
        window.location.reload();
      } else {
        toast.error("Connection test failed", {
          description: data.message || "Unknown error",
        });
      }
    } catch (error: any) {
      toast.error("Test failed", {
        description: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Realie.ai? ATTOM will become the sole property data provider.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/realie/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Realie.ai disconnected");
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error("Disconnect failed", {
          description: data.error,
        });
      }
    } catch (error: any) {
      toast.error("Disconnect failed", {
        description: error.message,
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Home className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Realie.ai
                  <Badge variant="outline" className="text-xs font-normal">Primary</Badge>
                </CardTitle>
                <CardDescription>County-Sourced Property Data</CardDescription>
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
            Primary property data source from county records. Ownership, tax assessments, sales history, and parcel boundaries at a fraction of ATTOM's cost. ATTOM automatically supplements any missing data.
          </p>

          {/* Feature highlights */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Users className="w-4 h-4 mt-0.5 text-teal-600" />
              <div>
                <h4 className="font-medium text-sm">Owner Intelligence</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  County-sourced ownership, absentee flags, mailing addresses
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <TrendingUp className="w-4 h-4 mt-0.5 text-teal-600" />
              <div>
                <h4 className="font-medium text-sm">Valuations & Tax</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Assessed values, market values, tax records direct from counties
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Database className="w-4 h-4 mt-0.5 text-teal-600" />
              <div>
                <h4 className="font-medium text-sm">Cost Efficient</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Bulk parcel queries at ~$0.01/record vs $0.10+ per ATTOM call
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-teal-600" />
              <div>
                <h4 className="font-medium text-sm">7-Day Cache</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  All data cached weekly — zero repeat API costs for same properties
                </p>
              </div>
            </div>
          </div>

          {isConnected && (
            <div className="space-y-2 p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-600" />
                <span className="text-teal-800 font-medium">Primary data source active</span>
              </div>
              <p className="text-xs text-teal-700">
                Property queries use Realie.ai first. ATTOM fills gaps for neighborhood, schools, risk, rental AVM, and market trend data.
              </p>
              {integration?.last_sync_at && (
                <div className="text-xs text-teal-600">
                  Last tested: {new Date(integration.last_sync_at).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {hasError && integration?.last_error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {integration.last_error}
            </div>
          )}

          {!isConnected && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">How it works</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>1. Realie.ai handles all property/owner/tax/sale queries</li>
                <li>2. ATTOM supplements missing fields automatically</li>
                <li>3. All results cached for 7 days to minimize API costs</li>
                <li>4. ATTOM still handles schools, risk, trends, rental AVM</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              isPlatformAdmin ? (
                <Button onClick={() => setShowDialog(true)} className="w-full bg-teal-600 hover:bg-teal-700">
                  <Database className="w-4 h-4 mr-2" />
                  Connect Realie.ai
                </Button>
              ) : (
                <Button disabled className="w-full" variant="outline">
                  <Database className="w-4 h-4 mr-2" />
                  Admin Setup Required
                </Button>
              )
            ) : (
              <>
                <Button
                  onClick={handleTest}
                  disabled={testing}
                  variant="outline"
                  className="flex-1"
                >
                  {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Test Connection
                </Button>
                {isPlatformAdmin && (
                  <Button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    variant="outline"
                    className="flex-1"
                  >
                    {disconnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Disconnect
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <a
              href="https://realie.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Realie.ai Documentation
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Connection Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Realie.ai</DialogTitle>
            <DialogDescription>
              Enter your Realie.ai API key to enable county-sourced property data as the primary data source. ATTOM will automatically supplement any missing data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="realie-api-key">API Key *</Label>
              <Input
                id="realie-api-key"
                type="password"
                placeholder="Enter your Realie.ai API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={connecting}
              />
              <p className="text-xs text-muted-foreground">
                Get your API key at{" "}
                <a
                  href="https://realie.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  realie.ai
                </a>
              </p>
            </div>

            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800">
              <strong>Primary data source:</strong> Once connected, Realie.ai becomes the first source for all property queries. ATTOM automatically fills in any data Realie doesn't provide (schools, risk, trends, rental AVM).
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-xs mb-2">What Realie.ai provides:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Property ownership & mailing addresses</li>
                <li>• Tax assessments & assessed values</li>
                <li>• Sales history & transaction records</li>
                <li>• Property valuations (AVM)</li>
                <li>• Parcel boundaries & geometry</li>
                <li>• Mortgage & lien information</li>
              </ul>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-xs mb-2">ATTOM still handles:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Neighborhood demographics & walkability</li>
                <li>• School ratings & boundaries</li>
                <li>• Hazard & climate risk scores</li>
                <li>• Rental AVM & home equity</li>
                <li>• Market trends & iBuyer data</li>
                <li>• Pre-foreclosure & building permits</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setApiKey("");
              }}
              disabled={connecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
