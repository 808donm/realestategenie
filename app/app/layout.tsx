import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import SignOutButton from "./dashboard/signout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #eee" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 18px", display: "flex", gap: 14, alignItems: "center" }}>
          <Link
  href="/app/dashboard"
  style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900, textDecoration: "none" }}
>
  <Image
    src="/logo.jpeg"
    alt="The Real Estate Genie"
    width={44}
    height={44}
    priority
    style={{ borderRadius: 6 }}
  />
  <span style={{ fontSize: 18, letterSpacing: 0.2 }}>
    The Real Estate Genie<span style={{ fontSize: 12, verticalAlign: "super" }}>™</span>
  </span>
</Link>

          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <NavLink href="/app/dashboard">Dashboard</NavLink>
            <NavLink href="/app/open-houses">Open Houses</NavLink>
            <NavLink href="/app/leads">Leads</NavLink>
            <NavLink href="/app/integrations">Integrations</NavLink>
            <NavLink href="/app/settings/profile">Settings</NavLink>
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 12, opacity: 0.75 }}>{email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 18px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        fontWeight: 700,
        padding: "8px 10px",
        border: "1px solid #e6e6e6",
        borderRadius: 12,
        background: "#fff",
      }}
    >
      {children}
    </Link>
  );
}
