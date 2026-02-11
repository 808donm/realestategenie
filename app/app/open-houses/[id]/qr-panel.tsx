"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

export default function QRPanel({
  eventId,
  status,
}: {
  eventId: string;
  status: string;
}) {
  const [origin, setOrigin] = useState<string>("");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [secureToken, setSecureToken] = useState<string>("");
  const [tokenLoading, setTokenLoading] = useState<boolean>(true);

  useEffect(() => {
    // Avoid SSR issues: only read window in effect
    setOrigin(window.location.origin);
  }, []);

  // Fetch secure QR token from API
  useEffect(() => {
    if (!origin) return;

    async function fetchToken() {
      try {
        const response = await fetch(`/api/open-houses/${eventId}/qr-token`);
        if (response.ok) {
          const data = await response.json();
          setSecureToken(data.token);
        } else {
          console.error('Failed to fetch QR token');
          setMsg('⚠️ Failed to generate secure QR code');
        }
      } catch (error) {
        console.error('Error fetching QR token:', error);
        setMsg('⚠️ Error generating secure QR code');
      } finally {
        setTokenLoading(false);
      }
    }

    fetchToken();
  }, [origin, eventId]);

  const checkInUrl = useMemo(() => {
    if (!origin || !secureToken) return "";
    return `${origin}/oh/${eventId}?token=${secureToken}`;
  }, [origin, eventId, secureToken]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!checkInUrl) return;
      const url = await QRCode.toDataURL(checkInUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        scale: 8,
      });
      if (alive) setDataUrl(url);
    })();
    return () => {
      alive = false;
    };
  }, [checkInUrl]);

  async function copyLink() {
    if (!checkInUrl) return;
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setMsg("Copied link.");
      setTimeout(() => setMsg(""), 1500);
    } catch {
      // Fallback for older / locked-down browsers
      const ta = document.createElement("textarea");
      ta.value = checkInUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setMsg("Copied link.");
      setTimeout(() => setMsg(""), 1500);
    }
  }

  function printQr() {
    if (!dataUrl) return;

    const w = window.open("", "_blank", "noopener,noreferrer,width=600,height=800");
    if (!w) {
      setMsg("Popup blocked. Allow popups to print.");
      setTimeout(() => setMsg(""), 2000);
      return;
    }

    const title = "Open House QR Code";
    const safeUrl = checkInUrl || "";

    w.document.open();
    w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; }
    .card { border: 1px solid #ddd; border-radius: 16px; padding: 18px; }
    h1 { margin: 0 0 10px; font-size: 20px; }
    .url { margin-top: 10px; font-size: 12px; word-break: break-all; }
    img { width: 360px; height: 360px; display: block; margin: 14px auto; }
    @media print { .noprint { display: none; } body { padding: 0; } .card { border: none; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <div>Scan to check in</div>
    <img src="${dataUrl}" alt="QR code" />
    <div class="url">${safeUrl}</div>
    <button class="noprint" onclick="window.print()" style="margin-top:16px;padding:10px 12px;font-weight:700;">Print</button>
  </div>
</body>
</html>
    `);
    w.document.close();
    w.focus();
  }

  const isPublished = status === "published";

  return (
    <div style={{ marginTop: 18, padding: 16, background: "#fff", border: "1px solid #e6e6e6", borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>QR Check-in</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            {isPublished
              ? "Use this at the open house entrance."
              : "Event is not published. Publish it before using the QR."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copyLink} disabled={!checkInUrl} style={btn}>
            Copy link
          </button>
          <button onClick={printQr} disabled={!dataUrl} style={btn}>
            Print
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Check-in URL</div>
        <code style={{ display: "block", padding: 10, background: "#f6f6f6", borderRadius: 12, wordBreak: "break-all" }}>
          {checkInUrl || "Loading…"}
        </code>
      </div>

      <div style={{ marginTop: 16, display: "grid", placeItems: "center" }}>
        {dataUrl ? (
          <img src={dataUrl} alt="QR code" style={{ width: 320, height: 320 }} />
        ) : (
          <div style={{ opacity: 0.7 }}>Generating QR…</div>
        )}
      </div>

      {msg && <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>{msg}</div>}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
