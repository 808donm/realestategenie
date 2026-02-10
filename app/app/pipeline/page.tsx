import PipelineClient from "./pipeline.client";

export const metadata = { title: "Pipeline | The Real Estate Genie" };

export default function PipelinePage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Pipeline</h1>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
        View and manage your deals across pipeline stages.
      </p>
      <PipelineClient />
    </div>
  );
}
