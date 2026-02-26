import PropertyDataTabs from "./property-data-tabs.client";

export const metadata = {
  title: "Property Data | The Real Estate Genie",
};

export default function PropertyDataPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Property Data</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Search property records, view valuations &amp; ownership details, and find prospecting opportunities.
      </p>
      <PropertyDataTabs />
    </div>
  );
}
