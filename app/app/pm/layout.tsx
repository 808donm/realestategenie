import Link from "next/link";

export default function PMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {/* PM Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Property Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage rental properties, applications, leases, and maintenance
        </p>
      </div>

      {/* PM Navigation */}
      <nav className="flex gap-2 border-b pb-2">
        <PMNavLink href="/app/pm">Overview</PMNavLink>
        <PMNavLink href="/app/pm/properties">Properties</PMNavLink>
        <PMNavLink href="/app/pm/applications">Applications</PMNavLink>
        <PMNavLink href="/app/pm/leases">Leases</PMNavLink>
        <PMNavLink href="/app/pm/work-orders">Work Orders</PMNavLink>
        <PMNavLink href="/app/pm/invoices">Invoices</PMNavLink>
      </nav>

      {/* PM Content */}
      <div>{children}</div>
    </div>
  );
}

function PMNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
    >
      {children}
    </Link>
  );
}
