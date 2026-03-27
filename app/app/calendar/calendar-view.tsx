"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Loader2, Calendar as CalendarIcon } from "lucide-react";
import EventModal from "./event-modal";

type CalendarEvent = {
  id: string;
  source: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  status: string;
  attendees: any[];
  pending_sync: boolean;
  color: string | null;
};

const SOURCE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  google: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Google" },
  microsoft: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Outlook" },
  ghl: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", label: "CRM" },
  local: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", label: "Local" },
};

type ViewMode = "month" | "week" | "day";

export default function CalendarView({ connectedSources }: { connectedSources: string[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["google", "microsoft", "ghl", "local"]));

  const getDateRange = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "month") {
      const start = new Date(year, month, 1);
      start.setDate(start.getDate() - start.getDay()); // Start from Sunday
      const end = new Date(year, month + 1, 0);
      end.setDate(end.getDate() + (6 - end.getDay())); // End on Saturday
      return { start, end };
    }

    if (viewMode === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end };
    }

    // Day view
    return {
      start: new Date(year, month, currentDate.getDate()),
      end: new Date(year, month, currentDate.getDate()),
    };
  }, [currentDate, viewMode]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      const response = await fetch(`/api/calendar?${params}`);
      const data = await response.json();

      if (response.ok) {
        setEvents(data.events || []);
      } else {
        toast.error("Failed to load events", { description: data.error });
      }
    } catch (err: any) {
      toast.error("Failed to load events", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        toast.success("Calendar synced", {
          description: `${data.totalCreated || 0} new, ${data.totalUpdated || 0} updated`,
        });
        await fetchEvents();
      } else {
        toast.error("Sync failed", { description: data.error });
      }
    } catch (err: any) {
      toast.error("Sync failed", { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() + direction);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7 * direction);
    else newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const toggleFilter = (source: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  const filteredEvents = events.filter((e) => activeFilters.has(e.source));

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return filteredEvents.filter((e) => {
      const eventDate = new Date(e.start_at).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const headerLabel = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const { start, end } = getDateRange();
      return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Build month grid
  const buildMonthGrid = () => {
    const { start } = getDateRange();
    const weeks: Date[][] = [];
    const cursor = new Date(start);

    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    return weeks;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === currentDate.getMonth();

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-lg font-semibold ml-2">{headerLabel()}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex border rounded-md overflow-hidden">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm capitalize ${
                  viewMode === mode ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || connectedSources.length === 0}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Sync
          </Button>

          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Event
          </Button>
        </div>
      </div>

      {/* Source Filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SOURCE_COLORS).map(([source, style]) => {
          const isActive = activeFilters.has(source);
          const isConnected = source === "local" || connectedSources.includes(source);
          return (
            <button
              key={source}
              onClick={() => toggleFilter(source)}
              disabled={!isConnected && source !== "local"}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-opacity ${style.bg} ${style.text} ${
                isActive ? "opacity-100" : "opacity-40"
              } ${!isConnected && source !== "local" ? "cursor-not-allowed line-through" : "cursor-pointer"}`}
            >
              {style.label}
              {!isConnected && source !== "local" && " (not connected)"}
            </button>
          );
        })}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === "month" ? (
        <Card>
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {buildMonthGrid().map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
                {week.map((date, di) => {
                  const dayEvents = getEventsForDate(date);
                  return (
                    <div
                      key={di}
                      className={`min-h-[100px] border-r last:border-r-0 p-1 ${
                        !isCurrentMonth(date) ? "bg-muted/30" : ""
                      }`}
                    >
                      <div
                        className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday(date)
                            ? "bg-primary text-primary-foreground"
                            : isCurrentMonth(date)
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((event) => {
                          const style = SOURCE_COLORS[event.source] || SOURCE_COLORS.local;
                          return (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`w-full text-left px-1 py-0.5 rounded text-[10px] leading-tight truncate ${style.bg} ${style.text}`}
                            >
                              {!event.all_day && <span className="font-medium">{formatTime(event.start_at)} </span>}
                              {event.title}
                              {event.pending_sync && " *"}
                            </button>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : viewMode === "week" ? (
        <WeekView
          events={filteredEvents}
          currentDate={currentDate}
          getDateRange={getDateRange}
          onSelectEvent={setSelectedEvent}
        />
      ) : (
        <DayView events={filteredEvents} currentDate={currentDate} onSelectEvent={setSelectedEvent} />
      )}

      {/* Event Detail / Edit Modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSaved={() => {
            setSelectedEvent(null);
            fetchEvents();
          }}
          onDeleted={() => {
            setSelectedEvent(null);
            fetchEvents();
          }}
        />
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <EventModal
          event={null}
          connectedSources={connectedSources}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            fetchEvents();
          }}
          onDeleted={() => {}}
        />
      )}

      {/* No integrations hint */}
      {connectedSources.length === 0 && events.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No calendars connected</p>
          <p className="text-sm mt-1">
            Connect Google Calendar, Microsoft/Outlook, or your CRM on the{" "}
            <a href="/app/integrations" className="underline">
              Integrations
            </a>{" "}
            page to enable two-way sync.
          </p>
        </div>
      )}
    </div>
  );
}

// --- Week View ---

function WeekView({
  events,
  currentDate,
  getDateRange,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  currentDate: Date;
  getDateRange: () => { start: Date; end: Date };
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const { start } = getDateRange();
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px]">
          {/* Header */}
          <div className="border-b border-r" />
          {days.map((d, i) => (
            <div key={i} className="text-center text-xs font-medium py-2 border-b border-r last:border-r-0">
              {d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
            </div>
          ))}

          {/* Time slots */}
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="text-[10px] text-muted-foreground text-right pr-2 pt-1 border-r h-12">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
              {days.map((d, di) => {
                const dateStr = d.toISOString().split("T")[0];
                const slotEvents = events.filter((e) => {
                  const eDate = new Date(e.start_at).toISOString().split("T")[0];
                  const eHour = new Date(e.start_at).getHours();
                  return eDate === dateStr && eHour === hour;
                });

                return (
                  <div key={di} className="border-b border-r last:border-r-0 h-12 relative">
                    {slotEvents.map((event) => {
                      const style = SOURCE_COLORS[event.source] || SOURCE_COLORS.local;
                      return (
                        <button
                          key={event.id}
                          onClick={() => onSelectEvent(event)}
                          className={`absolute inset-x-0 mx-0.5 px-1 py-0.5 rounded text-[10px] truncate ${style.bg} ${style.text}`}
                        >
                          {event.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Day View ---

function DayView({
  events,
  currentDate,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  currentDate: Date;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const dateStr = currentDate.toISOString().split("T")[0];
  const dayEvents = events.filter((e) => {
    return new Date(e.start_at).toISOString().split("T")[0] === dateStr;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Card>
      <CardContent className="p-0">
        {hours.map((hour) => {
          const hourEvents = dayEvents.filter((e) => new Date(e.start_at).getHours() === hour);

          return (
            <div key={hour} className="flex border-b last:border-b-0 min-h-[48px]">
              <div className="w-16 text-[11px] text-muted-foreground text-right pr-2 pt-1 border-r shrink-0">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
              <div className="flex-1 p-1 space-y-0.5">
                {hourEvents.map((event) => {
                  const style = SOURCE_COLORS[event.source] || SOURCE_COLORS.local;
                  return (
                    <button
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className={`w-full text-left px-2 py-1 rounded text-sm ${style.bg} ${style.text}`}
                    >
                      <span className="font-medium">
                        {new Date(event.start_at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>{" "}
                      {event.title}
                      {event.location && <span className="opacity-60 ml-2">{event.location}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
