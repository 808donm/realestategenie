"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";

type Opportunity = {
  id: string;
  name: string;
  monetaryValue: number;
  contactName: string;
  status: string;
};

type PipelineStage = {
  stageId: string;
  stageName: string;
  position: number;
  opportunityCount: number;
  totalValue: number;
  opportunities: Opportunity[];
  error?: string;
};

type PipelineData = {
  pipelineId: string;
  pipelineName: string;
  stages: PipelineStage[];
  totalOpportunities: number;
  totalValue: number;
};

type PipelineOption = {
  id: string;
  name: string;
};

export default function PipelineStageBreakdown() {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [availablePipelines, setAvailablePipelines] = useState<PipelineOption[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  // Fetch available pipelines on mount
  useEffect(() => {
    fetchAvailablePipelines();
  }, []);

  // Fetch pipeline data when selection changes
  useEffect(() => {
    if (selectedPipelineId) {
      fetchPipelineData(selectedPipelineId);
    }
  }, [selectedPipelineId]);

  const fetchAvailablePipelines = async () => {
    try {
      const response = await fetch(`/api/ghl/pipelines`);

      if (!response.ok) {
        throw new Error("Failed to fetch pipelines");
      }

      const data = await response.json();
      setAvailablePipelines(data.pipelines);

      // Get stored preference or default to Real Estate Pipeline
      const storedPipelineId = localStorage.getItem("selectedPipelineId");
      const defaultPipeline = storedPipelineId || "yGkdoIRAz83GmWQ74HOw";

      // Check if the stored/default pipeline exists in the list
      const pipelineExists = data.pipelines.some((p: PipelineOption) => p.id === defaultPipeline);

      if (pipelineExists) {
        setSelectedPipelineId(defaultPipeline);
      } else if (data.pipelines.length > 0) {
        // Fall back to first pipeline if default not found
        setSelectedPipelineId(data.pipelines[0].id);
      }
    } catch (error: any) {
      console.error("Failed to fetch pipelines:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchPipelineData = async (pipelineId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ghl/pipeline-breakdown?pipelineId=${pipelineId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch pipeline data");
      }

      const data = await response.json();
      setPipelineData(data);
    } catch (error: any) {
      console.error("Failed to fetch pipeline data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    // Store preference in localStorage
    localStorage.setItem("selectedPipelineId", pipelineId);
  };

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real Estate Pipeline</CardTitle>
          <CardDescription>Opportunities by stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real Estate Pipeline</CardTitle>
          <CardDescription>Opportunities by stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-2">Failed to load pipeline data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pipelineData && !loading && !error) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle>Pipeline Overview</CardTitle>
            {pipelineData && (
              <CardDescription>
                {pipelineData.totalOpportunities} opportunities • {formatCurrency(pipelineData.totalValue)} total value
              </CardDescription>
            )}
          </div>
          {availablePipelines.length > 0 && (
            <div className="w-64">
              <Select value={selectedPipelineId} onValueChange={handlePipelineChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {availablePipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!pipelineData ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Loading pipeline data...</p>
          </div>
        ) : pipelineData.stages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No stages found in this pipeline</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pipelineData.stages.map((stage) => {
              const isExpanded = expandedStages.has(stage.stageId);

              return (
                <div key={stage.stageId} className="border rounded-lg">
                  {/* Stage Header */}
                  <button
                    onClick={() => toggleStage(stage.stageId)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <div className="font-semibold">{stage.stageName}</div>
                        <div className="text-sm text-muted-foreground">
                          {stage.opportunityCount} {stage.opportunityCount === 1 ? 'opportunity' : 'opportunities'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">
                        {formatCurrency(stage.totalValue)}
                      </div>
                      {stage.opportunityCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          avg {formatCurrency(stage.totalValue / stage.opportunityCount)}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Expanded Opportunities List */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20">
                      {stage.opportunities.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No opportunities in this stage
                        </div>
                      ) : (
                        <div className="divide-y">
                          {stage.opportunities.map((opp) => (
                            <div key={opp.id} className="p-4 flex items-center justify-between">
                              <div>
                                <div className="font-medium">{opp.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {opp.contactName}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {formatCurrency(opp.monetaryValue)}
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {opp.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
