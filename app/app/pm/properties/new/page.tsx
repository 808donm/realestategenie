"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, AlertCircle } from "lucide-react";
import Link from "next/link";

const PROPERTY_TYPES = [
  { value: "single_family", label: "Single Family Home" },
  { value: "condo", label: "Condo" },
  { value: "townhome", label: "Townhome" },
  { value: "duplex", label: "Duplex" },
  { value: "multi_unit", label: "Multi-Unit" },
];

const PROPERTY_STATUSES = [
  { value: "available", label: "Available" },
  { value: "rented", label: "Rented" },
  { value: "maintenance", label: "Under Maintenance" },
  { value: "unavailable", label: "Unavailable" },
];

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state_province: "",
    zip_postal_code: "",
    property_type: "single_family",
    units_count: "1",
    monthly_rent: "",
    security_deposit: "",
    pet_deposit: "",
    pet_policy: "",
    amenities: "",
    property_photo_url: "",
    status: "available",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!formData.address || !formData.city || !formData.state_province) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/pm/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          units_count: parseInt(formData.units_count),
          monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
          security_deposit: formData.security_deposit ? parseFloat(formData.security_deposit) : null,
          pet_deposit: formData.pet_deposit ? parseFloat(formData.pet_deposit) : null,
          amenities: formData.amenities ? formData.amenities.split(",").map(a => a.trim()) : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create property");
        return;
      }

      // Redirect to properties list
      router.push("/app/pm/properties");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/pm/properties">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Add Rental Property</h2>
          <p className="text-muted-foreground">Add a new property to your portfolio</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
            <CardDescription>
              Enter the details for your rental property
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location</h3>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  placeholder="123 Main St"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Province *</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={formData.state_province}
                    onChange={(e) => handleChange("state_province", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP/Postal Code</Label>
                  <Input
                    id="zip"
                    placeholder="12345"
                    value={formData.zip_postal_code}
                    onChange={(e) => handleChange("zip_postal_code", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Property Details</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="property_type">Property Type *</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(value) => handleChange("property_type", value)}
                    disabled={loading}
                  >
                    <SelectTrigger id="property_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="units_count">Number of Units *</Label>
                  <Input
                    id="units_count"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.units_count}
                    onChange={(e) => handleChange("units_count", e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    For multi-unit properties, you can add individual units later
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value)}
                    disabled={loading}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property_photo_url">Property Photo URL</Label>
                  <Input
                    id="property_photo_url"
                    type="url"
                    placeholder="https://..."
                    value={formData.property_photo_url}
                    onChange={(e) => handleChange("property_photo_url", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Financial Details</h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent</Label>
                  <Input
                    id="monthly_rent"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1500.00"
                    value={formData.monthly_rent}
                    onChange={(e) => handleChange("monthly_rent", e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Base rent for single-unit properties
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security_deposit">Security Deposit</Label>
                  <Input
                    id="security_deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1500.00"
                    value={formData.security_deposit}
                    onChange={(e) => handleChange("security_deposit", e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pet_deposit">Pet Deposit</Label>
                  <Input
                    id="pet_deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="500.00"
                    value={formData.pet_deposit}
                    onChange={(e) => handleChange("pet_deposit", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>

              <div className="space-y-2">
                <Label htmlFor="pet_policy">Pet Policy</Label>
                <Textarea
                  id="pet_policy"
                  placeholder="e.g., Dogs and cats allowed, max 2 pets, weight limit 50 lbs"
                  value={formData.pet_policy}
                  onChange={(e) => handleChange("pet_policy", e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amenities">Amenities</Label>
                <Input
                  id="amenities"
                  placeholder="Dishwasher, AC, Parking, Washer/Dryer (comma-separated)"
                  value={formData.amenities}
                  onChange={(e) => handleChange("amenities", e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter amenities separated by commas
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Property"}
              </Button>
              <Link href="/app/pm/properties">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
