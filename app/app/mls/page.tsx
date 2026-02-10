import MLSClient from "./mls.client";

export const metadata = {
  title: "MLS Search | The Real Estate Genie",
};

export default function MLSPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>MLS Search</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Search property listings from the MLS and share them with your clients.
      </p>
      <MLSClient />
    </div>
  );
}
