"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Conversation = {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  current_phase: string;
  current_heat_score: number;
  ai_message_count: number;
  source: string;
  last_lead_message_at: string | null;
  created_at: string;
};

const PHASE_LABELS: Record<string, string> = {
  greeting: "Greeting",
  qualifying: "Qualifying",
  scheduling: "Scheduling",
  escalated: "Escalated",
  handed_off: "Handed Off",
};

const PHASE_COLORS: Record<string, string> = {
  greeting: "bg-blue-100 text-blue-700",
  qualifying: "bg-purple-100 text-purple-700",
  scheduling: "bg-amber-100 text-amber-700",
  escalated: "bg-red-100 text-red-700",
  handed_off: "bg-gray-100 text-gray-500",
};

export default function AIConversationsCard({ agentId }: { agentId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lead-response/conversations?agentId=${agentId}&limit=5`)
      .then((r) => r.json())
      .then((data) => {
        setConversations(data.conversations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live AI Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const active = conversations.filter(
    (c) => c.current_phase !== "handed_off"
  );

  if (active.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live AI Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active AI conversations. When leads message you, the AI will
            automatically qualify them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Live AI Conversations</CardTitle>
          <span className="text-xs text-muted-foreground">
            {active.length} active
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {c.contact_name || c.contact_phone || "Unknown"}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    PHASE_COLORS[c.current_phase] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {PHASE_LABELS[c.current_phase] || c.current_phase}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Score: {c.current_heat_score}</span>
                <span>{c.ai_message_count} msgs</span>
                <span>via {c.source}</span>
              </div>
            </div>
            {c.current_phase === "escalated" && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await fetch("/api/lead-response/handoff", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: c.id }),
                  });
                  setConversations((prev) =>
                    prev.map((x) =>
                      x.id === c.id
                        ? { ...x, current_phase: "handed_off" }
                        : x
                    )
                  );
                }}
              >
                Take Over
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
