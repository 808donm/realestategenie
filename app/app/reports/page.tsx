import { supabaseServer } from "@/lib/supabase/server";
import { checkFeatureAccess } from "@/lib/subscriptions/server-utils";
import Link from "next/link";
import {
  FileText,
  TrendingUp,
  Users,
  Home,
  Calendar,
  DollarSign,
  BarChart3,
  PieChart,
  Building2,
  Lock,
} from "lucide-react";

export default async function ReportsPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <div>Not authenticated</div>;
  }

  const hasBrokerAccess = await checkFeatureAccess("broker-dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate reports and analytics for your real estate business
        </p>
      </div>

      {/* Agent Reports - Available to All */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Agent Reports
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ReportCard
            href="/app/reports/open-house-performance"
            icon={<Calendar className="w-6 h-6" />}
            title="Open House Performance"
            description="Track sign-ins, lead quality, and conversion rates from your open houses"
            color="blue"
          />
          <ReportCard
            href="/app/reports/lead-analytics"
            icon={<Users className="w-6 h-6" />}
            title="Lead Analytics"
            description="Analyze lead sources, follow-up rates, and pipeline performance"
            color="green"
          />
          <ReportCard
            href="/app/reports/listing-activity"
            icon={<Home className="w-6 h-6" />}
            title="Listing Activity"
            description="View showings, feedback, and engagement on your listings"
            color="purple"
          />
          <ReportCard
            href="/app/reports/contact-engagement"
            icon={<TrendingUp className="w-6 h-6" />}
            title="Contact Engagement"
            description="Track communication history and engagement with your contacts"
            color="orange"
          />
          <ReportCard
            href="/app/reports/monthly-summary"
            icon={<BarChart3 className="w-6 h-6" />}
            title="Monthly Summary"
            description="Overview of your monthly activities, leads, and transactions"
            color="teal"
          />
          <ReportCard
            href="/app/reports/commission-tracker"
            icon={<DollarSign className="w-6 h-6" />}
            title="Commission Tracker"
            description="Track pending and closed commissions from your transactions"
            color="emerald"
          />
        </div>
      </section>

      {/* Broker Reports - Subscription Gated */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          Broker Reports
          {!hasBrokerAccess && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-normal flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Brokerage Growth Plan
            </span>
          )}
        </h2>

        {hasBrokerAccess ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ReportCard
              href="/app/reports/broker/agent-performance"
              icon={<Users className="w-6 h-6" />}
              title="Agent Performance"
              description="Compare agent productivity, leads, listings, and closed transactions"
              color="indigo"
            />
            <ReportCard
              href="/app/reports/broker/office-production"
              icon={<Building2 className="w-6 h-6" />}
              title="Office Production"
              description="Track total office volume, revenue, and market share"
              color="violet"
            />
            <ReportCard
              href="/app/reports/broker/revenue-breakdown"
              icon={<PieChart className="w-6 h-6" />}
              title="Revenue Breakdown"
              description="Analyze revenue by agent, property type, and transaction type"
              color="fuchsia"
            />
            <ReportCard
              href="/app/reports/broker/recruiting-pipeline"
              icon={<TrendingUp className="w-6 h-6" />}
              title="Recruiting Pipeline"
              description="Track agent recruitment, onboarding, and retention metrics"
              color="pink"
            />
            <ReportCard
              href="/app/reports/broker/compliance-audit"
              icon={<FileText className="w-6 h-6" />}
              title="Compliance Audit"
              description="Review transaction documentation and compliance status"
              color="rose"
            />
            <ReportCard
              href="/app/reports/broker/market-analysis"
              icon={<BarChart3 className="w-6 h-6" />}
              title="Market Analysis"
              description="Compare your brokerage performance to market trends"
              color="red"
            />
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Broker Reports Require Upgrade
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Access comprehensive broker reports including agent performance, office production,
              revenue analytics, and compliance audits with the Brokerage Growth plan.
            </p>
            <Link
              href="/app/billing"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Upgrade to Brokerage Growth
            </Link>
          </div>
        )}
      </section>

      {/* Property Management Reports */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Home className="w-5 h-5 text-teal-600" />
          Property Management Reports
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ReportCard
            href="/app/reports/pm/occupancy"
            icon={<PieChart className="w-6 h-6" />}
            title="Occupancy Report"
            description="Track vacancy rates, turnover, and occupancy trends"
            color="teal"
          />
          <ReportCard
            href="/app/reports/pm/rent-roll"
            icon={<DollarSign className="w-6 h-6" />}
            title="Rent Roll"
            description="Complete rent roll with lease terms, rates, and expirations"
            color="cyan"
          />
          <ReportCard
            href="/app/reports/pm/maintenance"
            icon={<FileText className="w-6 h-6" />}
            title="Maintenance Summary"
            description="Work order history, costs, and vendor performance"
            color="sky"
          />
        </div>
      </section>
    </div>
  );
}

function ReportCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    teal: "from-teal-500 to-teal-600",
    emerald: "from-emerald-500 to-emerald-600",
    indigo: "from-indigo-500 to-indigo-600",
    violet: "from-violet-500 to-violet-600",
    fuchsia: "from-fuchsia-500 to-fuchsia-600",
    pink: "from-pink-500 to-pink-600",
    rose: "from-rose-500 to-rose-600",
    red: "from-red-500 to-red-600",
    cyan: "from-cyan-500 to-cyan-600",
    sky: "from-sky-500 to-sky-600",
  };

  return (
    <Link
      href={href}
      className="block p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white shrink-0`}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}
