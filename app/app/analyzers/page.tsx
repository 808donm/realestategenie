import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AnalyzersPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/signin");
  }

  // Get counts for summary
  const { count: propertyCount } = await supabase
    .from("investment_properties")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: exchangeCount } = await supabase
    .from("exchange_1031")
    .select("*", { count: "exact", head: true });

  const { count: comparisonCount } = await supabase
    .from("property_comparisons")
    .select("*", { count: "exact", head: true });

  const { count: brrrCount } = await supabase
    .from("brrr_analyses")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: flipCount } = await supabase
    .from("flip_analyses")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 0, marginBottom: 8 }}>
        Investment Analyzers
      </h1>
      <p style={{ margin: "0 0 24px 0", opacity: 0.7 }}>
        Tools to analyze investment properties and 1031 exchanges
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {/* Investment Analyzer Card */}
        <Link
          href="/app/analyzers/investment"
          style={{
            padding: 24,
            border: "1px solid #e6e6e6",
            borderRadius: 12,
            textDecoration: "none",
            color: "inherit",
            display: "block",
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 800 }}>
            Investment Property Analyzer
          </h2>
          <p style={{ margin: "0 0 16px 0", opacity: 0.7, fontSize: 14 }}>
            Calculate ROI, Cap Rate, IRR, and Cash-on-Cash returns for rental and investment
            properties.
          </p>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{propertyCount || 0}</span>{" "}
              <span style={{ opacity: 0.7 }}>saved properties</span>
            </div>
          </div>
        </Link>

        {/* 1031 Exchange Card */}
        <Link
          href="/app/analyzers/1031"
          style={{
            padding: 24,
            border: "1px solid #e6e6e6",
            borderRadius: 12,
            textDecoration: "none",
            color: "inherit",
            display: "block",
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 800 }}>
            1031 Exchange Analyzer
          </h2>
          <p style={{ margin: "0 0 16px 0", opacity: 0.7, fontSize: 14 }}>
            Track exchange timelines, calculate tax savings, and compare replacement properties for
            1031 exchanges.
          </p>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{exchangeCount || 0}</span>{" "}
              <span style={{ opacity: 0.7 }}>exchanges</span>
            </div>
          </div>
        </Link>

        {/* BRRR Strategy Card */}
        <Link
          href="/app/analyzers/brrr"
          style={{
            padding: 24,
            border: "1px solid #e6e6e6",
            borderRadius: 12,
            textDecoration: "none",
            color: "inherit",
            display: "block",
            transition: "border-color 0.2s",
            background: "linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏗️</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 800 }}>
            BRRR Strategy Analyzer
          </h2>
          <p style={{ margin: "0 0 16px 0", opacity: 0.7, fontSize: 14 }}>
            Buy, Renovate, Refinance, Rent. Analyze deals for infinite returns and cash-out refinancing.
            Supports multi-family properties.
          </p>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{brrrCount || 0}</span>{" "}
              <span style={{ opacity: 0.7 }}>saved analyses</span>
            </div>
          </div>
        </Link>

        {/* House Flip Card */}
        <Link
          href="/app/analyzers/flip"
          style={{
            padding: 24,
            border: "1px solid #e6e6e6",
            borderRadius: 12,
            textDecoration: "none",
            color: "inherit",
            display: "block",
            transition: "border-color 0.2s",
            background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔨</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 800 }}>
            House Flip Analyzer
          </h2>
          <p style={{ margin: "0 0 16px 0", opacity: 0.7, fontSize: 14 }}>
            Fix and flip calculator with 70% rule, ROI projections, and rehab cost estimator.
            Includes financing options.
          </p>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{flipCount || 0}</span>{" "}
              <span style={{ opacity: 0.7 }}>saved analyses</span>
            </div>
          </div>
        </Link>

        {/* Compare Properties Card */}
        <Link
          href="/app/analyzers/compare"
          style={{
            padding: 24,
            border: "1px solid #e6e6e6",
            borderRadius: 12,
            textDecoration: "none",
            color: "inherit",
            display: "block",
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 800 }}>
            Compare Properties
          </h2>
          <p style={{ margin: "0 0 16px 0", opacity: 0.7, fontSize: 14 }}>
            Compare multiple investment properties side by side to find the best deal based on
            multiple metrics.
          </p>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{comparisonCount || 0}</span>{" "}
              <span style={{ opacity: 0.7 }}>saved comparisons</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Feature Overview */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Key Metrics Calculated</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <FeatureItem
            title="Cap Rate"
            description="Net Operating Income divided by purchase price. Measures property profitability regardless of financing."
          />
          <FeatureItem
            title="Cash-on-Cash Return"
            description="Annual pre-tax cash flow divided by total cash invested. Shows actual return on your cash."
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
            title="70% Rule (Flips)"
            description="Max purchase = 70% of ARV minus repairs. Classic rule for profitable flip deals."
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

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ padding: 16, background: "#fafafa", borderRadius: 8 }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{description}</p>
    </div>
  );
}
