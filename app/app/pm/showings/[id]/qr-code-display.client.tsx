"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";

export default function QRCodeDisplay({
  showingId,
  status,
}: {
  showingId: string;
  status: string;
}) {
  const [origin, setOrigin] = useState<string>("");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const checkInUrl = useMemo(() => {
    if (!origin) return "";
    return `${origin}/showing/${showingId}`;
  }, [origin, showingId]);

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

    const title = "Property Showing QR Code";
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
    .instructions { margin-top: 10px; font-size: 14px; }
    img { width: 360px; height: 360px; display: block; margin: 14px auto; }
    .url { margin-top: 10px; font-size: 11px; word-break: break-all; }
    @media print { .noprint { display: none; } body { padding: 0; } .card { border: none; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <div class="instructions">Scan this QR code to submit a rental application</div>
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
    <Card>
      <CardHeader>
        <CardTitle>QR Code for Attendees</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPublished && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            ⚠️ This showing is not published. Change status to "published" to activate the QR code.
          </div>
        )}

        {isPublished && (
          <>
            <p className="text-sm text-muted-foreground">
              Attendees can scan this QR code or visit the link below to submit their rental application
            </p>

            <div className="flex justify-center">
              {dataUrl ? (
                <img src={dataUrl} alt="QR code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-muted-foreground">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Check-in URL</div>
              <code className="block p-3 bg-muted rounded-md text-xs break-all">
                {checkInUrl || "Loading..."}
              </code>
            </div>

            <div className="flex gap-3">
              <Button onClick={copyLink} disabled={!checkInUrl} variant="outline">
                Copy Link
              </Button>
              <Button onClick={printQr} disabled={!dataUrl} variant="outline">
                Print QR Code
              </Button>
            </div>

            {msg && (
              <div className="text-sm text-green-600">
                {msg}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
