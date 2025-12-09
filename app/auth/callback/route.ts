import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code"); // Supabase OAuth code
  const redirect = url.searchParams.get("redirect") || "/app/dashboard";

  const supabase = await supabaseServer();

  // This is the critical step: swaps the code for a session + sets cookies
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // If exchange fails, go back to sign in (optionally add a message)
      const signInUrl = new URL("/signin", url.origin);
      signInUrl.searchParams.set("redirect", redirect);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.redirect(new URL(redirect, url.origin));
}
