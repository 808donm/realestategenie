import PipelineTabs from "./pipeline-tabs.client";

export const metadata = { title: "Pipeline | The Real Estate Genie" };

export default function PipelinePage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Pipeline</h1>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
        Track and advance your leads through every stage of the deal.
      </p>
      <PipelineTabs />
    </div>
  );
}
