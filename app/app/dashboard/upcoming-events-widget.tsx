"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, ChevronRight, Loader2 } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  location: string | null;
  source: string;
  all_day: boolean;
}

const SOURCE_DOT: Record<string, string> = {
  google: "#3b82f6",
  microsoft: "#16a34a",
  ghl: "#7c3aed",
  local: "#6b7280",
};

function formatEventTime(start: string, allDay: boolean): string {
  if (allDay) return "All day";
  const d = new Date(start);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}

export default function UpcomingEventsWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks ahead
    const params = new URLSearchParams({
      start: now.toISOString(),
      end: end.toISOString(),
    });

    fetch(`/api/calendar?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const upcoming = (data.events || [])
          .filter((e: CalendarEvent) => new Date(e.start_at) >= now)
          .slice(0, 5);
        setEvents(upcoming);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return null;
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming Events
          </CardTitle>
          <Link href="/app/calendar" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 no-underline">
            View calendar <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-2.5 px-3 py-2 bg-gray-50 rounded-lg"
            >
              <span
                className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                style={{ background: SOURCE_DOT[event.source] || "#6b7280" }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800 truncate">
                  {event.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {formatEventTime(event.start_at, event.all_day)}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
