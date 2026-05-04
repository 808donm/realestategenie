import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/prospecting/shortlist/export
 *
 * Streams an XLSX of the agent's full prospecting shortlist with skip
 * trace contact info, formatted for direct upload to GHL Power Dialer
 * (and most other CRM bulk imports — column names match the canonical
 * "First Name / Last Name / Phone / Email / Address / ..." pattern).
 *
 * One row per phone number. If a property has 3 phones, it produces 3
 * rows that all share the same name + address + property context, so
 * the dialer doesn't need a separate normalization step. Properties
 * with no phones still get one row (so the agent can manually call
 * the address or hand it to a different skip trace provider).
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: rows, error } = await supabase
      .from("prospecting_shortlist")
      .select("*")
      .eq("agent_id", user.id)
      .order("added_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Shortlist is empty" }, { status: 404 });
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Real Estate Genie";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Power Dialer");
    sheet.columns = [
      { header: "First Name", key: "firstName", width: 16 },
      { header: "Last Name", key: "lastName", width: 18 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Phone Type", key: "phoneType", width: 10 },
      { header: "Email", key: "email", width: 26 },
      { header: "Address", key: "address", width: 30 },
      { header: "City", key: "city", width: 15 },
      { header: "State", key: "state", width: 6 },
      { header: "Zip", key: "zip", width: 8 },
      { header: "Property Type", key: "propertyType", width: 14 },
      { header: "Est. Value", key: "estValue", width: 12 },
      { header: "Est. Equity", key: "estEquity", width: 12 },
      { header: "Years Owned", key: "yearsOwned", width: 11 },
      { header: "Lead Score", key: "leadScore", width: 10 },
      { header: "Source Mode", key: "sourceMode", width: 14 },
      { header: "Tag", key: "tag", width: 16 },
      { header: "Added", key: "addedAt", width: 12 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };

    const splitName = (full: string | null) => {
      if (!full) return { first: "", last: "" };
      if (full.includes(",")) {
        const [last, first] = full.split(",").map((s) => s.trim());
        return { first: first || "", last: last || "" };
      }
      const parts = full.trim().split(/\s+/);
      if (parts.length === 1) return { first: "", last: parts[0] };
      return { first: parts[0], last: parts.slice(1).join(" ") };
    };

    const tagByMode: Record<string, string> = {
      absentee: "Absentee Owner",
      equity: "High Equity",
      foreclosure: "Pre-Foreclosure",
      radius: "Just Sold Farming",
      investor: "Investor Portfolio",
    };

    for (const r of rows) {
      const { first, last } = splitName(r.owner_name);
      const phones: any[] = Array.isArray(r.skip_trace_phones) ? r.skip_trace_phones : [];
      const emails: any[] = Array.isArray(r.skip_trace_emails) ? r.skip_trace_emails : [];

      const baseRow = {
        firstName: first,
        lastName: last,
        address: r.address || "",
        city: r.city || "",
        state: r.state || "",
        zip: r.zip || "",
        propertyType: r.property_type || "",
        estValue: r.estimated_value ?? "",
        estEquity: r.estimated_equity ?? "",
        yearsOwned: r.years_owned ?? "",
        leadScore: r.lead_score ? String(r.lead_score).toUpperCase() : "",
        sourceMode: r.source_mode || "",
        tag: r.source_mode ? (tagByMode[r.source_mode] || "Prospect") : "Prospect",
        addedAt: r.added_at ? new Date(r.added_at).toLocaleDateString() : "",
      };

      if (phones.length === 0) {
        // No skip trace data yet — emit a single row with blank phone/email
        // so the address still makes it into the dialer.
        const row = sheet.addRow({
          ...baseRow,
          phone: "",
          phoneType: "",
          email: emails[0]?.address || "",
        });
        applyRowFormat(row, r.lead_score);
      } else {
        // One row per phone. The first row carries the email (if any);
        // additional rows leave email blank to avoid duplicate dialer
        // routing on the same email.
        phones.forEach((p, idx) => {
          const row = sheet.addRow({
            ...baseRow,
            phone: p.number || p.phone || "",
            phoneType: p.lineType || p.type || "",
            email: idx === 0 ? emails[0]?.address || "" : "",
          });
          applyRowFormat(row, r.lead_score);
        });
      }
    }

    // Currency formatting
    sheet.getColumn("estValue").numFmt = '"$"#,##0';
    sheet.getColumn("estEquity").numFmt = '"$"#,##0';

    // Freeze header
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="prospecting_shortlist_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("[Shortlist Export] Error:", error);
    return NextResponse.json({ error: error.message || "Export failed" }, { status: 500 });
  }
}

function applyRowFormat(row: any, leadScore: string | null) {
  const colors: Record<string, { bg: string; text: string }> = {
    hot: { bg: "FFFEF2F2", text: "FFDC2626" },
    warm: { bg: "FFFFF7ED", text: "FFEA580C" },
    cold: { bg: "FFF3F4F6", text: "FF6B7280" },
  };
  const sc = (leadScore && colors[leadScore]) || null;
  if (sc) {
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sc.bg } };
    row.getCell("leadScore").font = { bold: true, color: { argb: sc.text } };
  }
}
