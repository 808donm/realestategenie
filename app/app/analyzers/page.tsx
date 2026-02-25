import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CalculatorGrid, { CalculatorCard } from "./calculator-grid.client";

export default async function AnalyzersPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  // Get counts for summary
  const [
    { count: propertyCount },
    { count: exchangeCount },
    { count: comparisonCount },
    { count: brrrCount },
    { count: flipCount },
  ] = await Promise.all([
    supabase
      .from("investment_properties")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("exchange_1031")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("property_comparisons")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("brrr_analyses")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("flip_analyses")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  // Default order: most-used agent calculators first, investment calculators last
  const cards: CalculatorCard[] = [
    {
      id: "mortgage",
      href: "/app/analyzers/mortgage",
      emoji: "🏦",
      title: "Mortgage Calculator",
      description:
        "Calculate monthly payments with P&I, taxes, insurance, HOA, and PMI. Includes amortization schedule and loan comparison.",
      footerText: "PITI breakdown • Excel export",
      background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
    },
    {
      id: "cash-to-close",
      href: "/app/analyzers/cash-to-close",
      emoji: "🔑",
      title: "Buyer Cash-to-Close",
      description:
        "Estimate total cash needed at closing including down payment, closing costs, prepaids, escrows, and credits.",
      footerText: "Range estimates • PDF export",
      background: "linear-gradient(135deg, #ede9fe 0%, #ffffff 100%)",
    },
    {
      id: "commission-split",
      href: "/app/analyzers/commission-split",
      emoji: "🤝",
      title: "Commission Split Calculator",
      description:
        "Calculate agent net and brokerage gross after splits, caps, transaction fees, and team overrides.",
      footerText: "Cap tracking • Split presets",
      background: "linear-gradient(135deg, #dbeafe 0%, #ffffff 100%)",
    },
    {
      id: "net-sheet",
      href: "/app/analyzers/net-sheet",
      emoji: "💰",
      title: "Seller Net Sheet",
      description:
        "Estimate seller proceeds after commissions, closing costs, mortgage payoff, and concessions. PDF and Excel export.",
      footerText: "Proceeds estimate • Itemized costs",
      background: "linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)",
    },
    {
      id: "compare",
      href: "/app/analyzers/compare",
      emoji: "⚖️",
      title: "Compare Properties",
      description:
        "Compare multiple investment properties side by side to find the best deal based on multiple metrics.",
      footerCount: comparisonCount || 0,
      footerCountLabel: "saved comparisons",
      footerText: "",
    },
    {
      id: "rental",
      href: "/app/analyzers/rental",
      emoji: "🏠",
      title: "Rental Property Calculator",
      description:
        "Quick rental analysis with NOI, cap rate, cash-on-cash return, DSCR, and monthly cash flow breakdown.",
      footerText: "DSCR • Cash flow • GRM",
      background: "linear-gradient(135deg, #d1fae5 0%, #ffffff 100%)",
    },
    {
      id: "quick-flip",
      href: "/app/analyzers/quick-flip",
      emoji: "⚡",
      title: "Quick Flip Analyzer",
      description:
        "Fast flip deal analysis with profit, ROI, 70% rule MAO, and deal scoring. All costs in one view.",
      footerText: "Deal score • 70% rule check",
      background: "linear-gradient(135deg, #ffedd5 0%, #ffffff 100%)",
    },
    {
      id: "wholesale-mao",
      href: "/app/analyzers/wholesale-mao",
      emoji: "📋",
      title: "Wholesale MAO Calculator",
      description:
        "Calculate maximum allowable offer and suggested offer range for wholesale deals with investor margin analysis.",
      footerText: "Offer range • Investor ROI",
      background: "linear-gradient(135deg, #fef9c3 0%, #ffffff 100%)",
    },
    {
      id: "flip",
      href: "/app/analyzers/flip",
      emoji: "🔨",
      title: "House Flip Analyzer",
      description:
        "Fix and flip calculator with 70% rule, ROI projections, and rehab cost estimator. Includes financing options.",
      footerCount: flipCount || 0,
      footerCountLabel: "saved analyses",
      footerText: "",
      background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)",
    },
    {
      id: "brrr",
      href: "/app/analyzers/brrr",
      emoji: "🏗️",
      title: "BRRR Strategy Analyzer",
      description:
        "Buy, Renovate, Refinance, Rent. Analyze deals for infinite returns and cash-out refinancing. Supports multi-family properties.",
      footerCount: brrrCount || 0,
      footerCountLabel: "saved analyses",
      footerText: "",
      background: "linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)",
    },
    {
      id: "1031",
      href: "/app/analyzers/1031",
      emoji: "🔄",
      title: "1031 Exchange Analyzer",
      description:
        "Track exchange timelines, calculate tax savings, and compare replacement properties for 1031 exchanges.",
      footerCount: exchangeCount || 0,
      footerCountLabel: "exchanges",
      footerText: "",
    },
    {
      id: "investment",
      href: "/app/analyzers/investment",
      emoji: "📊",
      title: "Investment Property Analyzer",
      description:
        "Calculate ROI, Cap Rate, IRR, and Cash-on-Cash returns for rental and investment properties.",
      footerCount: propertyCount || 0,
      footerCountLabel: "saved properties",
      footerText: "",
    },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          marginTop: 0,
          marginBottom: 8,
        }}
      >
        Calculators
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Real Estate Calculators — drag cards to reorder
      </p>

      <CalculatorGrid cards={cards} />

      {/* Feature Overview */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
          Key Metrics Calculated
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          <FeatureItem
            title="PITI (Mortgage)"
            description="Principal, Interest, Taxes, Insurance plus HOA and PMI. Full monthly payment breakdown."
          />
          <FeatureItem
            title="Cash-to-Close"
            description="Total cash a buyer needs at closing: down payment, closing costs, prepaids, and escrows minus credits."
          />
          <FeatureItem
            title="Commission Split"
            description="Agent net after brokerage split, cap, transaction fees, and team overrides. Tracks progress toward annual cap."
          />
          <FeatureItem
            title="Seller Net Proceeds"
            description="Sale price minus all deductions: mortgage payoff, commissions, closing costs, and concessions."
          />
          <FeatureItem
            title="Cap Rate"
            description="Net Operating Income divided by purchase price. Measures property profitability regardless of financing."
          />
          <FeatureItem
            title="Cash-on-Cash Return"
            description="Annual pre-tax cash flow divided by total cash invested. Shows actual return on your cash."
          />
          <FeatureItem
            title="DSCR (Rentals)"
            description="Debt Service Coverage Ratio: NOI divided by annual debt service. Lenders typically require 1.25+."
          />
          <FeatureItem
            title="70% Rule (Flips)"
            description="Max purchase = 70% of ARV minus repairs. Classic rule for profitable flip deals."
          />
          <FeatureItem
            title="Wholesale MAO"
            description="Maximum allowable offer for wholesale deals factoring investor margin, repairs, and assignment fee."
          />
          <FeatureItem
            title="IRR (Internal Rate of Return)"
            description="The discount rate that makes NPV of all cash flows equal zero. Best measure of overall return."
          />
          <FeatureItem
            title="Infinite Returns (BRRR)"
            description="When cash-out refinance recovers all invested capital, leaving zero cash in the deal."
          />
          <FeatureItem
            title="1031 Tax Savings"
            description="Calculate deferred capital gains and depreciation recapture taxes through like-kind exchanges."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={{ padding: 16, background: "#fafafa", borderRadius: 8 }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700 }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{description}</p>
    </div>
  );
}
