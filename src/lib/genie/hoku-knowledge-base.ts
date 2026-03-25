/**
 * Hoku Knowledge Base
 *
 * Comprehensive knowledge about every feature in Real Estate Genie.
 * Injected into Hoku's system prompt so she can explain features,
 * guide agents through workflows, and provide context-aware help.
 */

// ── Page-specific context injected when agent is on that page ──

export const PAGE_CONTEXT: Record<string, string> = {
  // Dashboard
  dashboard: `The agent is on their DASHBOARD. This is the home page showing:
- Daily Briefing: AI-generated summary of what needs attention today (hot leads, follow-ups due, upcoming events, pipeline updates)
- Quick Actions: Cards for common tasks (click one to start a guided workflow with you)
- Recent Activity: Latest leads, notes, and pipeline changes
Help the agent understand their daily priorities and offer to take action on briefing items.`,

  // Leads
  leads: `The agent is on the LEADS page. This shows all their leads/contacts with:
- Heat Score (0-100): AI-calculated likelihood of conversion based on engagement, timeline, budget
- Pipeline Stage: New → Contacted → Showing → Offer → Closed (or Lost)
- Contact info, property interest, timeline, source
- Action buttons: Call, Text, Email, Follow-up
Help the agent prioritize which leads to contact and offer to draft communications.`,

  // MLS Listings
  "mls-listings": `The agent is on the MLS LISTINGS page. This shows active MLS listings from HiCentral MLS (via Trestle).
- Search by zip code, city, address, or building name (e.g. "Park Lane", "The Century")
- Each listing card shows price, beds/baths/sqft, DOM, photos, listing agent
- Click a listing to open the Property Detail Modal with all tabs
- Can search Active, Pending, or Closed listings
Help the agent find properties, explain listing details, or run comps.`,

  // Property Data / Prospecting
  "property-data": `The agent is on the PROPERTY DATA search page.
- Search any property by address to get full intelligence report
- Data comes from Realie (AVM, equity, liens), RentCast (owner info, tax, rental AVM), and MLS
- Results show in a Property Detail Modal with tabs: Overview, Building, Financial, Sales History, Comps, Ownership, Market Stats
- Can download full PDF report or generate shareable link
Help the agent understand property data and offer to run reports or calculators.`,

  // Prospecting
  prospecting: `The agent is on the PROSPECTING page. This has specialized search tools:
- **Absentee Owners**: Find owners who don't live at the property (investor/rental opportunities)
- **High Equity**: Find owners with significant equity (likely sellers)
- **Pre-Foreclosure**: Find properties in foreclosure process (motivated sellers)
- **Just Sold (Farming)**: Find recently sold properties to contact new homeowners
- **Investor Portfolios**: Find owners with multiple properties
Each search returns scored property cards. The agent can filter by zip, beds, baths, and years owned.
Help the agent choose the right search type and explain the results.`,

  // Seller Map
  "seller-map": `The agent is on the SELLER MAP. This is a map-based prospecting tool:
- Shows all Oahu zip codes as clickable regions
- Click a zip code to load scored prospects in that area
- Properties scored 0-100 based on: absentee status, equity, time owned, corporate ownership, lien count
- Higher scores = more likely to sell
- Can filter by property type, price range, equity threshold
The seller map uses RentCast for property data and Realie for equity/liens.
Help the agent understand the scoring and identify the best prospects.`,

  // DOM Prospecting
  "dom-prospecting": `The agent is on the DOM PROSPECTING page. This identifies stale listings:
- **Expired/Withdrawn** (green): Listing contract ended — fair game for outreach
- **Active over DOM threshold** (red/orange/charcoal): Still listed but sitting too long — MONITOR ONLY, do not solicit
- Properties are scored by how far they exceed the average DOM for their property type
- Agent can save searches and monitor individual properties for tier changes
IMPORTANT: It is unethical to contact sellers whose property is actively listed with another agent. Expired and withdrawn listings are OK to contact.`,

  // Farm & Watchdog
  "farm-watchdog": `The agent is on the FARM & WATCHDOG page.
**Farm Areas**: Geographic areas the agent "farms" — monitors for new listings, price changes, and sales
- Create a farm by drawing on the map or entering zip codes
- Get alerts when new listings appear in the farm area
**Watchdog Rules**: Automated alerts for specific conditions
- Price reductions, new listings matching criteria, status changes
- Runs automatically and notifies the agent
Help the agent set up effective farms and watchdog rules.`,

  // Open Houses
  "open-houses": `The agent is on the OPEN HOUSES page. This manages open house events:
- Create open houses from MLS listings (auto-fills property details, photos)
- Each open house has a QR code flyer — the agent prints it and displays at the property
- Visitors scan the QR code to register → automatically captured as leads with heat score
- Open houses can be Draft (editing) or Published (live with QR code)
- The detail page shows registrations, visitor count, and lead conversion
**Printing the flyer**: The agent MUST print the flyer and display it at the property entrance so visitors can scan to register.
Help the agent create open houses, understand the QR flow, and manage registrations.`,

  // Calculators
  calculators: `The agent is on the CALCULATORS page. Available calculators:
- **Mortgage Calculator**: Monthly payment (P&I + tax + HOA), amortization schedule
- **Affordability Calculator**: How much home a buyer can afford based on income/debt
- **Rent vs Buy**: Compare renting vs buying over time
- **Investment Calculator**: Cap rate, cash-on-cash return, ROI
- **Net Proceeds**: Seller's estimated net after commissions and costs
- **Refinance Calculator**: Compare current vs new loan terms
All calculators can be exported to Excel and emailed to clients.
Help the agent choose the right calculator and offer to send results to a contact.`,

  // Reports
  reports: `The agent is on the REPORTS page. Available reports:
- Market Statistics (Hawaii counties + York/Adams PA)
- Agent Leaderboard, Retention Risk, Pipeline Velocity
- Company Dollar, Listing Inventory, Lead Source ROI
- Compliance Audit, Monthly Statistics
- API Usage & Cost Tracking (admin only)
Help the agent find the right report for their needs.`,

  // Admin
  admin: `The agent is on the ADMIN section.
- User management, invitations, role assignments
- Integration connections (GHL, Trestle MLS, Realie, RentCast)
- System settings and configuration
Help the agent with admin tasks and explain integration setup.`,

  // Integrations
  integrations: `The agent is on the INTEGRATIONS page.
Available integrations:
- **GoHighLevel (GHL)**: CRM, email/SMS, lead management, document signing
- **Trestle (HiCentral MLS)**: MLS listings, property data, agent info
- **Realie**: AVM with confidence range, equity, liens, parcel data
- **RentCast**: Property records, rental AVM, market stats, comps
- **Google/Microsoft Calendar**: Appointment sync
Each integration has a Test Connection button. Status shows Connected/Disconnected.
Help the agent connect their integrations.`,
};

// ── General app knowledge (always included) ──

export const APP_KNOWLEDGE = `
## Real Estate Genie — Platform Knowledge

### Data Sources (priority order)
1. **MLS (Trestle/HiCentral)** — Active listings, closed sales with actual prices, agent info, photos, DOM. Most accurate for Hawaii.
2. **Realie** — AVM with confidence range (modelValue/min/max), equity, LTV, liens, parcel geometry, deed transfers. Best for property valuation.
3. **RentCast** — Property records, owner info, absentee status, rental AVM, market stats, comps fallback. Best for owner intelligence.

### Hawaii-Specific Knowledge
- Hawaii is a **non-disclosure state** — actual sale prices are NOT in public records. Only MLS has closed prices.
- **Leasehold vs Fee Simple** is critical in Hawaii — always mention if a property is leasehold. Leasehold means the land is leased (common in condos).
- **TMK (Tax Map Key)** is Hawaii's parcel ID format: Island-Zone-Section-Plat-Parcel (e.g., 1-4-2-018-077)
- Common hazards: Tsunami evacuation zones, sea level rise, lava flow zones (Big Island), cesspool priority areas, Special Management Areas (coastal)
- Oahu zip codes: 96701-96898 (many 968xx are PO Box/admin zips)

### Lead Scoring (Heat Score 0-100)
- Based on: engagement frequency, response speed, timeline urgency, budget match, property interest specificity
- 80-100: Hot lead — ready to act, needs immediate attention
- 60-79: Warm lead — interested, needs nurturing
- 40-59: Cool lead — exploring, needs education
- 0-39: Cold lead — minimal engagement

### Prospecting Scoring (Seller Score 0-100)
Properties scored by likelihood of owner wanting to sell:
- Absentee owner (+20 points)
- High equity / no mortgage (+15 points)
- Long-term ownership 20+ years (+15 points)
- Corporate/trust ownership (+10 points)
- Out-of-state mailing address (+10 points)
- Multiple liens (+10 points)
- Property tax delinquency (+10 points)

### DOM Prospecting Ethics
- **Expired/Withdrawn listings**: OK to contact — seller is unrepresented
- **Active listings over DOM threshold**: MONITOR ONLY — it is unethical (and often illegal) to solicit sellers whose property is actively listed with another agent
- Tiers: Red (2x+ avg DOM), Orange (1.5x), Charcoal (1.15x)

### Open House QR Flow
1. Agent creates open house (from MLS or manually)
2. System generates QR code flyer automatically
3. Agent prints flyer and displays at the property entrance
4. Visitors scan QR → registration form → captured as lead
5. Lead gets heat score, enters pipeline, agent gets notification

### Mortgage Calculator Defaults
- Down payment: 20%
- Interest rate: 6.75% (30-year fixed)
- Includes: principal & interest + property tax + HOA
- Can export to Excel and email to client

### Shareable Property Links
- Agent clicks "Get Shareable Link" on any property
- Generates a public URL at realestategenie.app/shared/report/[id]
- Shows: property overview, photos, tax assessment, hazards, mortgage calculator
- Does NOT show: ownership info (privacy), internal scoring
- Link expires after 30 days
`;

// ── Build the full context for a given page ──

export function buildPageContext(pathname: string): string {
  // Match page path to context key
  const segments = pathname.replace(/^\/app\//, "").split("/");
  const page = segments[0] || "dashboard";

  // Check for specific sub-pages
  if (page === "seller-map" && segments[1] === "dom-prospecting") {
    return PAGE_CONTEXT["dom-prospecting"] || "";
  }
  if (page === "open-houses") return PAGE_CONTEXT["open-houses"] || "";
  if (page === "mls-listings" || page === "mls") return PAGE_CONTEXT["mls-listings"] || "";
  if (page === "property-data") return PAGE_CONTEXT["property-data"] || "";
  if (page === "seller-map") return PAGE_CONTEXT["seller-map"] || "";
  if (page === "farm-watchdog" || page === "farm") return PAGE_CONTEXT["farm-watchdog"] || "";

  return PAGE_CONTEXT[page] || "";
}

// ── Property explanation helper ──

export function buildPropertyContext(property: any): string {
  if (!property) return "";

  const parts: string[] = ["The agent is currently viewing a PROPERTY DETAIL MODAL. Here is everything you know about this property:"];

  // Basic info
  const addr = property.address?.oneLine || property.address || property.UnparsedAddress;
  if (addr) parts.push(`Address: ${addr}`);

  const city = property.city || property.address?.locality;
  const state = property.state || property.address?.countrySubd;
  const zip = property.zip || property.address?.postal1;
  if (city || zip) parts.push(`Location: ${[city, state, zip].filter(Boolean).join(", ")}`);

  // Pricing
  const listPrice = property.listPrice || property.ListPrice;
  const avmValue = property.avmValue || property.avm?.amount?.value;
  const avmLow = property.avmLow || property.avm?.amount?.low;
  const avmHigh = property.avmHigh || property.avm?.amount?.high;
  if (listPrice) parts.push(`List Price: $${Number(listPrice).toLocaleString()}`);
  if (avmValue) parts.push(`AVM (Estimated Value): $${Number(avmValue).toLocaleString()}`);
  if (avmLow && avmHigh) parts.push(`AVM Range: $${Number(avmLow).toLocaleString()} - $${Number(avmHigh).toLocaleString()}`);

  // Physical
  const beds = property.beds || property.building?.rooms?.beds || property.BedroomsTotal;
  const baths = property.baths || property.building?.rooms?.bathsFull || property.BathroomsTotalInteger;
  const sqft = property.sqft || property.building?.size?.livingSize || property.LivingArea;
  if (beds || baths || sqft) parts.push(`Size: ${beds || "?"}bd / ${baths || "?"}ba / ${sqft ? sqft.toLocaleString() + " sqft" : "?"}`);

  const yearBuilt = property.yearBuilt || property.building?.summary?.yearBuilt || property.YearBuilt;
  if (yearBuilt) parts.push(`Year Built: ${yearBuilt} (${new Date().getFullYear() - yearBuilt} years old)`);

  const propType = property.propertyType || property.summary?.propertyType;
  if (propType) parts.push(`Property Type: ${propType}`);

  const lotSize = property.lotSize || property.lot?.lotSize1;
  if (lotSize) parts.push(`Lot Size: ${Number(lotSize).toLocaleString()} sqft`);

  // Financial
  const lastSalePrice = property.lastSalePrice || property.sale?.amount?.saleAmt;
  const lastSaleDate = property.lastSaleDate || property.sale?.amount?.saleTransDate;
  if (lastSalePrice) parts.push(`Last Sale: $${Number(lastSalePrice).toLocaleString()}${lastSaleDate ? ` on ${lastSaleDate}` : ""}`);

  const equity = property.estimatedEquity || property.homeEquity?.equity;
  if (equity != null) parts.push(`Estimated Equity: $${Number(equity).toLocaleString()}`);

  const ltv = property.ltv || property.homeEquity?.ltv;
  if (ltv != null) parts.push(`Loan-to-Value: ${Number(ltv).toFixed(1)}%`);

  const taxAmt = property.taxAmount || property.assessment?.tax?.taxAmt;
  if (taxAmt) parts.push(`Annual Tax: $${Number(taxAmt).toLocaleString()}`);

  const hoaFee = property.hoaFee || property.hoa?.fee;
  if (hoaFee) parts.push(`HOA: $${Number(hoaFee).toLocaleString()}/month`);

  // Ownership
  const owner = property.owner1 || property.owner?.owner1?.fullName;
  if (owner) parts.push(`Owner: ${owner}`);

  const owner2 = property.owner2 || property.owner?.owner2?.fullName;
  if (owner2) parts.push(`Co-Owner: ${owner2}`);

  const absentee = property.absenteeOwner || property.owner?.absenteeOwnerStatus;
  if (absentee === "A" || absentee === "Yes") parts.push("Absentee Owner: YES - owner does not live at the property");

  const occupied = property.ownerOccupied || property.owner?.ownerOccupied;
  if (occupied === "N" || occupied === "No") parts.push("Owner Occupied: No");

  const corporate = property.corporateOwner || property.owner?.corporateIndicator;
  if (corporate === "Y" || corporate === "Yes") parts.push("Corporate/Trust Owner: YES");

  const mailing = property.mailingAddress || property.owner?.mailingAddressOneLine;
  if (mailing) parts.push(`Mailing Address: ${mailing}`);

  // MLS Listing info
  const dom = property.daysOnMarket || property.DaysOnMarket;
  if (dom != null) parts.push(`Days on Market: ${dom}`);

  const status = property.listingStatus || property.StandardStatus;
  if (status) parts.push(`Listing Status: ${status}`);

  const mlsNum = property.mlsNumber || property.ListingId;
  if (mlsNum) parts.push(`MLS #: ${mlsNum}`);

  const agent = property.listingAgent || property.ListAgentFullName;
  if (agent) parts.push(`Listing Agent: ${agent}`);

  const office = property.listingOffice || property.ListOfficeName;
  if (office) parts.push(`Office: ${office}`);

  const tenure = property.ownershipType || property.OwnershipType;
  if (tenure) parts.push(`Land Tenure: ${tenure}${String(tenure).toLowerCase().includes("lease") ? " WARNING: LEASEHOLD - the land is not owned, only leased. Monthly lease rent may apply." : ""}`);

  // Description excerpt
  const desc = property.description || property.PublicRemarks;
  if (desc) parts.push(`Description: ${String(desc).substring(0, 200)}...`);

  // Rental / Investment
  const rentalEst = property.rentalEstimate;
  if (rentalEst) parts.push(`\nRental Estimate: $${Number(rentalEst).toLocaleString()}/month`);
  const rentalLow = property.rentalLow;
  const rentalHigh = property.rentalHigh;
  if (rentalLow && rentalHigh) parts.push(`Rental Range: $${Number(rentalLow).toLocaleString()} - $${Number(rentalHigh).toLocaleString()}/month`);
  if (property.grossYield) parts.push(`Gross Yield: ${property.grossYield}`);
  if (property.capRate) parts.push(`Cap Rate: ${property.capRate}`);

  // Loan details
  if (property.loanBalance) parts.push(`Est. Loan Balance: $${Number(property.loanBalance).toLocaleString()}`);
  if (property.loanCount) parts.push(`Active Loans: ${property.loanCount}`);
  if (property.monthlyPayment) parts.push(`Est. Monthly Mortgage: $${Number(property.monthlyPayment).toLocaleString()}`);

  // Tax assessment detail
  if (property.assessedTotal) parts.push(`Assessed Value: $${Number(property.assessedTotal).toLocaleString()}`);
  if (property.assessedLand) parts.push(`Land Value: $${Number(property.assessedLand).toLocaleString()}`);
  if (property.marketValue) parts.push(`Market Value (County): $${Number(property.marketValue).toLocaleString()}`);

  // Building details
  if (property.constructionType) parts.push(`Construction: ${property.constructionType}`);
  if (property.roofType) parts.push(`Roof: ${property.roofType}`);
  if (property.heatingType) parts.push(`Heating: ${property.heatingType}`);
  if (property.coolingType) parts.push(`Cooling: ${property.coolingType}`);
  if (property.parking) parts.push(`Parking: ${property.parking}`);
  if (property.pool) parts.push(`Pool: ${property.pool}`);
  if (property.stories) parts.push(`Stories: ${property.stories}`);

  // Sale history
  if (property.saleHistory?.length) {
    parts.push(`\nSale History (${property.saleHistory.length} transactions):`);
    property.saleHistory.forEach((s: any) => {
      parts.push(`  ${s.date || "?"}: ${s.amount ? "$" + Number(s.amount).toLocaleString() : "Price not disclosed"} (${s.source || "?"})`);
    });
  }

  // Comparable sales
  if (property.comparableSales?.length) {
    parts.push(`\nComparable Sales (${property.comparableSales.length} comps):`);
    property.comparableSales.forEach((c: any) => {
      parts.push(`  ${c.address || "?"}: ${c.price ? "$" + Number(c.price).toLocaleString() : "?"} | ${c.beds || "?"}bd/${c.baths || "?"}ba | ${c.sqft ? c.sqft.toLocaleString() + " sqft" : "?"} | Match: ${c.correlation ? Math.round(c.correlation <= 1 ? c.correlation * 100 : c.correlation) + "%" : "?"}`);
    });
  }

  // Hazards
  if (property.hazards?.length) {
    parts.push(`\nEnvironmental Hazards: ${property.hazards.join(", ")}`);
  }

  // Market stats
  if (property.marketStats) {
    const ms = property.marketStats;
    parts.push(`\nArea Market Statistics:`);
    if (ms.medianPrice) parts.push(`  Median Sale Price: $${Number(ms.medianPrice).toLocaleString()}`);
    if (ms.avgDOM) parts.push(`  Avg Days on Market: ${ms.avgDOM}`);
    if (ms.totalListings) parts.push(`  Active Listings: ${ms.totalListings}`);
    if (ms.pricePerSqft) parts.push(`  Avg Price/Sqft: $${ms.pricePerSqft}`);
    if (ms.medianRent) parts.push(`  Median Rent: $${Number(ms.medianRent).toLocaleString()}/mo`);
  }

  // Neighborhood
  if (property.neighborhood) {
    const n = property.neighborhood;
    parts.push(`\nNeighborhood:`);
    if (n.medianIncome) parts.push(`  Median Income: $${Number(n.medianIncome).toLocaleString()}`);
    if (n.medianAge) parts.push(`  Median Age: ${n.medianAge}`);
    if (n.ownerOccupiedPct) parts.push(`  Owner-Occupied: ${n.ownerOccupiedPct}%`);
    if (n.walkScore) parts.push(`  Walk Score: ${n.walkScore}`);
  }

  // Seller score (from seller map)
  const sellerScore = property.sellerScore;
  const sellerLevel = property.sellerLevel;
  if (sellerScore != null) {
    parts.push(`\nSELLER MOTIVATION SCORE: ${sellerScore}/100 (${sellerLevel})`);
    if (property.sellerFactors?.length) {
      parts.push("Score breakdown:");
      property.sellerFactors.forEach((f: string) => parts.push(`  ${f}`));
    }
  }

  // Current tab
  const tab = property.activeTab;
  if (tab) parts.push(`\nThe agent is currently viewing the "${tab}" tab.`);

  // Page context
  const pageCtx = property.pageContext;

  // Instructions for Hoku
  parts.push(`
INSTRUCTIONS: You are looking at the same property the agent is. When they ask questions:
- If they say "explain this" or "what am I looking at" or "tell me about this property" - describe the property and its key characteristics in plain language. Start with the address, type, size, then move to value, owner, and any notable factors.
- If they ask about value - explain the AVM, how it compares to list price, and what the confidence range means
- If they ask about the owner - explain what you know and whether this looks like a good prospecting target
- If they ask about a specific tab (financial, comps, sales history, etc.) - explain what that section shows
- If they ask "is this a good deal?" - compare list price to AVM, look at equity, DOM, and comparable sales
- Suggest relevant actions: "Want me to run a mortgage calculator?", "Should I pull comps?", "Want to generate a PDF report?"
- If it's leasehold, ALWAYS mention that - it's critical in Hawaii
- Be specific to THIS property. Use the actual numbers, don't be generic.
${sellerScore != null ? `- This is a SELLER MAP prospect. Explain the seller motivation score and why this owner might be ready to sell based on the score factors. A score of 70+ is a strong prospect.${property.absenteeOwner === "A" ? " This is an ABSENTEE OWNER — they don't live at the property, which is a strong seller signal." : ""}` : ""}
${pageCtx === "seller-map" ? "- The agent is on the SELLER MAP. Focus on prospecting insights — who is likely to sell and why. Suggest outreach strategies." : ""}`);

  return parts.join("\n");
}
