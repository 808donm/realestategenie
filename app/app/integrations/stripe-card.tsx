"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function StripeIntegrationCard({ integration }: { integration: Integration }) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [mode, setMode] = useState<"test" | "live">("test");

  const isConnected = integration?.status === "connected";
  const hasError = integration?.status === "error";

  const handleConnect = async () => {
    if (!secretKey || !publishableKey) {
      toast.error("Missing credentials", {
        description: "Please enter both Secret Key and Publishable Key",
      });
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch("/api/integrations/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret_key: secretKey,
          publishable_key: publishableKey,
          mode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Stripe connected successfully!", {
          description: `Connected in ${mode} mode`,
        });
        setShowForm(false);
        setSecretKey("");
        setPublishableKey("");
        window.location.reload();
      } else {
        toast.error("Stripe connection failed", {
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
          Accept invoice payments from tenants via credit card. Payments are processed securely through Stripe and automatically update invoice status.
        </p>

        {isConnected && integration?.config && (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Mode:</span>{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {integration.config.stripe_mode || "test"}
              </code>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Publishable Key:</span>{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {integration.config.stripe_publishable_key?.substring(0, 20)}...
              </code>
            </div>
          </div>
        )}

        {hasError && integration?.last_error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
            {integration.last_error}
          </div>
        )}

        {showForm && !isConnected && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="stripe-mode">Mode</Label>
              <select
                id="stripe-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as "test" | "live")}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="test">Test Mode</option>
                <option value="live">Live Mode</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="publishableKey">Publishable Key</Label>
              <Input
                id="publishableKey"
                type="text"
                placeholder="pk_test_..."
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="sk_test_..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              Get your API keys from the{" "}
              <a
                href="https://dashboard.stripe.com/test/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe Dashboard
              </a>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <>
              {!showForm ? (
                <Button onClick={() => setShowForm(true)} className="w-full">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect Stripe
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex-1"
                  >
                    {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save & Connect
                  </Button>
                  <Button
                    onClick={() => {
                      setShowForm(false);
                      setSecretKey("");
                      setPublishableKey("");
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </>
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

        <div className="text-xs text-muted-foreground">
          <strong>Features:</strong> Credit card payments, automatic status updates, secure checkout, test mode
        </div>
      </CardContent>
    </Card>
  );
}
