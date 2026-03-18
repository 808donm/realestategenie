import { NextResponse } from "next/server";
import { stopImpersonation } from "@/lib/auth/impersonation";

export async function POST() {
  await stopImpersonation();
  return NextResponse.json({ success: true });
}
