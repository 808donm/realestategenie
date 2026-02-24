"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, CheckCircle2, XCircle, AlertCircle, Loader2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Pipeline = {
  id: string;
  name: string;
  stages: { id: string; name: string; position: number }[];
};

type Integration = {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  config: any;
  last_sync_at: string | null;
  last_error: string | null;
} | null;

export default function GHLIntegrationCard({ integration }: { integration: Integration }) {
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [leaseTemplateId, setLeaseTemplateId] = useState(
    integration?.config?.ghl_lease_template_id || ""
  );
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Pipeline state
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState(
    integration?.config?.ghl_pipeline_id || ""
  );
  const [selectedStageId, setSelectedStageId] = useState(
    integration?.config?.ghl_new_lead_stage || ""
  );
  const [savingPipeline, setSavingPipeline] = useState(false);

  const isConnected = integration?.status === "connected";
  const hasError = integration?.status === "error";

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const pipelineConfigured = integration?.config?.ghl_pipeline_id && integration?.config?.ghl_new_lead_stage;

  const handleConnect = () => {
    window.location.href = "/api/integrations/ghl/connect";
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/integrations/ghl/test", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("GHL connection successful!", {
          description: `Found ${data.locations?.length || 0} location(s)`,
        });
      } else {
        toast.error("GHL connection failed", {
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
    if (!confirm("Are you sure you want to disconnect GoHighLevel? Lead sync will stop.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/integrations/ghl/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("GHL disconnected");
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

  const handleSaveLeaseTemplate = async () => {
    setSavingTemplate(true);
    try {
      const response = await fetch("/api/integrations/ghl/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ghl_lease_template_id: leaseTemplateId.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success("Lease template ID saved");
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error("Failed to save template ID", {
          description: data.error,
        });
      }
    } catch (error: any) {
      toast.error("Failed to save", {
        description: error.message,
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const fetchPipelines = async () => {
    setLoadingPipelines(true);
    try {
      const response = await fetch("/api/integrations/ghl/pipelines");
      const data = await response.json();

      if (response.ok && data.pipelines) {
        setPipelines(data.pipelines);
        if (data.pipelines.length === 0) {
          toast.info("No pipelines found", {
            description: "Create a pipeline in GHL first, then come back to configure it here.",
          });
        }
      } else {
        toast.error("Failed to load pipelines", {
          description: data.error || "Unknown error",
        });
      }
    } catch (error: any) {
      toast.error("Failed to load pipelines", {
        description: error.message,
      });
    } finally {
      setLoadingPipelines(false);
    }
  };

  const handleSavePipeline = async () => {
    if (!selectedPipelineId || !selectedStageId) {
      toast.error("Please select both a pipeline and a stage");
      return;
    }

    setSavingPipeline(true);
    try {
      const response = await fetch("/api/integrations/ghl/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ghl_pipeline_id: selectedPipelineId,
          ghl_new_lead_stage: selectedStageId,
        }),
      });

      if (response.ok) {
        toast.success("Pipeline configuration saved!", {
          description: "New lead registrations will now create opportunities in your pipeline.",
        });
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error("Failed to save pipeline config", {
          description: data.error,
        });
      }
    } catch (error: any) {
      toast.error("Failed to save", {
        description: error.message,
      });
    } finally {
      setSavingPipeline(false);
    }
  };

  // When pipeline selection changes, reset stage if it doesn't belong to the new pipeline
  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (pipeline && !pipeline.stages.find((s) => s.id === selectedStageId)) {
      setSelectedStageId("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              GHL
            </div>
            <div>
              <CardTitle>GoHighLevel</CardTitle>
              <CardDescription>CRM & Lead Management</CardDescription>
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
          Automatically sync leads to your GoHighLevel CRM. Create contacts, opportunities, and
          trigger workflows.
        </p>

        {isConnected && integration?.config && (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Location ID:</span>{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {integration.config.ghl_location_id}
              </code>
            </div>
            {integration.last_sync_at && (
              <div className="text-sm text-muted-foreground">
                Last synced: {new Date(integration.last_sync_at).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Pipeline Configuration */}
        {isConnected && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Pipeline Configuration
              </Label>
              {pipelineConfigured && (
                <Badge variant="success" className="text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Configured
                </Badge>
              )}
              {!pipelineConfigured && (
                <Badge variant="outline" className="text-xs gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Not configured
                </Badge>
              )}
            </div>

            {!pipelineConfigured && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Pipeline must be configured for opportunities to be created from lead registrations.
              </p>
            )}

            {pipelines.length === 0 ? (
              <Button
                onClick={fetchPipelines}
                disabled={loadingPipelines}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {loadingPipelines ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {loadingPipelines ? "Loading pipelines..." : "Load Pipelines from GHL"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pipeline-select" className="text-xs text-muted-foreground">
                    Pipeline
                  </Label>
                  <Select value={selectedPipelineId} onValueChange={handlePipelineChange}>
                    <SelectTrigger id="pipeline-select">
                      <SelectValue placeholder="Select a pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPipeline && (
                  <div className="space-y-1.5">
                    <Label htmlFor="stage-select" className="text-xs text-muted-foreground">
                      New Lead Stage
                    </Label>
                    <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                      <SelectTrigger id="stage-select">
                        <SelectValue placeholder="Select stage for new leads" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedPipeline.stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSavePipeline}
                    disabled={savingPipeline || !selectedPipelineId || !selectedStageId}
                    size="sm"
                    className="flex-1"
                  >
                    {savingPipeline ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Pipeline Config
                  </Button>
                  <Button
                    onClick={fetchPipelines}
                    disabled={loadingPipelines}
                    variant="outline"
                    size="sm"
                  >
                    {loadingPipelines ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {pipelineConfigured && pipelines.length === 0 && (
              <div className="text-xs text-green-600 dark:text-green-400">
                Pipeline ID: {integration.config.ghl_pipeline_id}
              </div>
            )}
          </div>
        )}

        {/* Lease Template Configuration */}
        {isConnected && (
          <div className="space-y-3 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="lease-template-id" className="text-sm font-medium">
                Lease Template ID (Optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="lease-template-id"
                  type="text"
                  placeholder="Enter template ID from GHL"
                  value={leaseTemplateId}
                  onChange={(e) => setLeaseTemplateId(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveLeaseTemplate}
                  disabled={savingTemplate}
                  size="sm"
                >
                  {savingTemplate ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure your GHL lease template for automatic document creation. Find your template
                ID: Go to Marketing &rarr; Documents & Contracts &rarr; Click your lease template &rarr; Copy the ID
                from the URL (e.g., /templates/<strong>abc123xyz</strong>)
              </p>
              {integration?.config?.ghl_lease_template_id && (
                <div className="text-xs text-green-600 dark:text-green-400">
                  &#10003; Template configured: {integration.config.ghl_lease_template_id}
                </div>
              )}
            </div>
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
              Connect GoHighLevel
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
          <strong>Features:</strong> Contact sync, opportunity creation, pipeline mapping, tag
          management, notes
        </div>
      </CardContent>
    </Card>
  );
}
