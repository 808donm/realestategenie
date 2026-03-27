import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";

type TodayEvent = {
  id: string;
  address: string;
  start_at: string;
  end_at: string;
  status: string;
  event_type: string;
};

type FollowUp = {
  leadId: string;
  name: string;
  heatScore: number;
  pipelineStageLabel: string;
  property: string;
  daysSinceLastTouch: number;
};

export default function TodayView({
  agentName,
  timezone,
  todayEvents,
  urgentFollowUps,
}: {
  agentName: string;
  timezone?: string;
  todayEvents: TodayEvent[];
  urgentFollowUps: FollowUp[];
}) {
  const now = new Date();
  const hour = timezone
    ? parseInt(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone }), 10)
    : now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const todayStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(timezone ? { timeZone: timezone } : {}),
  });

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, {agentName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">{todayStr}</p>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Today&apos;s Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events scheduled today.{" "}
              <Link href="/app/open-houses/new" className="text-primary underline">
                Create an open house
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/app/open-houses/${event.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors no-underline"
                >
                  <div className="flex flex-col items-center text-xs font-semibold text-primary min-w-[50px]">
                    <Clock className="w-3.5 h-3.5 mb-1" />
                    {new Date(event.start_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{event.address}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.start_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {new Date(event.end_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <Badge
                        variant={event.status === "published" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Urgent Follow-ups */}
      {urgentFollowUps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-amber-900">Needs Attention</span>
              <Badge variant="warning" className="ml-auto">
                {urgentFollowUps.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentFollowUps.slice(0, 5).map((lead) => (
                <Link
                  key={lead.leadId}
                  href={`/app/leads`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-amber-100/50 transition-colors no-underline"
                >
                  <div>
                    <span className="text-sm font-medium">{lead.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{lead.pipelineStageLabel}</span>
                  </div>
                  <div className="text-xs text-amber-700 font-medium">{lead.daysSinceLastTouch}d ago</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
