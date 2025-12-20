"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GenerateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profileId: string) => void;
  defaultAddress?: string;
  defaultCity?: string;
}

export default function GenerateProfileModal({
  isOpen,
  onClose,
  onSuccess,
  defaultAddress = "",
  defaultCity = "",
}: GenerateProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [neighborhoodName, setNeighborhoodName] = useState("");
  const [address, setAddress] = useState(defaultAddress);
  const [city, setCity] = useState(defaultCity);
  const [stateProvince, setStateProvince] = useState("");
  const [country, setCountry] = useState<"USA" | "Canada">("USA");
  const [architecturalStyle, setArchitecturalStyle] = useState("");
  const [nearbyAmenities, setNearbyAmenities] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const handleGenerate = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/neighborhood-profiles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neighborhoodName,
          address,
          city,
          stateProvince,
          country,
          architecturalStyle: architecturalStyle || undefined,
          nearbyAmenities: nearbyAmenities
            ? nearbyAmenities.split(",").map((a) => a.trim())
            : undefined,
          additionalContext: additionalContext || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate profile");
      }

      // Success
      onSuccess(data.profile.id);
      onClose();

      // Reset form
      setNeighborhoodName("");
      setAddress("");
      setCity("");
      setStateProvince("");
      setArchitecturalStyle("");
      setNearbyAmenities("");
      setAdditionalContext("");
    } catch (err: any) {
      setError(err.message || "Failed to generate profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Neighborhood Profile</DialogTitle>
          <DialogDescription>
            Create an AI-powered, Fair Housing compliant neighborhood profile for your client.
            Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Neighborhood Name */}
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Neighborhood Name *</Label>
            <Input
              id="neighborhood"
              placeholder="e.g., Downtown Historic District"
              value={neighborhoodName}
              onChange={(e) => setNeighborhoodName(e.target.value)}
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address/Location *</Label>
            <Input
              id="address"
              placeholder="e.g., 123 Main Street"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              placeholder="e.g., San Francisco"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>

          {/* State/Province & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State/Province *</Label>
              <Input
                id="state"
                placeholder="e.g., CA or Ontario"
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select value={country} onValueChange={(value: "USA" | "Canada") => setCountry(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Optional Details (Helps AI generate better content)</h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="architecture">Architectural Style</Label>
                <Input
                  id="architecture"
                  placeholder="e.g., Mid-century modern, Victorian, Craftsman"
                  value={architecturalStyle}
                  onChange={(e) => setArchitecturalStyle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amenities">Nearby Amenities (comma-separated)</Label>
                <Input
                  id="amenities"
                  placeholder="e.g., Golden Gate Park, Ferry Building, BART Station"
                  value={nearbyAmenities}
                  onChange={(e) => setNearbyAmenities(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  List parks, shopping areas, transit stations, etc.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">Additional Context</Label>
                <Textarea
                  id="context"
                  placeholder="Any other details to help the AI (walkability, commute corridors, etc.)"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || !neighborhoodName || !address || !city || !stateProvince}
          >
            {loading ? "Generating..." : "Generate Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
