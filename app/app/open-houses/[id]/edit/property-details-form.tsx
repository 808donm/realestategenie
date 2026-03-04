"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

type FlyerFeature = {
  icon: string;
  label: string;
  value: string;
};

type PropertyDetailsFormProps = {
  eventId: string;
  initialData: {
    beds?: number | null;
    baths?: number | null;
    sqft?: number | null;
    price?: number | null;
    listing_description?: string | null;
    key_features?: string[] | null;
    flyer_description?: string | null;
    flyer_features?: FlyerFeature[] | null;
    property_photo_url?: string | null;
  };
};

const DEFAULT_FLYER_FEATURES: FlyerFeature[] = [
  { icon: "bed", label: "Bedrooms", value: "" },
  { icon: "bath", label: "Bathrooms", value: "" },
  { icon: "garage", label: "Parking", value: "" },
  { icon: "solar", label: "Solar", value: "" },
];

const FEATURE_ICON_OPTIONS = [
  { value: "solar", label: "Solar" },
  { value: "garage", label: "Garage" },
  { value: "sqft", label: "Square Feet" },
  { value: "bed", label: "Bedroom" },
  { value: "bath", label: "Bathroom" },
];

export default function PropertyDetailsForm({ eventId, initialData }: PropertyDetailsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [beds, setBeds] = useState(initialData.beds?.toString() || "");
  const [baths, setBaths] = useState(initialData.baths?.toString() || "");
  const [sqft, setSqft] = useState(initialData.sqft?.toString() || "");
  const [price, setPrice] = useState(initialData.price?.toString() || "");
  const [description, setDescription] = useState(initialData.listing_description || "");
  const [flyerDescription, setFlyerDescription] = useState(initialData.flyer_description || "");
  const [features, setFeatures] = useState(
    initialData.key_features?.join("\n") || ""
  );

  // Initialize flyer features from saved data or defaults, pre-populating beds/baths from specs
  const initFlyerFeatures = (): FlyerFeature[] => {
    if (initialData.flyer_features && initialData.flyer_features.length > 0) {
      // Pad to 4 if fewer saved
      const saved = [...initialData.flyer_features];
      while (saved.length < 4) {
        saved.push(DEFAULT_FLYER_FEATURES[saved.length] || { icon: "solar", label: "Feature", value: "" });
      }
      return saved.slice(0, 4);
    }
    return [
      { icon: "bed", label: "Bedrooms", value: initialData.beds?.toString() || "" },
      { icon: "bath", label: "Bathrooms", value: initialData.baths?.toString() || "" },
      { icon: "garage", label: "Parking", value: "" },
      { icon: "solar", label: "Solar", value: "" },
    ];
  };

  const [flyerFeatures, setFlyerFeatures] = useState<FlyerFeature[]>(initFlyerFeatures);

  const [photoUrl, setPhotoUrl] = useState(initialData.property_photo_url || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const updateFlyerFeature = (index: number, field: keyof FlyerFeature, value: string) => {
    setFlyerFeatures((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`/api/open-houses/${eventId}/photo`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPhotoUrl(data.url);
        setPhotoFile(null);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error uploading photo: ${error.error || "Failed to upload"}`);
      }
    } catch (error) {
      alert("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    setUploadingPhoto(true);
    try {
      const response = await fetch(`/api/open-houses/${eventId}/photo`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPhotoUrl("");
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error deleting photo: ${error.error || "Failed to delete"}`);
      }
    } catch (error) {
      alert("Failed to delete photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/open-houses/${eventId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beds: beds ? parseInt(beds) : null,
          baths: baths ? parseFloat(baths) : null,
          sqft: sqft ? parseInt(sqft) : null,
          price: price ? parseFloat(price) : null,
          listing_description: description || null,
          key_features: features
            ? features.split("\n").filter((f) => f.trim())
            : null,
          flyer_description: flyerDescription || null,
          flyer_features: flyerFeatures.filter((f) => f.value.trim()),
        }),
      });

      if (response.ok) {
        router.push(`/app/open-houses/${eventId}`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to save"}`);
      }
    } catch (error) {
      alert("Failed to save property details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Property Specifications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="beds">Bedrooms</Label>
            <Input
              id="beds"
              type="number"
              min="0"
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
              placeholder="3"
            />
          </div>
          <div>
            <Label htmlFor="baths">Bathrooms</Label>
            <Input
              id="baths"
              type="number"
              min="0"
              step="0.5"
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
              placeholder="2.5"
            />
          </div>
          <div>
            <Label htmlFor="sqft">Square Feet</Label>
            <Input
              id="sqft"
              type="number"
              min="0"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              placeholder="2000"
            />
          </div>
          <div>
            <Label htmlFor="price">List Price ($)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              max="999999999"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="500000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter price without commas (e.g., 1250000 for $1,250,000)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Property Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {photoUrl ? (
            <div className="space-y-3">
              <div className="relative w-full max-w-md">
                <Image
                  src={photoUrl}
                  alt="Property photo"
                  width={600}
                  height={400}
                  className="rounded-lg object-cover w-full"
                />
              </div>
              <Button
                type="button"
                variant="danger"
                onClick={handlePhotoDelete}
                disabled={uploadingPhoto}
                size="sm"
              >
                {uploadingPhoto ? "Deleting..." : "Delete Photo"}
              </Button>
            </div>
          ) : (
            <div>
              <Input
                id="photo"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handlePhotoUpload(file);
                  }
                }}
                disabled={uploadingPhoto}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Upload a high-quality photo of the property. Maximum size: 5MB. Formats: JPEG, PNG, WebP.
              </p>
              {uploadingPhoto && (
                <p className="text-sm text-blue-600 mt-2">Uploading photo...</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full Description</CardTitle>
          <CardDescription>
            Detailed property description for your records. This will not appear on the flyer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter the full, detailed description of the property..."
            className="min-h-32"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flyer Description</CardTitle>
          <CardDescription>
            A short, compelling description that will appear on the printed flyer. Keep it brief.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={flyerDescription}
            onChange={(e) => setFlyerDescription(e.target.value)}
            placeholder="Charming 3-bed home with modern upgrades, open floor plan, and a spacious backyard perfect for entertaining."
            className="min-h-20"
            maxLength={300}
          />
          <p className="text-sm text-muted-foreground mt-2">
            {flyerDescription.length}/300 characters
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full Feature List</CardTitle>
          <CardDescription>
            Complete list of property features for your records. These will not appear on the flyer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="Enter one feature per line:&#10;Hardwood floors&#10;Granite countertops&#10;Walk-in closet&#10;Mountain views"
            className="min-h-32 font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Enter one feature per line.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flyer Feature Highlights</CardTitle>
          <CardDescription>
            Up to 4 key features displayed as icons on the flyer. Bedrooms, bathrooms, and parking are standard — customize the 4th.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flyerFeatures.map((feat, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-shrink-0 w-8 text-center text-lg">
                {feat.icon === "bed" && "🛏️"}
                {feat.icon === "bath" && "🛁"}
                {feat.icon === "garage" && "🚗"}
                {feat.icon === "solar" && "☀️"}
                {feat.icon === "sqft" && "📐"}
              </div>
              <div className="flex-1 grid gap-2 md:grid-cols-3">
                {i < 3 ? (
                  <div className="md:col-span-1">
                    <Label className="text-xs text-muted-foreground">Feature</Label>
                    <p className="text-sm font-medium mt-1">{feat.label}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Icon</Label>
                      <select
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={feat.icon}
                        onChange={(e) => updateFlyerFeature(i, "icon", e.target.value)}
                      >
                        {FEATURE_ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <Input
                        value={feat.label}
                        onChange={(e) => updateFlyerFeature(i, "label", e.target.value)}
                        placeholder="e.g. Solar"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
                <div className={i < 3 ? "md:col-span-2" : ""}>
                  <Label className="text-xs text-muted-foreground">Value</Label>
                  <Input
                    value={feat.value}
                    onChange={(e) => updateFlyerFeature(i, "value", e.target.value)}
                    placeholder={
                      i === 0
                        ? "e.g. 3"
                        : i === 1
                        ? "e.g. 2.5"
                        : i === 2
                        ? "e.g. 2-Car Garage"
                        : "e.g. Yes"
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Property Details"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/app/open-houses/${eventId}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
