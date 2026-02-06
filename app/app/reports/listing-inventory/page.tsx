import Link from "next/link";
import ListingInventoryClient from "./listing-inventory.client";

export default function ListingInventoryPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link
          href="/app/reports"
          style={{ fontSize: 14, opacity: 0.7, textDecoration: "none", color: "inherit" }}
        >
          &larr; Back to Reports
        </Link>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Listing Inventory Health
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Active listings, days on market, and price adjustment alerts for aging inventory. Data from MLS/Trestle.
      </p>
      <ListingInventoryClient />
    </div>
  );
}
