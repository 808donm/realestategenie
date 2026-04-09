import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/bird-dog/export
 * Export Bird Dog results as XLSX hot sheet with color-coded lead scores
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchId, scoreFilter } = await request.json();
    if (!searchId) return NextResponse.json({ error: "searchId is required" }, { status: 400 });

    // Fetch results with skip trace contacts
    let query = supabase
      .from("bird_dog_results")
      .select("*, bird_dog_contacts(phones, emails)")
      .eq("search_id", searchId)
      .eq("agent_id", user.id)
      .order("lead_score", { ascending: true })
      .order("estimated_equity", { ascending: false, nullsFirst: false });

    if (scoreFilter && scoreFilter !== "all") {
      query = query.eq("lead_score", scoreFilter);
    }

    const { data: results, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!results || results.length === 0) {
      return NextResponse.json({ error: "No results to export" }, { status: 404 });
    }

    const { data: search } = await supabase
      .from("bird_dog_searches")
      .select("name")
      .eq("id", searchId)
      .single();

    // Sort: hot first, then warm, then cold
    const sortOrder = { hot: 0, warm: 1, cold: 2 };
    const sorted = results.sort(
      (a, b) => (sortOrder[a.lead_score as keyof typeof sortOrder] ?? 3) - (sortOrder[b.lead_score as keyof typeof sortOrder] ?? 3),
    );

    // Build XLSX with exceljs
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Real Estate Genie";
    workbook.created = new Date();

    // ── Summary Sheet ──
    const summarySheet = workbook.addWorksheet("Summary");
    const hotCount = sorted.filter((r) => r.lead_score === "hot").length;
    const warmCount = sorted.filter((r) => r.lead_score === "warm").length;
    const coldCount = sorted.filter((r) => r.lead_score === "cold").length;

    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 25 },
      { header: "Value", key: "value", width: 20 },
    ];
    summarySheet.addRow({ metric: "Search Name", value: search?.name || "Bird Dog Search" });
    summarySheet.addRow({ metric: "Export Date", value: new Date().toLocaleDateString() });
    summarySheet.addRow({ metric: "Total Results", value: sorted.length });
    summarySheet.addRow({ metric: "HOT Leads", value: hotCount });
    summarySheet.addRow({ metric: "WARM Leads", value: warmCount });
    summarySheet.addRow({ metric: "NURTURE Leads", value: coldCount });

    // Style summary header
    summarySheet.getRow(1).font = { bold: true, size: 12 };
    summarySheet.getRow(4).getCell(2).font = { bold: true, color: { argb: "FFDC2626" } };
    summarySheet.getRow(5).getCell(2).font = { bold: true, color: { argb: "FFEA580C" } };

    // ── Hot Sheet ──
    const hotSheet = workbook.addWorksheet("Hot Sheet");
    hotSheet.columns = [
      { header: "Score", key: "score", width: 10 },
      { header: "Address", key: "address", width: 30 },
      { header: "City", key: "city", width: 15 },
      { header: "State", key: "state", width: 6 },
      { header: "ZIP", key: "zip", width: 8 },
      { header: "Type", key: "type", width: 15 },
      { header: "Owner", key: "owner", width: 25 },
      { header: "Owner 2", key: "owner2", width: 20 },
      { header: "Mailing Address", key: "mailing", width: 30 },
      { header: "Est. Value", key: "value", width: 14 },
      { header: "Est. Equity", key: "equity", width: 14 },
      { header: "Equity %", key: "equityPct", width: 10 },
      { header: "Mortgage Bal", key: "mortgage", width: 14 },
      { header: "Beds", key: "beds", width: 6 },
      { header: "Baths", key: "baths", width: 6 },
      { header: "SqFt", key: "sqft", width: 8 },
      { header: "Year Built", key: "yearBuilt", width: 10 },
      { header: "Last Sale Date", key: "saleDate", width: 14 },
      { header: "Last Sale Price", key: "salePrice", width: 14 },
      { header: "Ownership (mo)", key: "ownership", width: 14 },
      { header: "Absentee", key: "absentee", width: 9 },
      { header: "Out-of-State", key: "outOfState", width: 12 },
      { header: "Score Reasons", key: "reasons", width: 40 },
    ];

    // Style header row
    hotSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    hotSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };

    // Add data rows with color coding
    sorted.forEach((r, i) => {
      const row = hotSheet.addRow({
        score: r.lead_score.toUpperCase(),
        address: r.address,
        city: r.city,
        state: r.state,
        zip: r.zip,
        type: r.property_type,
        owner: r.owner_name,
        owner2: r.owner_name_2,
        mailing: r.mailing_address,
        value: r.estimated_value,
        equity: r.estimated_equity,
        equityPct: r.equity_percent,
        mortgage: r.mortgage_balance,
        beds: r.beds,
        baths: r.baths,
        sqft: r.sqft,
        yearBuilt: r.year_built,
        saleDate: r.last_sale_date,
        salePrice: r.last_sale_price,
        ownership: r.ownership_length,
        absentee: r.absentee_owner ? "Yes" : "No",
        outOfState: r.out_of_state_absentee ? "Yes" : "No",
        reasons: (r.lead_score_reasons || []).join("; "),
      });

      // Color-code rows by score
      const colors = {
        hot: { bg: "FFFEF2F2", text: "FFDC2626" },
        warm: { bg: "FFFFF7ED", text: "FFEA580C" },
        cold: { bg: "FFF3F4F6", text: "FF6B7280" },
      };
      const sc = colors[r.lead_score as keyof typeof colors] || colors.cold;
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sc.bg } };
      row.getCell(1).font = { bold: true, color: { argb: sc.text } };

      // Format currency columns
      [10, 11, 13, 19].forEach((col) => {
        const cell = row.getCell(col);
        if (cell.value && typeof cell.value === "number") {
          cell.numFmt = "$#,##0";
        }
      });
    });

    // ── Contacts Sheet (if any skip traced) ──
    const hasContacts = sorted.some((r) => r.bird_dog_contacts && r.bird_dog_contacts.length > 0);
    if (hasContacts) {
      const contactSheet = workbook.addWorksheet("Contacts");
      contactSheet.columns = [
        { header: "Address", key: "address", width: 30 },
        { header: "Owner", key: "owner", width: 25 },
        { header: "Score", key: "score", width: 10 },
        { header: "Phone 1", key: "phone1", width: 16 },
        { header: "Phone 1 Type", key: "phone1Type", width: 12 },
        { header: "Phone 2", key: "phone2", width: 16 },
        { header: "Phone 3", key: "phone3", width: 16 },
        { header: "Email 1", key: "email1", width: 25 },
        { header: "Email 2", key: "email2", width: 25 },
      ];

      contactSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      contactSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };

      sorted.forEach((r) => {
        const contacts = r.bird_dog_contacts?.[0];
        if (!contacts) return;
        const phones = contacts.phones || [];
        const emails = contacts.emails || [];
        contactSheet.addRow({
          address: r.address,
          owner: r.owner_name,
          score: r.lead_score.toUpperCase(),
          phone1: phones[0]?.number || "",
          phone1Type: phones[0]?.type || "",
          phone2: phones[1]?.number || "",
          phone3: phones[2]?.number || "",
          email1: emails[0]?.address || "",
          email2: emails[1]?.address || "",
        });
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `BirdDog_${(search?.name || "HotSheet").replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("[BirdDog] Export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
