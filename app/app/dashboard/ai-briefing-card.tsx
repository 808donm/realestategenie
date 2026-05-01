import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import Link from "next/link";

type Priority = {
  title: string;
  description: string;
  leadId?: string;
};

export default function AIBriefingCard({
  priorities,
  generatedAt,
}: {
  priorities: Priority[] | null;
  generatedAt: string | null;
}) {
  if (!priorities || priorities.length === 0) {
    return (
      <Card className="border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/40 dark:bg-indigo-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            AI Daily Briefing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your AI briefing will appear here once you have leads in your pipeline. Add leads through open houses or
            manual entry to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const priorityColors = ["bg-red-500", "bg-amber-500", "bg-blue-500"];

  return (
    <Card className="border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            AI Daily Briefing
          </CardTitle>
          {generatedAt && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(generatedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {priorities.map((priority, i) => (
            <div key={i} className="flex gap-3">
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full ${priorityColors[i] || "bg-gray-400"} text-white text-xs font-bold flex items-center justify-center mt-0.5`}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{priority.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{priority.description}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed text-center mt-4">
          This content was generated using AI. AI can make mistakes. Check AI generated content against reliable
          information before using.
        </p>
      </CardContent>
    </Card>
  );
}
