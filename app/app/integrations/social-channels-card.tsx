"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

interface ChannelConfig {
  label: string;
  description: string;
  fields: { key: string; label: string; type: string; placeholder: string }[];
  webhookParam: string;
  docsUrl: string;
}

const CHANNELS: Record<string, ChannelConfig> = {
  facebook: {
    label: "Facebook Messenger",
    description: "Respond to leads from Facebook ads and page messages",
    fields: [
      { key: "page_id", label: "Page ID", type: "text", placeholder: "Your Facebook Page ID" },
      {
        key: "page_access_token",
        label: "Page Access Token",
        type: "password",
        placeholder: "Long-lived page access token",
      },
      { key: "app_secret", label: "App Secret", type: "password", placeholder: "Facebook App Secret" },
      { key: "verify_token", label: "Verify Token", type: "text", placeholder: "Custom verify token for webhook" },
    ],
    webhookParam: "facebook",
    docsUrl: "https://developers.facebook.com/docs/messenger-platform",
  },
  instagram: {
    label: "Instagram DMs",
    description: "Respond to leads from Instagram ads and DMs",
    fields: [
      { key: "page_id", label: "Instagram Business Account ID", type: "text", placeholder: "Linked Facebook Page ID" },
      {
        key: "page_access_token",
        label: "Page Access Token",
        type: "password",
        placeholder: "Long-lived page access token",
      },
      { key: "app_secret", label: "App Secret", type: "password", placeholder: "Facebook App Secret" },
    ],
    webhookParam: "instagram",
    docsUrl: "https://developers.facebook.com/docs/instagram-platform",
  },
  linkedin: {
    label: "LinkedIn Messaging",
    description: "Respond to leads from LinkedIn ads and messages",
    fields: [
      { key: "organization_id", label: "Organization ID", type: "text", placeholder: "LinkedIn Company Page ID" },
      { key: "access_token", label: "Access Token", type: "password", placeholder: "OAuth access token" },
    ],
    webhookParam: "linkedin",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/",
  },
  google_business: {
    label: "Google Business Messages",
    description: "Respond to leads from Google Maps and Search",
    fields: [
      { key: "agent_id", label: "GBM Agent ID", type: "text", placeholder: "Business Messages agent ID" },
      {
        key: "service_account_key",
        label: "Service Account Key",
        type: "password",
        placeholder: "JSON service account key",
      },
    ],
    webhookParam: "google_business",
    docsUrl: "https://developers.google.com/business-communications",
  },
  whatsapp: {
    label: "WhatsApp Business",
    description: "Respond to leads via WhatsApp Business",
    fields: [
      { key: "phone_number_id", label: "Phone Number ID", type: "text", placeholder: "WhatsApp phone number ID" },
      { key: "access_token", label: "Access Token", type: "password", placeholder: "Permanent access token" },
      { key: "verify_token", label: "Verify Token", type: "text", placeholder: "Custom verify token for webhook" },
      { key: "waba_id", label: "Business Account ID", type: "text", placeholder: "WhatsApp Business Account ID" },
    ],
    webhookParam: "whatsapp",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
  },
};

function ChannelSection({
  channelKey,
  channel,
  savedConfig,
  webhookBaseUrl,
}: {
  channelKey: string;
  channel: ChannelConfig;
  savedConfig: Record<string, string> | null;
  webhookBaseUrl: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = !!savedConfig?.enabled;
  const webhookUrl = `${webhookBaseUrl}?platform=${channel.webhookParam}`;

  useEffect(() => {
    if (savedConfig) {
      const initial: Record<string, string> = {};
      channel.fields.forEach((f) => {
        initial[f.key] = savedConfig[f.key] || "";
      });
      setValues(initial);
    }
  }, [savedConfig, channel.fields]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/social-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channelKey, config: values }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(`${channel.label} connected`);
    } catch {
      toast.error(`Failed to save ${channel.label} configuration`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/integrations/social-channels?channel=${channelKey}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast.success(`${channel.label} disconnected`);
    } catch {
      toast.error(`Failed to disconnect ${channel.label}`);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">{channel.label}</p>
            <p className="text-xs text-muted-foreground">{channel.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="default" className="bg-green-600 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              <XCircle className="h-3 w-3 mr-1" />
              Not Connected
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          {/* Webhook URL */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">
              Webhook URL (paste into your platform settings)
            </Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="text-xs font-mono bg-muted" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success("Webhook URL copied");
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Channel-specific fields */}
          {channel.fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs">{field.label}</Label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={values[field.key] || ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              {isConnected ? "Update" : "Connect"}
            </Button>
            {isConnected && (
              <Button variant="danger" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Disconnect
              </Button>
            )}
            <a
              href={channel.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-blue-600 hover:underline self-center"
            >
              Setup guide
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SocialChannelsCard() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Record<string, any> | null>(null);

  const webhookBaseUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/social` : "/api/webhooks/social";

  useEffect(() => {
    fetch("/api/integrations/social-channels")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data.integration?.config || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const connectedCount = config ? Object.values(config).filter((c: any) => c?.enabled).length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-10 w-10 rounded bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          Social Lead Response
          {connectedCount > 0 && (
            <Badge variant="default" className="bg-green-600 text-xs ml-2">
              {connectedCount} channel{connectedCount > 1 ? "s" : ""} active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          AI-powered instant response to leads from ads and messages on Facebook, Instagram, LinkedIn, Google Business,
          and WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(CHANNELS).map(([key, channel]) => (
              <ChannelSection
                key={key}
                channelKey={key}
                channel={channel}
                savedConfig={config?.[key] || null}
                webhookBaseUrl={webhookBaseUrl}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
