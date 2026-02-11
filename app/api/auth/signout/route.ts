import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Sign Out API
 * Signs out the current user and redirects to login
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();

  // Sign out the user
  await supabase.auth.signOut();

  // Redirect to tenant login (or could check user role to redirect appropriately)
  return NextResponse.redirect(new URL("/tenant/login", request.url));
}

export async function GET(request: NextRequest) {
  // Support GET for simple link-based logout
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/tenant/login", request.url));
}
