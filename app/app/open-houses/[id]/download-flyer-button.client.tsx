"use client";

import { useState } from "react";

export default function DownloadFlyerButton({ eventId }: { eventId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);

    try {
      const res = await fetch(`/api/open-houses/${eventId}/flyer`);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to download flyer");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Extract filename from Content-Disposition header or use default
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || "open-house-flyer.pdf";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download flyer. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ display: "inline-block" }}>
      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          padding: "8px 12px",
          background: downloading ? "#93c5fd" : "#3b82f6",
          color: "white",
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
          border: "none",
          cursor: downloading ? "wait" : "pointer",
        }}
      >
        {downloading ? "Downloading..." : "📄 Download Flyer"}
      </button>
      {error && <p style={{ color: "crimson", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
