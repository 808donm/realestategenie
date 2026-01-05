"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

type WebhookLog = {
  id: string;
  event_type: string;
  webhook_url: string;
  status_code: number | null;
  error: string | null;
  attempts: number;
  delivered_at: string | null;
  created_at: string;
  payload: any;
  response_body: string | null;
};

export default function WebhookLogsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/n8n/logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] p-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Webhook Delivery Logs</CardTitle>
                <CardDescription>Last 20 webhook deliveries to n8n</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchLogs}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Button variant="outline" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {logs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No webhook logs yet. Configure your webhook and trigger an event.
                </p>
              )}
              {logs.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {log.delivered_at ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-danger" />
                      )}
                      <code className="text-sm font-semibold">{log.event_type}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.status_code && (
                        <Badge
                          variant={
                            log.status_code >= 200 && log.status_code < 300
                              ? "success"
                              : "danger"
                          }
                        >
                          {log.status_code}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {log.attempts} attempt{log.attempts !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                    {log.delivered_at && (
                      <> → Delivered {new Date(log.delivered_at).toLocaleString()}</>
                    )}
                  </div>

                  {log.error && (
                    <div className="p-2 bg-danger/10 rounded text-xs text-danger">
                      {log.error}
                    </div>
                  )}

                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View payload
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </details>

                  {log.response_body && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View response
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                        {log.response_body}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
