import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const AAL2_PATH_PREFIXES = ["/app/integrations", "/app/settings/security"];
const APP_PREFIX = "/app";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

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

  const pathname = req.nextUrl.pathname;

  // Only protect /app/*
  if (!pathname.startsWith(APP_PREFIX)) return res;

  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  // Not logged in → send to sign in
  if (userErr || !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // MFA enforcement for selected paths
  const requiresAAL2 = AAL2_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  if (requiresAAL2) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    // If next level is aal2 but current is aal1, user must pass MFA
    if (aalData?.nextLevel === "aal2" && aalData.currentLevel !== "aal2") {
      const url = req.nextUrl.clone();
      url.pathname = "/mfa";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

// Limit middleware to the paths we care about
export const config = {
  matcher: ["/app/:path*"],
};
