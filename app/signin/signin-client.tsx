"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import OAuthButtons from "./oauth-buttons";


export default function SignInClient() {
  const supabase = supabaseBrowser();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/app/dashboard";

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    setLoading(false);
    if (error) setErr(error.message);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Check your email for the sign-in link.");
  }

  return (
    <div style={{ maxWidth: 420, margin: "64px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Sign in</h1>

      <OAuthButtons />
<div style={{ margin: "14px 0", textAlign: "center", opacity: 0.6, fontSize: 12 }}>or</div>
{/* existing email/password form */}


      <div style={{ margin: "16px 0", textAlign: "center", opacity: 0.7 }}>or</div>

      <form onSubmit={sendMagicLink}>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          type="email"
          required
          style={{ width: "100%", padding: 10 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 12, marginTop: 12 }}
        >
          Send sign-in link
        </button>
      </form>

      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}
      {msg && <p style={{ color: "green", marginTop: 12 }}>{msg}</p>}

      <p style={{ marginTop: 20, fontSize: 12, opacity: 0.75 }}>
        Redirect after login: <code>{redirectTo}</code>
      </p>
    </div>
  );
}
