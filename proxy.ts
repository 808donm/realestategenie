import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // set on request (so downstream server components see it)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // set on response (so browser stores it)
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // This is the key call: it refreshes tokens if needed and triggers setAll()
  await supabase.auth.getClaims();

  return response;
}

// Only run proxy on app pages (skip static assets)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
