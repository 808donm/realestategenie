import MLSPageTabs from "./mls-page-tabs.client";

export const metadata = {
  title: "MLS Tools | The Real Estate Genie",
};

export default function MLSPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>MLS Tools</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Search listings, generate CMAs, match leads to properties, and sync open houses.
      </p>
      <MLSPageTabs />
    </div>
  );
}
