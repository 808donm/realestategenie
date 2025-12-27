"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type Property = {
  id: string;
  address: string;
  city: string | null;
  state_province: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthly_rent: number | null;
  property_photo_url: string | null;
};

export default function NewShowingForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!propertyId || !startDate || !startTime || !endTime) {
      setError("Please fill in all required fields");
      return;
    }

    // Combine date and time
    const startAt = new Date(`${startDate}T${startTime}`);
    const endAt = new Date(`${startDate}T${endTime}`);

    if (endAt <= startAt) {
      setError("End time must be after start time");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pm/showings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pm_property_id: propertyId,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          notes: notes.trim() || null,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `Failed to create showing (${response.status})`);
      }

      const { showing_id } = await response.json();

      // Redirect to showing detail page
      router.push(`/app/pm/showings/${showing_id}`);
    } catch (err: any) {
      console.error("Error creating showing:", err);
      setError(err.message || "Failed to create showing");
      setIsSubmitting(false);
    }
  };

  const selectedProperty = properties.find(p => p.id === propertyId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Property Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="property">Property *</Label>
            <select
              id="property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="">Choose a property...</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.address} - {property.city}, {property.state_province}
                </option>
              ))}
            </select>
          </div>

          {selectedProperty && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="font-medium">{selectedProperty.address}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {selectedProperty.bedrooms} bed • {selectedProperty.bathrooms} bath •
                ${selectedProperty.monthly_rent}/mo
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Showing Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Please park on street, enter through front door"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="published">Published (QR code active)</option>
              <option value="draft">Draft (not visible to public)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Published showings generate a QR code that attendees can scan to apply
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Showing"
          )}
        </Button>
      </div>
    </form>
  );
}
