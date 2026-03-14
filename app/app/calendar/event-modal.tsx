"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

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

const SOURCE_LABELS: Record<string, string> = {
  google: "Google Calendar",
  microsoft: "Outlook Calendar",
  ghl: "CRM Calendar",
  local: "Local",
};

export default function EventModal({
  event,
  connectedSources,
  onClose,
  onSaved,
  onDeleted,
}: {
  event: CalendarEvent | null;
  connectedSources?: string[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isNew = !event;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [startAt, setStartAt] = useState(
    event?.start_at ? toLocalDatetimeString(event.start_at) : toLocalDatetimeString(new Date().toISOString())
  );
  const [endAt, setEndAt] = useState(
    event?.end_at ? toLocalDatetimeString(event.end_at) : toLocalDatetimeString(new Date(Date.now() + 60 * 60 * 1000).toISOString())
  );
  const [allDay, setAllDay] = useState(event?.all_day || false);
  const [source, setSource] = useState(event?.source || "local");

  function toLocalDatetimeString(iso: string) {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description || null,
        location: location || null,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        all_day: allDay,
        ...(isNew ? { source } : {}),
      };

      const url = isNew ? "/api/calendar" : `/api/calendar/${event.id}`;
      const method = isNew ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(isNew ? "Event created" : "Event updated", {
          description: source !== "local"
            ? `Will sync to ${SOURCE_LABELS[source] || source}`
            : undefined,
        });
        onSaved();
      } else {
        const data = await response.json();
        toast.error("Failed to save event", { description: data.error });
      }
    } catch (err: any) {
      toast.error("Failed to save event", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (
      !confirm(
        event.source !== "local"
          ? `This will also delete the event from ${SOURCE_LABELS[event.source]}. Continue?`
          : "Delete this event?"
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/calendar/${event.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Event deleted");
        onDeleted();
      } else {
        const data = await response.json();
        toast.error("Failed to delete event", { description: data.error });
      }
    } catch (err: any) {
      toast.error("Failed to delete event", { description: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isNew ? "New Event" : "Event Details"}
          </h2>
          <div className="flex items-center gap-2">
            {event && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  event.source === "google"
                    ? "border-blue-300 text-blue-600"
                    : event.source === "microsoft"
                    ? "border-green-300 text-green-600"
                    : event.source === "ghl"
                    ? "border-purple-300 text-purple-600"
                    : ""
                }`}
              >
                {SOURCE_LABELS[event.source] || event.source}
              </Badge>
            )}
            {event?.pending_sync && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Pending Sync
              </Badge>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>

          {/* Target Calendar (new events only) */}
          {isNew && (
            <div className="space-y-1.5">
              <Label>Calendar</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Only</SelectItem>
                  {connectedSources?.includes("google") && (
                    <SelectItem value="google">Google Calendar</SelectItem>
                  )}
                  {connectedSources?.includes("microsoft") && (
                    <SelectItem value="microsoft">Outlook Calendar</SelectItem>
                  )}
                  {connectedSources?.includes("ghl") && (
                    <SelectItem value="ghl">CRM Calendar</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {source !== "local" && (
                <p className="text-xs text-muted-foreground">
                  Event will be pushed to {SOURCE_LABELS[source]} on next sync.
                </p>
              )}
            </div>
          )}

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              id="all-day"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="all-day">All day</Label>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? startAt.split("T")[0] : startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? endAt.split("T")[0] : endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
            />
          </div>

          {/* Attendees (read-only for synced events) */}
          {event && event.attendees && event.attendees.length > 0 && (
            <div className="space-y-1.5">
              <Label>Attendees</Label>
              <div className="flex flex-wrap gap-1">
                {event.attendees.map((a: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {a.name || a.email}
                    {a.responseStatus && (
                      <span className="ml-1 opacity-60">({a.responseStatus})</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t">
          <div>
            {event && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {isNew ? "Create" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
