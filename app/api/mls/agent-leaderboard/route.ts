import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrestleClient } from "@/lib/mls/trestle-helpers";

/**
 * GET /api/mls/agent-leaderboard
 *
 * Queries MLS for all closed transactions on Oahu within a date range
 * and aggregates by agent to produce a market-wide leaderboard.
 *
 * Query params:
 *   months    -- lookback period in months (default 12, max 24)
 *   limit     -- top N agents (default 100, max 500)
 *   type      -- "listing" | "buyer" | "both" (default "both")
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = request.nextUrl.searchParams;
    const months = Math.min(Number(params.get("months") || "12"), 24);
    const limit = Math.min(Number(params.get("limit") || "100"), 1000);
    const type = params.get("type") || "both";

    // Get agent's Trestle client
    const trestle = await getTrestleClient(supabase, user.id);
    if (!trestle) {
      return NextResponse.json({ error: "MLS not connected. Connect your MLS in Settings > Integrations." }, { status: 503 });
    }

    // Date range
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const sinceStr = since.toISOString().split("T")[0];

    // Fetch all closed transactions on Oahu (paginated)
    const selectFields = [
      "ListingKey", "ClosePrice", "CloseDate", "PropertyType", "PropertySubType",
      "City", "PostalCode", "DaysOnMarket",
      "ListAgentFullName", "ListAgentKey", "ListAgentEmail", "ListAgentDirectPhone", "ListOfficeName",
      "BuyerAgentFullName", "BuyerAgentKey", "BuyerAgentEmail", "BuyerAgentDirectPhone", "BuyerOfficeName",
    ].join(",");

    const filter = `StandardStatus eq 'Closed' and CloseDate ge ${sinceStr} and StateOrProvince eq 'HI'`;

    const allListings: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await trestle.getProperties({
        $filter: filter,
        $select: selectFields,
        $orderby: "CloseDate desc",
        $top: 500,
        $skip: offset,
        $count: true,
      });

      allListings.push(...(result.value || []));
      const totalCount = result["@odata.count"] || 0;
      offset += 500;
      hasMore = offset < totalCount && offset < 10000; // Safety cap
    }

    console.log(`[AgentLeaderboard] Fetched ${allListings.length} closed transactions (${months} months)`);

    // Aggregate by agent
    const agentMap = new Map<string, {
      name: string;
      key: string;
      email: string;
      phone: string;
      office: string;
      listingSales: number;
      buyerSales: number;
      totalSales: number;
      listingVolume: number;
      buyerVolume: number;
      totalVolume: number;
      domTotal: number;
      domCount: number;
      propertyTypes: Record<string, number>;
      cities: Record<string, number>;
    }>();

    const processAgent = (name: string, key: string, email: string, phone: string, office: string, side: "listing" | "buyer", price: number, dom: number, propType: string, city: string) => {
      if (!name || name.trim() === "") return;
      const normalized = name.trim();
      const existing = agentMap.get(normalized) || {
        name: normalized, key: key || "", email: email || "", phone: phone || "",
        office: office || "",
        listingSales: 0, buyerSales: 0, totalSales: 0,
        listingVolume: 0, buyerVolume: 0, totalVolume: 0,
        domTotal: 0, domCount: 0,
        propertyTypes: {}, cities: {},
      };

      if (!existing.email && email) existing.email = email;
      if (!existing.phone && phone) existing.phone = phone;

      if (side === "listing") {
        existing.listingSales++;
        existing.listingVolume += price;
      } else {
        existing.buyerSales++;
        existing.buyerVolume += price;
      }
      existing.totalSales = existing.listingSales + existing.buyerSales;
      existing.totalVolume = existing.listingVolume + existing.buyerVolume;

      if (dom > 0 && side === "listing") {
        existing.domTotal += dom;
        existing.domCount++;
      }

      if (propType) existing.propertyTypes[propType] = (existing.propertyTypes[propType] || 0) + 1;
      if (city) existing.cities[city] = (existing.cities[city] || 0) + 1;
      if (!existing.office && office) existing.office = office;

      agentMap.set(normalized, existing);
    };

    for (const l of allListings) {
      const price = l.ClosePrice || 0;
      const dom = l.DaysOnMarket || 0;
      const propType = l.PropertySubType || l.PropertyType || "";
      const city = l.City || "";

      if (type === "listing" || type === "both") {
        processAgent(l.ListAgentFullName, l.ListAgentKey, l.ListAgentEmail || "", l.ListAgentDirectPhone || "", l.ListOfficeName, "listing", price, dom, propType, city);
      }
      if (type === "buyer" || type === "both") {
        processAgent(l.BuyerAgentFullName, l.BuyerAgentKey, l.BuyerAgentEmail || "", l.BuyerAgentDirectPhone || "", l.BuyerOfficeName, "buyer", price, dom, propType, city);
      }
    }

    // Sort by total sales, take top N
    const sorted = Array.from(agentMap.values())
      .sort((a, b) => b.totalSales - a.totalSales || b.totalVolume - a.totalVolume)
      .slice(0, limit)
      .map((a, i) => ({
        rank: i + 1,
        name: a.name,
        email: a.email,
        phone: a.phone,
        office: a.office,
        listingSales: a.listingSales,
        buyerSales: a.buyerSales,
        totalSales: a.totalSales,
        listingVolume: a.listingVolume,
        buyerVolume: a.buyerVolume,
        totalVolume: a.totalVolume,
        avgPrice: a.totalSales > 0 ? Math.round(a.totalVolume / a.totalSales) : 0,
        avgDOM: a.domCount > 0 ? Math.round(a.domTotal / a.domCount) : 0,
        topCity: Object.entries(a.cities).sort(([, a], [, b]) => b - a)[0]?.[0] || "",
        topPropertyType: Object.entries(a.propertyTypes).sort(([, a], [, b]) => b - a)[0]?.[0] || "",
      }));

    // Office leaderboard
    const officeMap = new Map<string, { name: string; sales: number; volume: number; agents: Set<string> }>();
    for (const agent of agentMap.values()) {
      if (!agent.office) continue;
      const existing = officeMap.get(agent.office) || { name: agent.office, sales: 0, volume: 0, agents: new Set() };
      existing.sales += agent.totalSales;
      existing.volume += agent.totalVolume;
      existing.agents.add(agent.name);
      officeMap.set(agent.office, existing);
    }

    const topOffices = Array.from(officeMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 25)
      .map((o, i) => ({
        rank: i + 1,
        name: o.name,
        sales: o.sales,
        volume: o.volume,
        agentCount: o.agents.size,
        avgPerAgent: o.agents.size > 0 ? Math.round(o.sales / o.agents.size) : 0,
      }));

    return NextResponse.json({
      agents: sorted,
      offices: topOffices,
      totalTransactions: allListings.length,
      dateRange: { from: sinceStr, to: new Date().toISOString().split("T")[0] },
      months,
    });
  } catch (error: any) {
    console.error("[AgentLeaderboard] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
