"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, AlertCircle, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state_province: "",
    zip_postal_code: "",
    property_type: "single_family",
    units_count: "1",
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    description: "",
    monthly_rent: "",
    security_deposit: "",
    pet_deposit: "",
    pet_policy: "",
    amenities: "",
    features: "",
    property_photo_url: "",
    status: "available",
  });

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await fetch(`/api/pm/properties/${id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load property");
        return;
      }

      const property = data.property;
      setFormData({
        address: property.address || "",
        city: property.city || "",
        state_province: property.state_province || "",
        zip_postal_code: property.zip_postal_code || "",
        property_type: property.property_type || "single_family",
        units_count: String(property.units_count || 1),
        bedrooms: property.bedrooms ? String(property.bedrooms) : "",
        bathrooms: property.bathrooms ? String(property.bathrooms) : "",
        square_feet: property.square_feet ? String(property.square_feet) : "",
        description: property.description || "",
        monthly_rent: property.monthly_rent ? String(property.monthly_rent) : "",
        security_deposit: property.security_deposit ? String(property.security_deposit) : "",
        pet_deposit: property.pet_deposit ? String(property.pet_deposit) : "",
        pet_policy: property.pet_policy || "",
        amenities: property.amenities ? property.amenities.join(", ") : "",
        features: property.features ? property.features.join(", ") : "",
        property_photo_url: property.property_photo_url || "",
        status: property.status || "available",
      });
    } catch (err) {
      setError("An error occurred while loading the property");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch(`/api/pm/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          units_count: parseInt(formData.units_count),
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
          monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
          security_deposit: formData.security_deposit ? parseFloat(formData.security_deposit) : null,
          pet_deposit: formData.pet_deposit ? parseFloat(formData.pet_deposit) : null,
          amenities: formData.amenities ? formData.amenities.split(",").map(a => a.trim()).filter(Boolean) : [],
          features: formData.features ? formData.features.split(",").map(f => f.trim()).filter(Boolean) : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update property");
        return;
      }

      // Redirect to property detail
      router.push(`/app/pm/properties/${id}`);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/pm/properties/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete property");
        setDeleting(false);
        return;
      }

      // Redirect to properties list
      router.push("/app/pm/properties");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setDeleting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/app/pm/properties/${id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Edit Property</h2>
            <p className="text-muted-foreground">Update property information</p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="danger" disabled={deleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Property
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Property?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the property
                and remove all associated data. Properties with active leases cannot be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-danger text-danger-foreground hover:bg-danger/90"
              >
                {deleting ? "Deleting..." : "Delete Property"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
            <CardDescription>
              Update the details for your rental property
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
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Province *</Label>
                  <Input
                    id="state"
                    value={formData.state_province}
                    onChange={(e) => handleChange("state_province", e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP/Postal Code</Label>
                  <Input
                    id="zip"
                    value={formData.zip_postal_code}
                    onChange={(e) => handleChange("zip_postal_code", e.target.value)}
                    disabled={saving}
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
                    disabled={saving}
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
                    value={formData.units_count}
                    onChange={(e) => handleChange("units_count", e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value)}
                    disabled={saving}
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
                    value={formData.property_photo_url}
                    onChange={(e) => handleChange("property_photo_url", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Property Specifications */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Property Specifications</h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    placeholder="3"
                    value={formData.bedrooms}
                    onChange={(e) => handleChange("bedrooms", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="2.5"
                    value={formData.bathrooms}
                    onChange={(e) => handleChange("bathrooms", e.target.value)}
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Can include half baths (e.g., 2.5)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="square_feet">Square Feet</Label>
                  <Input
                    id="square_feet"
                    type="number"
                    min="0"
                    placeholder="1500"
                    value={formData.square_feet}
                    onChange={(e) => handleChange("square_feet", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Property Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Beautiful single-family home with modern amenities..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Detailed description for rental listings and open houses
                </p>
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
                    value={formData.monthly_rent}
                    onChange={(e) => handleChange("monthly_rent", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security_deposit">Security Deposit</Label>
                  <Input
                    id="security_deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.security_deposit}
                    onChange={(e) => handleChange("security_deposit", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pet_deposit">Pet Deposit</Label>
                  <Input
                    id="pet_deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pet_deposit}
                    onChange={(e) => handleChange("pet_deposit", e.target.value)}
                    disabled={saving}
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
                  value={formData.pet_policy}
                  onChange={(e) => handleChange("pet_policy", e.target.value)}
                  disabled={saving}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amenities">Amenities</Label>
                <Input
                  id="amenities"
                  placeholder="Pool, Gym, Laundry Room, Parking (comma-separated)"
                  value={formData.amenities}
                  onChange={(e) => handleChange("amenities", e.target.value)}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Building/complex amenities (e.g., Pool, Gym, Parking)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="features">Features</Label>
                <Input
                  id="features"
                  placeholder="Hardwood Floors, Central AC, Dishwasher, Garage (comma-separated)"
                  value={formData.features}
                  onChange={(e) => handleChange("features", e.target.value)}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Property features (e.g., Hardwood Floors, Central AC, Dishwasher, Garage)
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Link href={`/app/pm/properties/${id}`}>
                <Button type="button" variant="outline" disabled={saving}>
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
