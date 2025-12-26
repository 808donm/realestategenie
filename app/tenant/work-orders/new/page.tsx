"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Upload, X } from "lucide-react";

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    priority: "normal",
    location: "",
    tenant_availability: "",
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file count
    if (photos.length + files.length > 5) {
      setError("Maximum 5 photos allowed");
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image files must be under 5MB");
        return false;
      }
      return true;
    });

    setPhotos([...photos, ...validFiles]);
    setError("");
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Upload photos first
      const photoUrls: string[] = [];

      for (const photo of photos) {
        const photoFormData = new FormData();
        photoFormData.append("file", photo);

        const uploadResponse = await fetch("/api/tenant/work-orders/upload-photo", {
          method: "POST",
          body: photoFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload photo");
        }

        const { url } = await uploadResponse.json();
        photoUrls.push(url);
      }

      // Submit work order
      const response = await fetch("/api/tenant/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          photos: photoUrls,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit work order");
        return;
      }

      // Success! Redirect to work order detail
      router.push(`/tenant/work-orders/${data.id}`);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/tenant/dashboard">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Submit Maintenance Request</h1>
              <p className="text-muted-foreground text-sm">
                Report an issue with your rental unit
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Issue Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Leaky faucet in kitchen"
                  required
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details about the issue..."
                  rows={5}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Please include as much detail as possible
                </p>
              </div>

              {/* Category and Priority */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded-md px-3 py-2"
                    disabled={loading}
                  >
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="hvac">HVAC (Heating/Cooling)</option>
                    <option value="appliance">Appliance</option>
                    <option value="structural">Structural</option>
                    <option value="pest">Pest Control</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border rounded-md px-3 py-2"
                    disabled={loading}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Emergency: No heat, water, or security issue
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location in Unit</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Master bathroom, Kitchen"
                  disabled={loading}
                />
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <Label htmlFor="availability">Your Availability</Label>
                <Textarea
                  id="availability"
                  value={formData.tenant_availability}
                  onChange={(e) =>
                    setFormData({ ...formData, tenant_availability: e.target.value })
                  }
                  placeholder="e.g., Weekdays after 5pm, Weekends anytime"
                  rows={2}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Let us know when you're available for repairs
                </p>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>Photos (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload photos of the issue (up to 5 photos, max 5MB each)
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="photo-upload"
                      disabled={loading || photos.length >= 5}
                    />
                    <label htmlFor="photo-upload">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loading || photos.length >= 5}
                        onClick={() => document.getElementById("photo-upload")?.click()}
                      >
                        Select Photos
                      </Button>
                    </label>
                  </div>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Submitting..." : "Submit Request"}
                </Button>
                <Link href="/tenant/dashboard">
                  <Button type="button" variant="outline" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
