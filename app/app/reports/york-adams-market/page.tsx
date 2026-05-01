import Link from "next/link";
import YorkAdamsMarketClient from "./york-adams-market.client";

export const metadata = { title: "York & Adams Counties Market Statistics | The Real Estate Genie" };

export default function YorkAdamsMarketPage() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/app/reports" style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", textDecoration: "none" }}>
          &larr; Back to Reports
        </Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>
        York &amp; Adams Counties Market Statistics
      </h1>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, margin: "0 0 20px 0" }}>
        Source: RAYAC (REALTORS Association of York &amp; Adams Counties) &bull; Bright MLS
      </p>
      <YorkAdamsMarketClient />
    </div>
  );
}
