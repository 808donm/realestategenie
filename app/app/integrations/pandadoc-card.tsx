"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileSignature, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function PandaDocIntegrationCard({ integration }: { integration: Integration }) {
  const [showDialog, setShowDialog] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [defaultTemplateId, setDefaultTemplateId] = useState("");
  const [useSandbox, setUseSandbox] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = integration?.status === "connected";
  const hasError = integration?.status === "error";
  const templates = integration?.config?.templates || [];
  const environment = integration?.config?.environment || "production";

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch("/api/integrations/pandadoc/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey.trim(),
          default_template_id: defaultTemplateId.trim() || undefined,
          environment: useSandbox ? "sandbox" : "production",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("PandaDoc connected successfully!", {
          description: `Found ${data.templates?.length || 0} templates`,
        });
        setShowDialog(false);
        setApiKey("");
        setDefaultTemplateId("");
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
      const response = await fetch("/api/integrations/pandadoc/test", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("PandaDoc connection successful!", {
          description: `${data.template_count} templates available`,
        });
        window.location.reload();
      } else {
        toast.error("Connection test failed", {
          description: data.error || "Unknown error",
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
    if (!confirm("Are you sure you want to disconnect PandaDoc? Lease document creation will be affected.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/pandadoc/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("PandaDoc disconnected");
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
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white">
                <FileSignature className="w-6 h-6" />
              </div>
              <div>
                <CardTitle>PandaDoc</CardTitle>
                <CardDescription>E-Signature & Document Automation</CardDescription>
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
            Create professional lease agreements with e-signatures, tracking, and payment collection.
          </p>

          {isConnected && templates.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Environment:</span>{" "}
                <Badge variant={environment === "sandbox" ? "warning" : "outline"} className="text-xs">
                  {environment === "sandbox" ? "Sandbox (Test)" : "Production"}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Templates:</span>{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {templates.length} available
                </code>
              </div>
              {integration?.config?.default_template_id && (
                <div className="text-sm text-muted-foreground">
                  Default template configured
                </div>
              )}
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

          <div className="flex gap-2">
            {!isConnected ? (
              <Button onClick={() => setShowDialog(true)} className="w-full">
                <FileSignature className="w-4 h-4 mr-2" />
                Connect PandaDoc
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
            <strong>Features:</strong> E-signatures, document templates, tracking, payment collection, analytics
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <a
              href="https://app.pandadoc.com/a/#/settings/integrations/api"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Get your API key from PandaDoc
            </a>
          </div>
        </CardContent>
      </Card>

      {/* API Key Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect PandaDoc</DialogTitle>
            <DialogDescription>
              Enter your PandaDoc API key to enable lease document creation and e-signatures.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key *</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your PandaDoc API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={connecting}
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://app.pandadoc.com/a/#/settings/integrations/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  PandaDoc Settings
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-id">Default Template ID (Optional)</Label>
              <Input
                id="template-id"
                placeholder="e.g., abc123xyz"
                value={defaultTemplateId}
                onChange={(e) => setDefaultTemplateId(e.target.value)}
                disabled={connecting}
              />
              <p className="text-xs text-muted-foreground">
                If set, this template will be used by default for new leases
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sandbox"
                checked={useSandbox}
                onCheckedChange={(checked) => setUseSandbox(checked === true)}
                disabled={connecting}
              />
              <Label
                htmlFor="sandbox"
                className="text-sm font-normal cursor-pointer"
              >
                Use Sandbox Environment (for testing)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setApiKey("");
                setDefaultTemplateId("");
              }}
              disabled={connecting}
            >
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
