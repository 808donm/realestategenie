"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";

type Provider = "google" | "facebook" | "linkedin_oidc"; // if linkedin_oidc fails, use "linkedin"

function ProviderButton({
  provider,
  label,
  bg,
  color,
}: {
  provider: Provider;
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={async () => {
        const supabase = supabaseBrowser();
        await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
      }}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.12)",
        fontWeight: 800,
        cursor: "pointer",
        background: bg,
        color,
      }}
    >
      {label}
    </button>
  );
}

export default function OAuthButtons() {
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
      <ProviderButton provider="google" label="Continue with Google" bg="#ffffff" color="#111111" />
      <ProviderButton provider="facebook" label="Continue with Facebook" bg="#1877F2" color="#ffffff" />
      <ProviderButton provider="linkedin_oidc" label="Continue with LinkedIn" bg="#0A66C2" color="#ffffff" />
    </div>
  );
}
