"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  agentId: string;
  agentName: string;
  idxBrokerConfig?: { api_key?: string } | null;
}

export default function WebAssistantCard({ agentId, agentName, idxBrokerConfig }: Props) {
  const [copied, setCopied] = useState(false);
  const [idxKey, setIdxKey] = useState(idxBrokerConfig?.api_key || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://realestategenie.app";
  const embedCode = `<script src="${appUrl}/api/web-assistant/embed?agentId=${agentId}"></script>`;
  const chatUrl = `${appUrl}/chat/${agentId}`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveIdxKey = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/integrations/idx-broker/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: idxKey }),
      });
      if (res.ok) {
        setSaveMsg("IDX Broker API key saved!");
      } else {
        const data = await res.json();
        setSaveMsg(data.error || "Failed to save");
      }
    } catch {
      setSaveMsg("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const testChat = () => {
    window.open(chatUrl, "_blank", "width=400,height=620");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-10 w-10 rounded bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
              <circle cx="8" cy="10" r="1" />
              <circle cx="12" cy="10" r="1" />
              <circle cx="16" cy="10" r="1" />
            </svg>
          </div>
          <span>Hoku Web Assistant</span>
        </CardTitle>
        <CardDescription>
          Add an AI chat assistant to your website. Hoku pre-qualifies visitors, captures leads, searches MLS listings, and creates contacts in your CRM automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Embed Code */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Embed Code</Label>
          <p className="text-xs text-muted-foreground">
            Paste this code before the closing &lt;/body&gt; tag on your website. It adds a floating chat button in the bottom-right corner.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={embedCode}
              className="font-mono text-xs"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button variant="outline" size="sm" onClick={copyEmbed} className="shrink-0">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Direct Link */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Direct Chat Link</Label>
          <p className="text-xs text-muted-foreground">
            Share this link directly with prospects or use it as a landing page.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={chatUrl}
              className="font-mono text-xs"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button variant="outline" size="sm" onClick={testChat} className="shrink-0">
              Test
            </Button>
          </div>
        </div>

        {/* IDX Broker (Optional) */}
        <div className="space-y-2 border-t pt-4">
          <Label className="text-sm font-semibold">IDX Broker API Key (Optional)</Label>
          <p className="text-xs text-muted-foreground">
            Connect your IDX Broker account to enable MLS property search in the chat. Hoku will find matching listings and email them to prospects.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Your IDX Broker API key"
              value={idxKey}
              onChange={(e) => setIdxKey(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={saveIdxKey} disabled={saving || !idxKey} className="shrink-0">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
          {saveMsg && (
            <p className={`text-xs ${saveMsg.includes("saved") ? "text-green-600" : "text-red-600"}`}>
              {saveMsg}
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="border-t pt-4">
          <Label className="text-sm font-semibold mb-2 block">How It Works</Label>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>1. Visitor clicks the chat button on your website</p>
            <p>2. Hoku greets them as your assistant and asks if they're buying or selling</p>
            <p>3. <strong>Buyers:</strong> Hoku captures contact info, timeline, pre-approval, neighborhoods, must-haves, then searches for matching properties</p>
            <p>4. <strong>Sellers:</strong> Hoku captures the property address, looks up AVM/property data, then captures contact info</p>
            <p>5. A scored lead is created in your dashboard with the full conversation in the CRM notes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
