"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignOutButton() {
  const supabase = supabaseBrowser();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/signin";
      }}
      style={{ padding: 10, marginTop: 16 }}
    >
      Sign out
    </button>
  );
}
