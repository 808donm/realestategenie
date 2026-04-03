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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GenerateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profileId: string) => void;
  defaultAddress?: string;
  defaultCity?: string;
  defaultNeighborhood?: string;
}

export default function GenerateProfileModal({
  isOpen,
  onClose,
  onSuccess,
  defaultAddress = "",
  defaultCity = "",
  defaultNeighborhood = "",
}: GenerateProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mlsSearching, setMlsSearching] = useState(false);
  const [mlsQuery, setMlsQuery] = useState("");
  const [mlsImported, setMlsImported] = useState(false);

  // Form fields
  const [neighborhoodName, setNeighborhoodName] = useState(defaultNeighborhood);
  const [address, setAddress] = useState(defaultAddress);
  const [city, setCity] = useState(defaultCity);
  const [stateProvince, setStateProvince] = useState("");
  const [country, setCountry] = useState<"USA" | "Canada">("USA");
  const [architecturalStyle, setArchitecturalStyle] = useState("");
  const [nearbyAmenities, setNearbyAmenities] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  // MLS Import -- search by MLS# or address and auto-fill fields
  const handleMlsImport = async () => {
    if (!mlsQuery.trim()) return;
    setMlsSearching(true);
    setError("");
    try {
      const q = mlsQuery.trim();
      // Determine if it's an MLS number or address
      const isMlsNumber = /^[A-Z]?\d{6,}$/i.test(q);
      const url = isMlsNumber
        ? `/api/mls/lookup-listing?mlsNumber=${encodeURIComponent(q)}`
        : `/api/mls/search?q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();

      // Extract property from response
      const prop = isMlsNumber
        ? data
        : data.properties?.[0];

      if (!prop) {
        setError("No MLS listing found. Try a different MLS# or address.");
        return;
      }

      // Auto-fill form fields from MLS data
      const mlsAddr = prop.UnparsedAddress || prop.address || [prop.StreetNumber, prop.StreetName, prop.StreetSuffix].filter(Boolean).join(" ");
      const mlsCity = prop.City || prop.city || "";
      const mlsState = prop.StateOrProvince || prop.state || "";
      const mlsZip = prop.PostalCode || prop.postalCode || "";
      const mlsSubdivision = prop.SubdivisionName || "";

      if (mlsAddr) setAddress(mlsAddr);
      if (mlsCity) setCity(mlsCity);
      if (mlsState) setStateProvince(mlsState);
      if (mlsSubdivision && !neighborhoodName) setNeighborhoodName(mlsSubdivision);
      if (!neighborhoodName && mlsCity) setNeighborhoodName(`${mlsCity} ${mlsZip}`.trim());

      // Add property details as additional context
      const details: string[] = [];
      if (prop.PropertyType) details.push(`Property Type: ${prop.PropertyType}`);
      if (prop.BedroomsTotal) details.push(`${prop.BedroomsTotal} bedrooms`);
      if (prop.BathroomsTotalInteger) details.push(`${prop.BathroomsTotalInteger} bathrooms`);
      if (prop.LivingArea) details.push(`${prop.LivingArea.toLocaleString()} sqft`);
      if (prop.ListPrice) details.push(`List Price: $${prop.ListPrice.toLocaleString()}`);
      if (details.length > 0) {
        setAdditionalContext((prev) => prev ? `${prev}\nMLS Property: ${details.join(", ")}` : `MLS Property: ${details.join(", ")}`);
      }

      setMlsImported(true);
    } catch (err: any) {
      setError("Failed to search MLS. Please try again or enter details manually.");
    } finally {
      setMlsSearching(false);
    }
  };

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
          nearbyAmenities: nearbyAmenities ? nearbyAmenities.split(",").map((a) => a.trim()) : undefined,
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
            Create an AI-powered, Fair Housing compliant neighborhood profile for your client. Fill in the details
            below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* MLS Import */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <Label className="text-blue-800 font-semibold">Import from MLS (optional)</Label>
            <p className="text-xs text-blue-600">Enter an MLS# or property address to auto-fill the form fields.</p>
            <div className="flex gap-2">
              <Input
                placeholder="MLS# (e.g., H12345678) or address"
                value={mlsQuery}
                onChange={(e) => setMlsQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMlsImport()}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleMlsImport}
                disabled={mlsSearching || !mlsQuery.trim()}
                size="sm"
              >
                {mlsSearching ? "Searching..." : "Import"}
              </Button>
            </div>
            {mlsImported && (
              <p className="text-xs text-green-600 font-medium">MLS data imported! Review and adjust the fields below.</p>
            )}
          </div>

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
                <p className="text-xs text-muted-foreground">List parks, shopping areas, transit stations, etc.</p>
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
