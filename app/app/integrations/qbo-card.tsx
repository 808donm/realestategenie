"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function QBOIntegrationCard({ integration }: { integration: Integration }) {
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = integration?.status === "connected";
  const hasError = integration?.status === "error";

  const handleConnect = () => {
    window.location.href = "/api/integrations/qbo/connect";
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/integrations/qbo/test", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("QuickBooks connection successful!", {
          description: data.companyInfo?.CompanyName || "Connected to QuickBooks",
        });
      } else {
        toast.error("QuickBooks connection failed", {
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
    if (!confirm("Are you sure you want to disconnect QuickBooks? Transaction sync will stop.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/qbo/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("QuickBooks disconnected");
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              QBO
            </div>
            <div>
              <CardTitle>QuickBooks Online</CardTitle>
              <CardDescription>Accounting & Financial Management</CardDescription>
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
          Sync commission transactions and create invoices automatically in QuickBooks Online.
        </p>

        {isConnected && integration?.config && (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Company:</span>{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {integration.config.companyName || integration.config.realmId}
              </code>
            </div>
            {integration.last_sync_at && (
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
            <Button onClick={handleConnect} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect QuickBooks
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
          <strong>Features:</strong> Commission tracking, invoice creation, transaction sync, expense management
        </div>
      </CardContent>
    </Card>
  );
}
