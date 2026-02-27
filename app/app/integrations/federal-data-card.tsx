"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Database, Home, Shield, BarChart3, Droplets, Landmark, Leaf } from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function FederalDataIntegrationCard({
  integration,
  isPlatformAdmin,
}: {
  integration: Integration;
  isPlatformAdmin: boolean;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [uspsClientId, setUspsClientId] = useState("");
  const [uspsClientSecret, setUspsClientSecret] = useState("");
  const [hudApiToken, setHudApiToken] = useState("");
  const [censusApiKey, setCensusApiKey] = useState("");
  const [blsApiKey, setBlsApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = integration?.status === "connected";
  const hasError = integration?.status === "error";

  // Parse source availability from config
  const sources = integration?.config?.sources || {};

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch("/api/integrations/federal-data/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usps_client_id: uspsClientId.trim() || null,
          usps_client_secret: uspsClientSecret.trim() || null,
          hud_api_token: hudApiToken.trim() || null,
          census_api_key: censusApiKey.trim() || null,
          bls_api_key: blsApiKey.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Federal Data sources connected!", {
          description: data.message || "Government data is now available",
        });
        setShowDialog(false);
        setUspsClientId("");
        setUspsClientSecret("");
        setHudApiToken("");
        setCensusApiKey("");
        setBlsApiKey("");
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
      const response = await fetch("/api/integrations/federal-data/test");
      const data = await response.json();

      if (response.ok && data.connected) {
        toast.success(data.message || "Federal data sources are active!");
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
    if (!confirm("Are you sure you want to disconnect Federal Data? Government data supplements will be disabled for all users.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/federal-data/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Federal Data disconnected");
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
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <Landmark className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Federal Data
                </CardTitle>
                <CardDescription>US Government Property Intelligence</CardDescription>
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
            Supplement ATTOM property data with free US government sources: vacancy status, fair market rents, flood zones, demographics, loan limits, environmental risk, and more.
          </p>

          {/* Feature highlights */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Home className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <h4 className="font-medium text-sm">Vacancy & Occupancy</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  USPS vacancy indicators, Census occupancy rates
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <BarChart3 className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <h4 className="font-medium text-sm">Fair Market Rents</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  HUD rental rates by bedroom count and ZIP code
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Droplets className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <h4 className="font-medium text-sm">Flood & Disaster Risk</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  FEMA flood zones, NFIP data, disaster history
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Leaf className="w-4 h-4 mt-0.5 text-blue-600" />
              <div>
                <h4 className="font-medium text-sm">Environmental & Lending</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  EPA sites, HMDA lending patterns, loan limits
                </p>
              </div>
            </div>
          </div>

          {isConnected && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="text-muted-foreground">Sources:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "hud", label: "HUD" },
                  { key: "census", label: "Census" },
                  { key: "fema", label: "FEMA" },
                  { key: "bls", label: "BLS" },
                  { key: "epa", label: "EPA" },
                  { key: "usps", label: "USPS" },
                  { key: "cfpb_hmda", label: "HMDA" },
                ].map(({ key, label }) => (
                  <Badge
                    key={key}
                    variant={sources[key]?.available ? "success" : "outline"}
                    className="text-xs"
                  >
                    {label}
                    {sources[key]?.available ? "" : " (N/A)"}
                  </Badge>
                ))}
              </div>
              {integration?.last_sync_at && (
                <div className="text-sm text-muted-foreground">
                  Last tested: {new Date(integration.last_sync_at).toLocaleString()}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Platform-wide integration — available to all agents
              </div>
            </div>
          )}

          {hasError && integration?.last_error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {integration.last_error}
            </div>
          )}

          {!isConnected && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Data Sources (mostly free)</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>HUD:</strong> Fair Market Rents, income limits (free token required)</li>
                <li>• <strong>Census:</strong> Demographics, housing, income (free, optional key)</li>
                <li>• <strong>FEMA:</strong> Flood zones, disaster declarations (free, no key)</li>
                <li>• <strong>FHFA:</strong> Conforming loan limits (free, no key)</li>
                <li>• <strong>BLS:</strong> Employment & economic data (free, optional key)</li>
                <li>• <strong>EPA:</strong> Superfund, brownfields, TRI (free, no key)</li>
                <li>• <strong>CFPB:</strong> HMDA mortgage lending data (free, no key)</li>
                <li>• <strong>USPS:</strong> Vacancy indicators (free, OAuth credentials required)</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              isPlatformAdmin ? (
                <Button onClick={() => setShowDialog(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Landmark className="w-4 h-4 mr-2" />
                  Connect Federal Data
                </Button>
              ) : (
                <Button disabled className="w-full" variant="outline">
                  <Landmark className="w-4 h-4 mr-2" />
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

          <div className="text-xs text-muted-foreground">
            <strong>Use Cases:</strong> Rental analysis, flood risk disclosure, neighborhood profiles, loan eligibility, vacancy detection, environmental due diligence
          </div>
        </CardContent>
      </Card>

      {/* Connection Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect Federal Data Sources</DialogTitle>
            <DialogDescription>
              Most federal data sources are free with no API key. Optional keys unlock higher rate limits and additional data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <strong>Most sources are free!</strong> FEMA, EPA, CFPB, and FHFA data needs no keys. A free HUD token unlocks Fair Market Rents. Optional Census &amp; BLS keys boost rate limits.
            </div>

            {/* USPS (optional) */}
            <div className="space-y-2 p-3 border rounded-lg">
              <h4 className="font-medium text-sm flex items-center gap-2">
                USPS Vacancy Data
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </h4>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="usps-client-id" className="text-xs">Client ID</Label>
                  <Input
                    id="usps-client-id"
                    type="text"
                    placeholder="USPS OAuth Client ID"
                    value={uspsClientId}
                    onChange={(e) => setUspsClientId(e.target.value)}
                    disabled={connecting}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="usps-client-secret" className="text-xs">Client Secret</Label>
                  <Input
                    id="usps-client-secret"
                    type="password"
                    placeholder="USPS OAuth Client Secret"
                    value={uspsClientSecret}
                    onChange={(e) => setUspsClientSecret(e.target.value)}
                    disabled={connecting}
                    className="text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Register at{" "}
                  <a href="https://developers.usps.com" target="_blank" rel="noopener noreferrer" className="underline">
                    developers.usps.com
                  </a>
                  {" "}— enables property-level vacancy indicators (60 req/hr free tier)
                </p>
              </div>
            </div>

            {/* HUD (recommended) */}
            <div className="space-y-2 p-3 border rounded-lg border-blue-200 bg-blue-50/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                HUD Fair Market Rents
                <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">Recommended</Badge>
              </h4>
              <div>
                <Label htmlFor="hud-token" className="text-xs">API Token</Label>
                <Input
                  id="hud-token"
                  type="password"
                  placeholder="HUD USER API Token"
                  value={hudApiToken}
                  onChange={(e) => setHudApiToken(e.target.value)}
                  disabled={connecting}
                  className="text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Free instant token at{" "}
                <a href="https://www.huduser.gov/hudapi/public/register" target="_blank" rel="noopener noreferrer" className="underline">
                  huduser.gov
                </a>
                {" "}— required for Fair Market Rents, income limits, and Section 8 data
              </p>
            </div>

            {/* Census (optional) */}
            <div className="space-y-2 p-3 border rounded-lg">
              <h4 className="font-medium text-sm flex items-center gap-2">
                Census Bureau
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </h4>
              <div>
                <Label htmlFor="census-key" className="text-xs">API Key</Label>
                <Input
                  id="census-key"
                  type="text"
                  placeholder="Census API Key"
                  value={censusApiKey}
                  onChange={(e) => setCensusApiKey(e.target.value)}
                  disabled={connecting}
                  className="text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Free instant key at{" "}
                <a href="https://api.census.gov/data/key_signup.html" target="_blank" rel="noopener noreferrer" className="underline">
                  api.census.gov
                </a>
                {" "}— increases rate limits for demographics & housing data
              </p>
            </div>

            {/* BLS (optional) */}
            <div className="space-y-2 p-3 border rounded-lg">
              <h4 className="font-medium text-sm flex items-center gap-2">
                Bureau of Labor Statistics
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </h4>
              <div>
                <Label htmlFor="bls-key" className="text-xs">API Key</Label>
                <Input
                  id="bls-key"
                  type="text"
                  placeholder="BLS API Key"
                  value={blsApiKey}
                  onChange={(e) => setBlsApiKey(e.target.value)}
                  disabled={connecting}
                  className="text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Free at{" "}
                <a href="https://data.bls.gov/registrationEngine/" target="_blank" rel="noopener noreferrer" className="underline">
                  data.bls.gov
                </a>
                {" "}— increases from 25 to 500 queries/day for employment data
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setUspsClientId("");
                setUspsClientSecret("");
                setHudApiToken("");
                setCensusApiKey("");
                setBlsApiKey("");
              }}
              disabled={connecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-blue-600 hover:bg-blue-700"
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
