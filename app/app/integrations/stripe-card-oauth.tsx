"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type IntegrationConnection = {
  id: string;
  integration_type: string;
  connection_status: "connected" | "disconnected" | "error" | "expired";
  external_account_id: string | null;
  connected_at: string;
  last_synced_at: string | null;
  error_message: string | null;
  metadata: any;
} | null;

export default function StripeOAuthCard({ connection }: { connection: IntegrationConnection }) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = connection?.connection_status === "connected";
  const hasError = connection?.connection_status === "error";

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Call API to get Stripe Connect OAuth URL
      const response = await fetch("/api/integrations/stripe/oauth-url", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.oauth_url) {
        // Redirect to Stripe OAuth page
        window.location.href = data.oauth_url;
      } else {
        toast.error("Failed to initialize Stripe connection", {
          description: data.error || "Unknown error",
        });
        setConnecting(false);
      }
    } catch (error: any) {
      toast.error("Connection failed", {
        description: error.message,
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Stripe? Tenants won't be able to pay invoices via Stripe.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/stripe/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Stripe disconnected");
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
            <div className="w-12 h-12 bg-gradient-to-br from-[#635BFF] to-[#5851E8] rounded-lg flex items-center justify-center text-white">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <CardTitle>Stripe</CardTitle>
              <CardDescription>Payment Processing</CardDescription>
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
          Accept invoice payments from tenants via credit card. Payments are processed securely through your Stripe account and automatically update invoice status.
        </p>

        {isConnected && connection && (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Account ID:</span>{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {connection.external_account_id}
              </code>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Connected:</span>{" "}
              {new Date(connection.connected_at).toLocaleDateString()}
            </div>
            {connection.last_synced_at && (
              <div className="text-sm">
                <span className="text-muted-foreground">Last synced:</span>{" "}
                {new Date(connection.last_synced_at).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {hasError && connection?.error_message && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {connection.error_message}
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={handleConnect} disabled={connecting} className="w-full">
              {connecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              {connecting ? "Connecting..." : "Connect with Stripe"}
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              variant="outline"
              className="w-full"
            >
              {disconnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Disconnect
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div><strong>Features:</strong> Credit card payments, automatic status updates, secure checkout</div>
          <div className="pt-2">
            <strong>How it works:</strong> Click "Connect with Stripe" to securely link your Stripe account. You'll be redirected to Stripe to authorize the connection. Your API keys remain private.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
