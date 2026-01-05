import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import SignOutButton from "./dashboard/signout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? "";

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-4 py-5">
          {/* Logo and Email - Full Width on Mobile */}
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <Link
              href="/app/dashboard"
              className="flex items-center gap-2 font-black no-underline"
            >
              <Image
                src="/logo.png"
                alt="The Real Estate Genie"
                width={120}
                height={120}
                priority
                style={{ borderRadius: 6 }}
              />
              <span className="text-lg tracking-wide hidden sm:inline">
                The Real Estate Genie<span className="text-xs align-super">™</span>
              </span>
            </Link>

            {/* Email and Sign Out - Desktop */}
            <div className="hidden md:flex gap-3 items-center ml-auto">
              <span className="text-xs opacity-75">{email}</span>
              <SignOutButton />
            </div>
          </div>

          {/* Navigation - Responsive Grid */}
          <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 md:gap-3">
            <NavLink href="/app/dashboard">Dashboard</NavLink>
            <NavLink href="/app/open-houses">Open Houses</NavLink>
            <NavLink href="/app/leads">Leads</NavLink>
            <NavLink href="/app/neighborhood-profiles">Neighborhoods</NavLink>
            <NavLink href="/app/pm/leases">Property Management</NavLink>
            <NavLink href="/app/integrations">Integrations</NavLink>
            <NavLink href="/app/settings/profile">Settings</NavLink>
          </nav>

          {/* Email and Sign Out - Mobile */}
          <div className="flex md:hidden gap-3 items-center justify-end mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs opacity-75">{email}</span>
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
      className="no-underline font-bold py-2 px-3 border border-gray-200 rounded-xl bg-white text-center text-sm md:text-base hover:bg-gray-50 transition-colors"
    >
      {children}
    </Link>
  );
}
