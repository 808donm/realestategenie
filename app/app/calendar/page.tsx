import { supabaseServer } from "@/lib/supabase/server";
import CalendarView from "./calendar-view";

export default async function CalendarPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Check which calendar integrations are connected
  const { data: integrations } = await supabase
    .from("integrations")
    .select("provider, status")
    .eq("agent_id", user.id)
    .in("provider", ["google_calendar", "microsoft_calendar", "ghl"]);

  const connectedSources = (integrations || [])
    .filter((i) => i.status === "connected")
    .map((i) => {
      if (i.provider === "google_calendar") return "google";
      if (i.provider === "microsoft_calendar") return "microsoft";
      return "ghl";
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Merged view from all connected calendars. Individual calendars take precedence.
          </p>
        </div>
      </div>
      <CalendarView connectedSources={connectedSources} />
    </div>
  );
}
