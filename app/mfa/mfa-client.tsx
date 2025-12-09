"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function MfaClient() {
  const supabase = supabaseBrowser();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const params = useSearchParams();
  const router = useRouter();
  const redirectTo = params.get("redirect") || "/app/dashboard";

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const factorsRes = await supabase.auth.mfa.listFactors();
    const totp = factorsRes.data?.totp?.[0];

    if (!totp) {
      setLoading(false);
      setErr("No authenticator app is set up for this account.");
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totp.id,
      code,
    });

    setLoading(false);
    if (error) setErr(error.message);
    else router.replace(redirectTo);
  }

  return (
    <div style={{ maxWidth: 420, margin: "64px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Enter your security code</h1>
      <p style={{ opacity: 0.8 }}>Open your authenticator app and enter the 6-digit code.</p>

      <form onSubmit={verify} style={{ marginTop: 16 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="123456"
          style={{ width: "100%", padding: 10, fontSize: 18, letterSpacing: 4 }}
          required
        />
        <button
          disabled={loading || code.length !== 6}
          style={{ width: "100%", padding: 12, marginTop: 12 }}
        >
          Verify
        </button>
      </form>

      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}
    </div>
  );
}
