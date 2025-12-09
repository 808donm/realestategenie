import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") || "/app/dashboard";

  // This ensures any auth cookies are set for the session
  const supabase = supabaseServer();
  await supabase.auth.getUser();

  return NextResponse.redirect(new URL(redirect, url.origin));
}
