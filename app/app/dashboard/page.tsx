import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import BootstrapAgent from "./bootstrap";
import SignOutButton from "./signout-button";

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();

  return (
    <div style={{ padding: 24 }}>
      <BootstrapAgent />
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>
      <p>Signed in as: <code>{data.user?.email}</code></p>
      <p>
       <Link href="/app/settings/profile">Edit profile</Link>
      </p>
      <SignOutButton />
    </div>
  );
}
