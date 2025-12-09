import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirect = url.searchParams.get("redirect") || "/app/dashboard";

  const supabase = await supabaseServer();
  await supabase.auth.getUser();

  return NextResponse.redirect(new URL(redirect, url.origin));
}
