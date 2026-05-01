"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StopImpersonationButton() {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  async function handleStop() {
    setStopping(true);
    try {
      await fetch("/api/admin/impersonate/stop", { method: "POST" });
      router.push("/app/admin/users");
      router.refresh();
    } catch {
      setStopping(false);
    }
  }

  return (
    <button
      onClick={handleStop}
      disabled={stopping}
      style={{
        padding: "4px 14px",
        fontSize: 13,
        fontWeight: 700,
        background: "hsl(var(--card))",
        color: "#991b1b",
        border: "2px solid #991b1b",
        borderRadius: 6,
        cursor: stopping ? "wait" : "pointer",
        opacity: stopping ? 0.6 : 1,
      }}
    >
      {stopping ? "Stopping..." : "Stop Viewing"}
    </button>
  );
}
