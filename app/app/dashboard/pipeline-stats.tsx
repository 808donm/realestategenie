import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";
import Link from "next/link";
import { PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS, type PipelineStage } from "@/lib/pipeline-stages";

type PipelineCount = {
  stage: string;
  label: string;
  count: number;
};

export default function PipelineStats({
  stages,
  totalLeads,
  hotLeads,
}: {
  stages: PipelineCount[];
  totalLeads: number;
  hotLeads: number;
}) {
  const activeStages = stages.filter((s) => s.count > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Pipeline
          </CardTitle>
          <Link href="/app/pipeline" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{totalLeads}</div>
            <div className="text-xs text-muted-foreground">Total Leads</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{hotLeads}</div>
            <div className="text-xs text-muted-foreground">Hot Leads</div>
          </div>
        </div>

        {/* Stage breakdown */}
        {activeStages.length > 0 ? (
          <div className="space-y-2">
            {activeStages.map((stage) => {
              const color = PIPELINE_STAGE_COLORS[stage.stage as PipelineStage] || "#6b7280";
              const pct = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
              return (
                <div key={stage.stage} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs flex-1 truncate">{stage.label}</span>
                  <span className="text-xs font-semibold">{stage.count}</span>
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No leads in pipeline yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
