"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

type PropertyDetailsFormProps = {
  eventId: string;
  initialData: {
    beds?: number | null;
    baths?: number | null;
    sqft?: number | null;
    price?: number | null;
    listing_description?: string | null;
    key_features?: string[] | null;
    property_photo_url?: string | null;
  };
};

export default function PropertyDetailsForm({ eventId, initialData }: PropertyDetailsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [beds, setBeds] = useState(initialData.beds?.toString() || "");
  const [baths, setBaths] = useState(initialData.baths?.toString() || "");
  const [sqft, setSqft] = useState(initialData.sqft?.toString() || "");
  const [price, setPrice] = useState(initialData.price?.toString() || "");
  const [description, setDescription] = useState(initialData.listing_description || "");
  const [features, setFeatures] = useState(
    initialData.key_features?.join("\n") || ""
  );
  const [photoUrl, setPhotoUrl] = useState(initialData.property_photo_url || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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
              step="1000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="500000"
            />
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
                variant="destructive"
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
          <CardTitle>Property Description</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a detailed description of the property..."
            className="min-h-32"
          />
          <p className="text-sm text-muted-foreground mt-2">
            This will appear on the flyer and property details page
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="Enter one feature per line:&#10;Hardwood floors&#10;Granite countertops&#10;Walk-in closet&#10;Mountain views"
            className="min-h-32 font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Enter one feature per line. These will appear as bullet points on the flyer.
          </p>
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
