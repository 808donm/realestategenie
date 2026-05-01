import Link from "next/link";
import HawaiiIslandStatisticsClient from "./hawaii-island-statistics.client";

export const metadata = { title: "Hawai'i Island Monthly Market Statistics" };

export default function HawaiiIslandStatisticsPage() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/app/reports" style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", textDecoration: "none" }}>
          &larr; Back to Reports
        </Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 20px 0" }}>
        Hawai&apos;i Island Monthly Market Statistics
      </h1>
      <HawaiiIslandStatisticsClient />
    </div>
  );
}
