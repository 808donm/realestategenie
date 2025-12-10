"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertCircle, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import WebhookLogsModal from "./webhook-logs-modal";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

const EVENT_TYPES = [
  { value: "lead.submitted", label: "Lead Submitted", description: "Every lead check-in" },
  { value: "lead.hot_scored", label: "Hot Lead", description: "Heat score ≥ 80" },
  { value: "open_house.published", label: "Open House Published", description: "Event goes live" },
  { value: "open_house.ended", label: "Open House Ended", description: "Event closes" },
  { value: "consent.captured", label: "Consent Captured", description: "User gives consent" },
  { value: "integration.connected", label: "Integration Connected", description: "GHL/n8n connected" },
];

export default function N8NIntegrationCard({ integration }: { integration: Integration }) {
  const [webhookUrl, setWebhookUrl] = useState(integration?.config?.webhook_url || "");
  const [secretKey, setSecretKey] = useState(integration?.config?.secret_key || "");
  const [enabledEvents, setEnabledEvents] = useState<string[]>(
    integration?.config?.enabled_events || ["lead.submitted", "lead.hot_scored"]
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const isConfigured = integration?.status === "connected";

  const handleToggleEvent = (eventType: string) => {
    setEnabledEvents((prev) =>
      prev.includes(eventType) ? prev.filter((e) => e !== eventType) : [...prev, eventType]
    );
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Webhook URL is required");
      return;
    }

    // Validate URL
    try {
      new URL(webhookUrl);
    } catch {
      toast.error("Invalid webhook URL");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/integrations/n8n/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          secret_key: secretKey,
          enabled_events: enabledEvents,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("n8n configuration saved");
        window.location.reload();
      } else {
        toast.error("Save failed", {
          description: data.error,
        });
      }
    } catch (error: any) {
      toast.error("Save failed", {
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Please save your webhook URL first");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch("/api/integrations/n8n/test", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Test webhook sent successfully", {
          description: `Status: ${data.status_code || "200"}`,
        });
      } else {
        toast.error("Test webhook failed", {
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                n8n
              </div>
              <div>
                <CardTitle>n8n Webhooks</CardTitle>
                <CardDescription>Workflow Automation</CardDescription>
              </div>
            </div>
            {isConfigured && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Configured
              </Badge>
            )}
            {integration?.status === "error" && (
              <Badge variant="danger" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Error
              </Badge>
            )}
            {!isConfigured && integration?.status !== "error" && (
              <Badge variant="outline">Not Configured</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Trigger n8n workflows when events occur. Perfect for custom automations, notifications,
            and integrations.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-n8n-instance.com/webhook/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your n8n webhook URL (from Webhook node)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret-key">Secret Key (Optional)</Label>
              <Input
                id="secret-key"
                type="password"
                placeholder="Enter a secret for signature verification"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for HMAC-SHA256 signature in X-Webhook-Signature header
              </p>
            </div>

            <div className="space-y-3">
              <Label>Events to Trigger</Label>
              <div className="space-y-2">
                {EVENT_TYPES.map((eventType) => (
                  <div key={eventType.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={eventType.value}
                      checked={enabledEvents.includes(eventType.value)}
                      onCheckedChange={() => handleToggleEvent(eventType.value)}
                    />
                    <div className="grid gap-1 leading-none">
                      <label
                        htmlFor={eventType.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {eventType.label}
                      </label>
                      <p className="text-xs text-muted-foreground">{eventType.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {integration?.last_error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {integration.last_error}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
            <Button onClick={handleTest} disabled={testing || !isConfigured} variant="outline">
              {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Test
            </Button>
            <Button
              onClick={() => setShowLogs(true)}
              disabled={!isConfigured}
              variant="outline"
              size="icon"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <strong>Features:</strong> Event triggers, HMAC signatures, retry logic (3 attempts),
            delivery logs
          </div>
        </CardContent>
      </Card>

      <WebhookLogsModal open={showLogs} onClose={() => setShowLogs(false)} />
    </>
  );
}
