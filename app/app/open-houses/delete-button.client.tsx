"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteOpenHouseButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault(); // prevent card link navigation
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this open house? This cannot be undone.")) {
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/open-houses/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Failed to delete open house");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      title="Delete open house"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "none",
        background: "rgba(0,0,0,0.45)",
        color: "#fff",
        cursor: pending ? "wait" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        lineHeight: 1,
        opacity: pending ? 0.5 : 1,
        zIndex: 2,
      }}
    >
      ✕
    </button>
  );
}
