import LocalPipelineClient from "./local-pipeline.client";
import PageHelp from "../components/page-help";

export const metadata = { title: "Pipeline | The Real Estate Genie" };

export default function PipelinePage() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Pipeline</h1>
        <PageHelp
          title="Sales Pipeline"
          description="Drag leads between stages to track their progress from first contact to closing. Each column is a stage in your sales process."
          tips={[
            "Drag and drop cards to move between stages",
            "Click a card to see full details and draft follow-up emails",
            "Use arrow buttons for quick stage advancement",
          ]}
        />
      </div>
      <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: 24, fontSize: 14 }}>
        Track and advance your leads through every stage of the deal.
      </p>
      <LocalPipelineClient />
    </div>
  );
}
