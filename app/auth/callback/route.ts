import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirect = url.searchParams.get("redirect") || "/app/dashboard";

  // Create a response we can attach cookies to
  const res = NextResponse.redirect(new URL(redirect, url.origin));

  // Create Supabase server client using req/res cookie adapters
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    console.log("[OAuth Callback] Exchanging code for session...");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[OAuth Callback] Exchange failed:", error);
      const signInUrl = new URL("/signin", url.origin);
      signInUrl.searchParams.set("error", error.message);
      signInUrl.searchParams.set("redirect", redirect);
      return NextResponse.redirect(signInUrl);
    }

    if (data?.session) {
      console.log("[OAuth Callback] Session created successfully for user:", data.user?.email);
      console.log("[OAuth Callback] Session expires at:", data.session.expires_at);
      console.log("[OAuth Callback] Cookies being set:", res.cookies.getAll().map(c => c.name));
    }
  } else {
    // If no code, redirect to signin with error
    console.error("[OAuth Callback] No authorization code in callback");
    const signInUrl = new URL("/signin", url.origin);
    signInUrl.searchParams.set("error", "No authorization code received");
    return NextResponse.redirect(signInUrl);
  }

  console.log("[OAuth Callback] Redirecting to:", redirect);
  return res;
}
