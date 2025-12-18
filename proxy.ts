import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Log authentication status for debugging
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/app") || pathname.startsWith("/auth")) {
    console.log(`[Proxy] ${pathname} - User authenticated:`, !!user, user?.email || "none");
    console.log(`[Proxy] Cookies:`, request.cookies.getAll().filter(c => c.name.startsWith("sb-")).map(c => c.name));
  }

  // Refresh session if user is authenticated
  if (user) {
    // This will refresh the session if needed
    await supabase.auth.getSession();
  }

  // Define public routes that don't require authentication
  const publicRoutes = [
    "/signin",
    "/signup",
    "/auth/callback",
    "/api",
    "/oh", // Public open house check-in pages
    "/accept-invite",
    "/privacy",
    "/terms",
    "/data-deletion",
    "/mfa",
  ];

  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Protect /app routes - redirect to signin if not authenticated
  if (request.nextUrl.pathname.startsWith("/app") && !isPublicRoute) {
    if (!user) {
      console.log(`[Proxy] Redirecting to signin - no user found for protected route:`, pathname);
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from signin/signup pages
  if (
    (request.nextUrl.pathname === "/signin" ||
      request.nextUrl.pathname === "/signup") &&
    user
  ) {
    const redirectPath = request.nextUrl.searchParams.get("redirect") || "/app/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = redirectPath;
    url.search = ""; // Clear search params
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
