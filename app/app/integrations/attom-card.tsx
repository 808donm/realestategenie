"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, Database, Home, Users, TrendingUp, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function AttomIntegrationCard({
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
      toast.error("Please enter your ATTOM API key");
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch("/api/integrations/attom/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("ATTOM Data API connected!", {
          description: "Property ownership and public records data is now available",
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
      const response = await fetch("/api/integrations/attom/test");
      const data = await response.json();

      if (response.ok && data.connected) {
        toast.success("ATTOM connection is active!");
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
    if (!confirm("Are you sure you want to disconnect ATTOM? Property ownership data access will be disabled for all users.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/attom/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("ATTOM disconnected");
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
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  ATTOM Data
                </CardTitle>
                <CardDescription>Property Ownership & Public Records</CardDescription>
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
            Access property ownership, tax assessments, sales history, valuations, and foreclosure data for 155M+ US properties. Powered by public records from 3,000+ counties.
          </p>

          {/* Feature highlights */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <Users className="w-4 h-4 mt-0.5 text-orange-600" />
              <div>
                <h4 className="font-medium text-sm">Owner Intelligence</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Absentee owners, out-of-state investors, owner-occupied status
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <TrendingUp className="w-4 h-4 mt-0.5 text-orange-600" />
              <div>
                <h4 className="font-medium text-sm">AVM & Equity</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Automated valuations, equity estimates, and sales comps
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-orange-600" />
              <div>
                <h4 className="font-medium text-sm">Transaction History</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  10+ years of deeds, mortgages, and sales records
                </p>
              </div>
            </div>
            <div className="p-3 border rounded-lg bg-muted/20 flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-orange-600" />
              <div>
                <h4 className="font-medium text-sm">Area Prospecting</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Search by zip, radius, or neighborhood for targeted lead lists
                </p>
              </div>
            </div>
          </div>

          {isConnected && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-600" />
                <span className="text-muted-foreground">Coverage:</span>{" "}
                <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono">
                  155M+ properties
                </code>
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

          {/* Technical specs */}
          {!isConnected && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Technical Details</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>API:</strong> REST / JSON</li>
                <li>• <strong>Auth:</strong> API Key (header)</li>
                <li>• <strong>Coverage:</strong> 155M+ US properties, 3,000+ counties</li>
                <li>• <strong>Data:</strong> Ownership, tax, deeds, mortgages, AVM, foreclosures</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            {!isConnected ? (
              isPlatformAdmin ? (
                <Button onClick={() => setShowDialog(true)} className="w-full bg-orange-600 hover:bg-orange-700">
                  <Database className="w-4 h-4 mr-2" />
                  Connect ATTOM
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

          <div className="text-xs text-muted-foreground">
            <strong>Use Cases:</strong> Absentee owner prospecting, high-equity targeting, pre-foreclosure leads, market comps, farm area analysis
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <a
              href="https://api.developer.attomdata.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              ATTOM API Documentation
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Connection Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect ATTOM Data API</DialogTitle>
            <DialogDescription>
              Enter your ATTOM API key to enable property ownership and public records data for all users on the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="attom-api-key">API Key *</Label>
              <Input
                id="attom-api-key"
                type="password"
                placeholder="Enter your ATTOM API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={connecting}
              />
              <p className="text-xs text-muted-foreground">
                Find your API key at{" "}
                <a
                  href="https://api.developer.attomdata.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  api.developer.attomdata.com
                </a>
                {" "}under Account &gt; Applications
              </p>
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800">
              <strong>Platform-wide integration:</strong> Once connected, all agents on the platform will have access to ATTOM property data. ATTOM offers a free 30-day trial to evaluate the API.
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-xs mb-2">Data you'll unlock:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Property ownership & mailing addresses</li>
                <li>• Absentee owner / out-of-state investor flags</li>
                <li>• Tax assessments & assessed values</li>
                <li>• Sales history & deed records (10+ years)</li>
                <li>• Automated valuations (AVM) & equity estimates</li>
                <li>• Mortgage & lien information</li>
                <li>• Pre-foreclosure & foreclosure data</li>
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
              className="bg-orange-600 hover:bg-orange-700"
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
