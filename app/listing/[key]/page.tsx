import { Metadata } from "next";
import ListingView from "./listing-view.client";

export const metadata: Metadata = {
  title: "Property Listing | The Real Estate Genie",
  description: "View property listing details",
};

export default async function PublicListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { key } = await params;
  const search = await searchParams;
  const agentId = typeof search.a === "string" ? search.a : undefined;

  if (!agentId) {
    return (
      <div style={{ maxWidth: 720, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Listing Not Found</h1>
        <p style={{ marginTop: 12, color: "#6b7280" }}>
          This listing link is invalid or has expired.
        </p>
      </div>
    );
  }

  return <ListingView listingKey={key} agentId={agentId} />;
}
