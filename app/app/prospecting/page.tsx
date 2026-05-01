import dynamic from "next/dynamic";

const Prospecting = dynamic(() => import("../property-data/prospecting.client"), {
  loading: () => <div style={{ textAlign: "center", padding: 40, color: "hsl(var(--muted-foreground))" }}>Loading prospecting tools...</div>,
});

export const metadata = {
  title: "Prospecting | The Real Estate Genie",
};

export default function ProspectingPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Prospecting Tools</h1>
      <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: 24 }}>
        Find motivated sellers, distressed properties, investor portfolios, and farming opportunities using public
        records intelligence.
      </p>
      <Prospecting />
    </div>
  );
}
