import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/bird-dog/export
 * Export Bird Dog results as XLSX hot sheet
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

    // Get search name for the file
    const { data: search } = await supabase
      .from("bird_dog_searches")
      .select("name")
      .eq("id", searchId)
      .single();

    // Build CSV (XLSX requires a library -- use CSV for now, upgrade to XLSX later)
    const sortOrder = { hot: 0, warm: 1, cold: 2 };
    const sorted = results.sort(
      (a, b) => (sortOrder[a.lead_score as keyof typeof sortOrder] ?? 3) - (sortOrder[b.lead_score as keyof typeof sortOrder] ?? 3),
    );

    const headers = [
      "Score", "Address", "City", "State", "ZIP", "Property Type",
      "Owner", "Owner 2", "Mailing Address",
      "Est. Value", "Est. Equity", "Equity %", "Mortgage Balance",
      "Beds", "Baths", "SqFt", "Year Built",
      "Last Sale Date", "Last Sale Price", "Ownership (months)",
      "Absentee", "Out-of-State", "Score Reasons",
      "Phone 1", "Phone 2", "Phone 3", "Email 1",
    ];

    const rows = sorted.map((r) => {
      const contacts = r.bird_dog_contacts?.[0];
      const phones = contacts?.phones || [];
      const emails = contacts?.emails || [];
      return [
        r.lead_score?.toUpperCase(),
        r.address, r.city, r.state, r.zip, r.property_type,
        r.owner_name, r.owner_name_2, r.mailing_address,
        r.estimated_value, r.estimated_equity, r.equity_percent, r.mortgage_balance,
        r.beds, r.baths, r.sqft, r.year_built,
        r.last_sale_date, r.last_sale_price, r.ownership_length,
        r.absentee_owner ? "Yes" : "No", r.out_of_state_absentee ? "Yes" : "No",
        (r.lead_score_reasons || []).join("; "),
        phones[0]?.number || "", phones[1]?.number || "", phones[2]?.number || "",
        emails[0]?.address || "",
      ];
    });

    // Build CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          const val = cell == null ? "" : String(cell);
          return val.includes(",") || val.includes('"') || val.includes("\n")
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(","),
      ),
    ].join("\n");

    const fileName = `BirdDog_${(search?.name || "HotSheet").replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
