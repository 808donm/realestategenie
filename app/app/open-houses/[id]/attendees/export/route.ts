import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await supabaseServer();

  const { data: leads, error } = await supabase
    .from("lead_submissions")
    .select("created_at,payload")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (leads ?? []).map((l) => {
    const p: any = l.payload ?? {};
    return {
      created_at: l.created_at,
      name: p.name ?? "",
      email: p.email ?? "",
      phone_e164: p.phone_e164 ?? "",
      representation: p.representation ?? "",
      timeline: p.timeline ?? "",
      financing: p.financing ?? "",
      neighborhoods: p.neighborhoods ?? "",
      must_haves: p.must_haves ?? "",
      consent_email: !!p?.consent?.email,
      consent_sms: !!p?.consent?.sms,
    };
  });

  const headerObj =
    rows[0] ??
    ({
      created_at: "",
      name: "",
      email: "",
      phone_e164: "",
      representation: "",
      timeline: "",
      financing: "",
      neighborhoods: "",
      must_haves: "",
      consent_email: "",
      consent_sms: "",
    } as const);

  const header = Object.keys(headerObj).join(",");

  const escape = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv =
    header +
    "\n" +
    rows.map((r) => Object.values(r).map(escape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="attendees-${id}.csv"`,
    },
  });
}
