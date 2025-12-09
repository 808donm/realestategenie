"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function NewOpenHousePage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) {
      setSaving(false);
      setErr("Not signed in.");
      return;
    }

    const { data, error } = await supabase
      .from("open_house_events")
      .insert({
        agent_id: user.id,
        address: address.trim(),
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        status: "draft",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    router.push(`/app/open-houses/${data.id}`);
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>New Open House</h1>

      <form onSubmit={create} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: "100%", padding: 10 }} required />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Start</label>
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ padding: 10 }} required />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>End</label>
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} style={{ padding: 10 }} required />
        </div>

        <button disabled={saving} style={{ padding: 12, fontWeight: 700 }}>
          {saving ? "Creating…" : "Create"}
        </button>

        {err && <p style={{ color: "crimson", margin: 0 }}>{err}</p>}
      </form>
    </div>
  );
}
