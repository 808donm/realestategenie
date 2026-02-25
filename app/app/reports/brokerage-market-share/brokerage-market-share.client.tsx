"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

/* ---------- helpers ---------- */
const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => `${n.toFixed(1)}%`;

/* ---------- types ---------- */
interface Brokerage {
  name: string;
  transactions: number;
  volume: number;
  isYours: boolean;
}

/* ---------- fallback sample data by zip ---------- */
const FALLBACK_DATA: Record<string, Brokerage[]> = {
  "90210": [
    { name: "Luxury Estates Group", transactions: 48, volume: 128400000, isYours: false },
    { name: "Beverly Hills Realty", transactions: 41, volume: 112300000, isYours: false },
    { name: "Your Brokerage", transactions: 34, volume: 89200000, isYours: true },
    { name: "Pacific Coast Properties", transactions: 29, volume: 76500000, isYours: false },
    { name: "Sunset Realty Partners", transactions: 22, volume: 58100000, isYours: false },
    { name: "Hilltop Real Estate", transactions: 18, volume: 42700000, isYours: false },
    { name: "Premier Home Sales", transactions: 14, volume: 33200000, isYours: false },
    { name: "Golden State Homes", transactions: 11, volume: 24800000, isYours: false },
  ],
  "10001": [
    { name: "Manhattan Elite Realty", transactions: 62, volume: 245000000, isYours: false },
    { name: "Your Brokerage", transactions: 45, volume: 178500000, isYours: true },
    { name: "Empire State Properties", transactions: 38, volume: 152000000, isYours: false },
    { name: "Hudson River Homes", transactions: 31, volume: 119400000, isYours: false },
    { name: "Tribeca Real Estate", transactions: 27, volume: 104200000, isYours: false },
    { name: "Gotham Realty Group", transactions: 21, volume: 81600000, isYours: false },
    { name: "Skyline Brokers", transactions: 16, volume: 58900000, isYours: false },
  ],
  "33139": [
    { name: "Your Brokerage", transactions: 52, volume: 98600000, isYours: true },
    { name: "South Beach Realty", transactions: 47, volume: 88200000, isYours: false },
    { name: "Ocean Drive Properties", transactions: 39, volume: 74100000, isYours: false },
    { name: "Miami Luxury Group", transactions: 33, volume: 62500000, isYours: false },
    { name: "Biscayne Bay Homes", transactions: 26, volume: 48300000, isYours: false },
    { name: "Coral Gables Realty", transactions: 19, volume: 35700000, isYours: false },
  ],
  "60614": [
    { name: "Lincoln Park Realty", transactions: 55, volume: 71500000, isYours: false },
    { name: "Windy City Homes", transactions: 44, volume: 57200000, isYours: false },
    { name: "Lakeshore Properties", transactions: 37, volume: 48100000, isYours: false },
    { name: "Your Brokerage", transactions: 30, volume: 39000000, isYours: true },
    { name: "Chicago Prime Realty", transactions: 24, volume: 31200000, isYours: false },
    { name: "Gold Coast Group", transactions: 18, volume: 23400000, isYours: false },
    { name: "North Side Real Estate", transactions: 12, volume: 15600000, isYours: false },
  ],
};

/* ---------- component ---------- */
export default function BrokerageMarketShareClient() {
  const [data, setData] = useState<Record<string, Brokerage[]>>(FALLBACK_DATA);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/brokerage-market-share");
      if (!res.ok) throw new Error("API error");
      const json: Record<string, Brokerage[]> = await res.json();
      const hasData = Object.keys(json).length > 0 &&
        Object.values(json).some((arr) => arr.length > 0);
      if (hasData) {
        setData(json);
        setIsLive(true);
      }
    } catch {
      // keep fallback data
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const ZIP_CODES = useMemo(() => Object.keys(data), [data]);
  const [zip, setZip] = useState<string>(Object.keys(FALLBACK_DATA)[0]);

  const raw = data[zip] ?? [];
  const totalTx = raw.reduce((s, b) => s + b.transactions, 0);
  const totalVol = raw.reduce((s, b) => s + b.volume, 0);

  /* ranked leaderboard */
  const leaderboard = useMemo(() => {
    const sorted = [...raw].sort((a, b) => b.volume - a.volume);
    return sorted.map((b, i) => ({
      ...b,
      rank: i + 1,
      marketShare: totalVol > 0 ? (b.volume / totalVol) * 100 : 0,
    }));
  }, [raw, totalVol]);

  const yours = leaderboard.find((b) => b.isYours);
  const top3 = leaderboard.slice(0, 3);

  /* PDF export */
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Brokerage Market Share", 14, 20);
    doc.setFontSize(10);
    doc.text(`Zip Code: ${zip}  |  Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    if (yours) {
      doc.setFontSize(12);
      doc.text(`Your Rank: #${yours.rank}  |  Market Share: ${pct(yours.marketShare)}  |  Transactions: ${yours.transactions}`, 14, 40);
      doc.text(`Total Market Volume: ${fmt.format(totalVol)}`, 14, 48);
    }

    let y = 60;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [14, 28, 80, 118, 150];
    ["Rank", "Brokerage", "Transactions", "Volume", "Share %"].forEach((h, i) => doc.text(h, cols[i], y));
    doc.setFont("helvetica", "normal");

    leaderboard.forEach((b) => {
      y += 7;
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`#${b.rank}`, cols[0], y);
      doc.text(b.name, cols[1], y);
      doc.text(String(b.transactions), cols[2], y);
      doc.text(fmt.format(b.volume), cols[3], y);
      doc.text(pct(b.marketShare), cols[4], y);
    });

    doc.save("brokerage-market-share.pdf");
  };

  const card = (bg: string): React.CSSProperties => ({
    background: bg,
    borderRadius: 12,
    padding: "18px 20px",
    flex: "1 1 0",
    minWidth: 180,
  });

  return (
    <div>
      {/* integration banner */}
      <div style={{ background: isLive ? "#E8F5E9" : "#FFF8E1", border: `1px solid ${isLive ? "#A5D6A7" : "#FFE082"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{isLive ? "\u2705" : "\u26A0"}</span>
        <span style={{ fontSize: 14 }}>
          {isLive ? (
            <>This report is showing <strong>live data</strong> from your connected integrations.</>
          ) : (
            <>This report uses <strong>sample data</strong>. Connect your MLS/Trestle feed to see actual market share data.{" "}
              <Link href="/app/integrations" style={{ color: "#1565C0", fontWeight: 600 }}>Set up integrations &rarr;</Link>
            </>
          )}
        </span>
      </div>

      {/* toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Zip Code:</label>
          <select
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, fontWeight: 500, background: "#fff", cursor: "pointer" }}
          >
            {ZIP_CODES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <button
          onClick={exportPDF}
          style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Export PDF
        </button>
      </div>

      {/* summary cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={card("#E8F5E9")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Your Rank</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>#{yours?.rank ?? "N/A"}</div>
        </div>
        <div style={card("#E3F2FD")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Your Market Share</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{yours ? pct(yours.marketShare) : "N/A"}</div>
        </div>
        <div style={card("#FFF3E0")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Your Transactions</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{yours?.transactions ?? 0}</div>
        </div>
        <div style={card("#F3E5F5")}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Total Market Volume</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt.format(totalVol)}</div>
        </div>
      </div>

      {/* comparison vs top 3 */}
      {yours && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Your Brokerage vs Top 3</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {top3.map((b) => {
              const isYou = b.isYours;
              return (
                <div
                  key={b.name}
                  style={{
                    flex: "1 1 0",
                    minWidth: 200,
                    border: isYou ? "2px solid #1565C0" : "1px solid #e0e0e0",
                    borderRadius: 12,
                    padding: "14px 18px",
                    background: isYou ? "#E3F2FD" : "#fff",
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>#{b.rank}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{b.name}{isYou ? " (You)" : ""}</div>
                  <div style={{ fontSize: 13 }}>{b.transactions} transactions</div>
                  <div style={{ fontSize: 13 }}>{fmt.format(b.volume)} volume</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{pct(b.marketShare)} share</div>
                </div>
              );
            })}
            {!top3.some((b) => b.isYours) && yours && (
              <div
                style={{
                  flex: "1 1 0",
                  minWidth: 200,
                  border: "2px solid #1565C0",
                  borderRadius: 12,
                  padding: "14px 18px",
                  background: "#E3F2FD",
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>#{yours.rank}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{yours.name} (You)</div>
                <div style={{ fontSize: 13 }}>{yours.transactions} transactions</div>
                <div style={{ fontSize: 13 }}>{fmt.format(yours.volume)} volume</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{pct(yours.marketShare)} share</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* leaderboard table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              {["Rank", "Brokerage Name", "Transactions", "Volume", "Market Share %"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, borderBottom: "2px solid #e0e0e0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((b) => (
              <tr
                key={b.name}
                style={{
                  borderBottom: "1px solid #eee",
                  background: b.isYours ? "#E3F2FD" : "transparent",
                  fontWeight: b.isYours ? 700 : 400,
                }}
              >
                <td style={{ padding: "10px 12px" }}>#{b.rank}</td>
                <td style={{ padding: "10px 12px" }}>
                  {b.name}
                  {b.isYours && (
                    <span style={{ marginLeft: 8, background: "#1565C0", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                      YOU
                    </span>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>{b.transactions}</td>
                <td style={{ padding: "10px 12px" }}>{fmt.format(b.volume)}</td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 80, height: 8, background: "#e0e0e0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(b.marketShare * 3, 100)}%`, height: "100%", background: b.isYours ? "#1565C0" : "#90CAF9", borderRadius: 4 }} />
                    </div>
                    <span>{pct(b.marketShare)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
