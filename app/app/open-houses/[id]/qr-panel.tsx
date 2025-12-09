"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function QRPanel({ eventId, status }: { eventId: string; status: string }) {
  const supabase = supabaseBrowser();
  const [qr, setQr] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const intakeUrl = `${location.origin}/oh/${eventId}`;

  useEffect(() => {
    (async () => {
      const dataUrl = await QRCode.toDataURL(intakeUrl, { margin: 1, scale: 6 });
      setQr(dataUrl);
    })().catch((e) => setErr(String(e?.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function setPublished(next: "draft" | "published") {
    setErr(null);
    setWorking(true);
    const { error } = await supabase
      .from("open_house_events")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", eventId);

    setWorking(false);
    if (error) setErr(error.message);
    else window.location.reload();
  }

  return (
    <div style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>QR Code</h2>
      <p style={{ opacity: 0.8 }}>
        Attendees scan this to start the intake flow:
        <br />
        <code>{intakeUrl}</code>
      </p>

      {qr && <img src={qr} alt="QR code" style={{ width: 220, height: 220 }} />}

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        {status !== "published" ? (
          <button disabled={working} onClick={() => setPublished("published")} style={{ padding: 10 }}>
            Publish
          </button>
        ) : (
          <button disabled={working} onClick={() => setPublished("draft")} style={{ padding: 10 }}>
            Unpublish
          </button>
        )}
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </div>
  );
}
