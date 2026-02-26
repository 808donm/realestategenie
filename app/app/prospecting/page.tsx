import dynamic from "next/dynamic";

const Prospecting = dynamic(
  () => import("../property-data/prospecting.client"),
  {
    loading: () => (
      <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
        Loading prospecting tools...
      </div>
    ),
  }
);

export const metadata = {
  title: "Prospecting | The Real Estate Genie",
};

export default function ProspectingPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Prospecting Tools</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Find motivated sellers, distressed properties, investor portfolios, and farming opportunities using ATTOM property intelligence.
      </p>
      <Prospecting />
    </div>
  );
}
