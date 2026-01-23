"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function PipelineStageBreakdown() {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      // Fetch pipeline breakdown
      const response = await fetch(`/api/ghl/pipeline-breakdown?pipelineName=Real Estate Pipeline`);

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

  if (!pipelineData) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{pipelineData.pipelineName}</CardTitle>
            <CardDescription>
              {pipelineData.totalOpportunities} opportunities • {formatCurrency(pipelineData.totalValue)} total value
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pipelineData.stages.length === 0 ? (
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
