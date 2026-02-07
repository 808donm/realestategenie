"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Database, Building2, Users, Camera, Calendar } from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function TrestleIntegrationCard({ integration }: { integration: Integration }) {
  const [showDialog, setShowDialog] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = integration?.status === "connected";
  const hasError = integration?.status === "error";
  const totalListings = integration?.config?.total_listings || 0;

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Please enter both Client ID and Client Secret");
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch("/api/integrations/trestle/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          api_url: apiUrl.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Trestle connected successfully!", {
          description: `Access to ${data.totalListings?.toLocaleString() || 0} listings`,
        });
        setShowDialog(false);
        setClientId("");
        setClientSecret("");
        setApiUrl("");
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
      const response = await fetch("/api/integrations/trestle/test");
      const data = await response.json();

      if (response.ok && data.connected) {
        toast.success("Trestle connection is active!", {
          description: `${data.totalListings?.toLocaleString() || 0} listings available`,
        });
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
    if (!confirm("Are you sure you want to disconnect Trestle? MLS property access will be disabled.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/trestle/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Trestle disconnected");
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
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z"/>
                </svg>
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Trestle by CoreLogic
                </CardTitle>
                <CardDescription>MLS & IDX Data Exchange</CardDescription>
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
            Connect to the Trestle API for real-time MLS property listings, agent rosters, and RESO Data Dictionary 2.0 standardized data.
          </p>

          {/* Feature highlights */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Building2 className="w-4 h-4 mt-0.5 text-teal-600" />
              <div>
                <h4 className="font-medium text-sm">Property Listings</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Active, pending, and sold listings with full RESO compliance
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Users className="w-4 h-4 mt-0.5 text-teal-600" />
              <div>
                <h4 className="font-medium text-sm">Agent & Office Rosters</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Member profiles, office hierarchies, and team structures
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Camera className="w-4 h-4 mt-0.5 text-teal-600" />
              <div>
                <h4 className="font-medium text-sm">Media & Photos</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  High-resolution property images and virtual tour links
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 text-teal-600" />
              <div>
                <h4 className="font-medium text-sm">Open Houses</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Scheduled showings with virtual event support
                </p>
              </div>
            </div>
          </div>

          {isConnected && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-600" />
                <span className="text-muted-foreground">Available Listings:</span>{" "}
                <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono">
                  {totalListings.toLocaleString()}
                </code>
              </div>
              {integration?.last_sync_at && (
                <div className="text-sm text-muted-foreground">
                  Last synced: {new Date(integration.last_sync_at).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {hasError && integration?.last_error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {integration.last_error}
            </div>
          )}

          {/* Technical specs */}
          {!isConnected && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Technical Details</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>API:</strong> RESO Web API (OData)</li>
                <li>• <strong>Auth:</strong> OAuth2 Client Credentials</li>
                <li>• <strong>Standard:</strong> RESO Data Dictionary 2.0</li>
                <li>• <strong>Identifier:</strong> CLIP (Cotality Integrated Property)</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              <Button onClick={() => setShowDialog(true)} className="w-full bg-teal-600 hover:bg-teal-700">
                <Database className="w-4 h-4 mr-2" />
                Connect Trestle
              </Button>
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
                <Button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  variant="outline"
                  className="flex-1"
                >
                  {disconnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Disconnect
                </Button>
              </>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <strong>Use Cases:</strong> IDX property search, market analytics, listing auto-sync, 1031 exchange searches
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <a
              href="https://trestle.corelogic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Learn more about Trestle API
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Connection Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Trestle (CoreLogic MLS)</DialogTitle>
            <DialogDescription>
              Enter your Trestle API credentials to enable MLS property data access.
              You can get these from your Trestle account manager.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID *</Label>
              <Input
                id="client-id"
                placeholder="Enter your Trestle Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={connecting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-secret">Client Secret *</Label>
              <Input
                id="client-secret"
                type="password"
                placeholder="Enter your Trestle Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                disabled={connecting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-url">API URL (Optional)</Label>
              <Input
                id="api-url"
                placeholder="https://api-prod.corelogic.com"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                disabled={connecting}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the default production URL
              </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <strong>Note:</strong> Trestle credentials are provided by CoreLogic through your MLS
              subscription. Contact your MLS or Trestle account manager to obtain API access.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setClientId("");
                setClientSecret("");
                setApiUrl("");
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
