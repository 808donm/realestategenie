import Link from "next/link";

export default function PMReportsPage() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Property Management Reports</h2>
          <p style={{ margin: "4px 0 0 0", opacity: 0.7, fontSize: 14 }}>
            Operations, maintenance, and financial tracking for your rental portfolio
          </p>
        </div>
        <Link
          href="/app/reports"
          style={{ fontSize: 13, color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}
        >
          View All Reports &rarr;
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <PMReportCard
          href="/app/pm/reports/maintenance-status"
          icon="🔧"
          title="Maintenance Status Summary"
          description="Bird's-eye view of all open work orders, overdue items, and unresponsive vendors."
          dataSources={["GHL", "App"]}
          color="#ef4444"
        />
        <PMReportCard
          href="/app/pm/reports/rent-collection"
          icon="💵"
          title="Rent Collection Ledger"
          description="Who hasn't paid rent, who needs a late fee notice, and collection rate trends."
          dataSources={["Stripe", "PayPal"]}
          color="#059669"
        />
        <PMReportCard
          href="/app/pm/reports/vendor-spend"
          icon="🏪"
          title="Vendor Spend Report"
          description="Track spending per vendor to negotiate better preferred rates for plumbers, cleaners, and more."
          dataSources={["QBO"]}
          color="#8b5cf6"
        />
      </div>
    </div>
  );
}

function PMReportCard({
  href,
  icon,
  title,
  description,
  dataSources,
  color,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  dataSources: string[];
  color: string;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: 24,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        textDecoration: "none",
        color: "inherit",
        display: "block",
        background: "#fff",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 17, fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: "0 0 16px 0", opacity: 0.7, fontSize: 13, lineHeight: 1.5 }}>
        {description}
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        {dataSources.map((source) => (
          <span
            key={source}
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 4,
              background: "#f3f4f6",
              color: "#6b7280",
            }}
          >
            {source}
          </span>
        ))}
      </div>
    </Link>
  );
}
