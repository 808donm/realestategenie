"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, FileText, FileImage } from "lucide-react";

interface NeighborhoodProfile {
  id: string;
  neighborhood_name: string;
  address: string;
  city: string;
  state_province: string;
  profile_data: {
    lifestyleVibe: string;
    locationNarrative: string;
    amenitiesList: {
      parks: string[];
      shopping: string[];
      dining: string[];
      schools: string[];
    };
    marketData?: {
      medianPrice?: string;
      daysOnMarket?: number;
      activeInventory?: number;
      pricePerSqFt?: string;
    };
  };
}

interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: NeighborhoodProfile;
}

export default function ProfilePreviewModal({
  isOpen,
  onClose,
  profile,
}: ProfilePreviewModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"pdf" | "docx" | null>(null);

  const handleDownload = async (format: "pdf" | "docx") => {
    setDownloading(true);
    setDownloadFormat(format);

    try {
      const response = await fetch("/api/neighborhood-profiles/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to download profile");
      }

      // Get the blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${profile.neighborhood_name.replace(/[^a-zA-Z0-9]/g, "_")}_Profile.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Download error:", err);
      alert("Failed to download profile. Please try again.");
    } finally {
      setDownloading(false);
      setDownloadFormat(null);
    }
  };

  const { profile_data } = profile;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {profile.neighborhood_name}
          </DialogTitle>
          <DialogDescription>
            {profile.city}, {profile.state_province}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section 1: Lifestyle & Vibe */}
          <div>
            <h3 className="text-lg font-semibold mb-2">1. The Lifestyle & Vibe</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {profile_data.lifestyleVibe}
            </p>
          </div>

          {/* Section 2: Location Intelligence */}
          <div>
            <h3 className="text-lg font-semibold mb-2">2. Location Intelligence</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {profile_data.locationNarrative}
            </p>
          </div>

          {/* Section 3: Market Pulse (if available) */}
          {profile_data.marketData && (
            <div>
              <h3 className="text-lg font-semibold mb-2">3. Market Pulse</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {profile_data.marketData.medianPrice && (
                  <div>
                    <span className="font-medium">Median List Price:</span>{" "}
                    {profile_data.marketData.medianPrice}
                  </div>
                )}
                {profile_data.marketData.daysOnMarket && (
                  <div>
                    <span className="font-medium">Avg. Days on Market:</span>{" "}
                    {profile_data.marketData.daysOnMarket}
                  </div>
                )}
                {profile_data.marketData.activeInventory && (
                  <div>
                    <span className="font-medium">Active Inventory:</span>{" "}
                    {profile_data.marketData.activeInventory} units
                  </div>
                )}
                {profile_data.marketData.pricePerSqFt && (
                  <div>
                    <span className="font-medium">Price per Sq. Ft.:</span>{" "}
                    {profile_data.marketData.pricePerSqFt}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Community Resources */}
          <div>
            <h3 className="text-lg font-semibold mb-2">4. Community Resources</h3>

            <div className="mb-3">
              <h4 className="text-sm font-semibold mb-1">🎓 Schools & Education</h4>
              <p className="text-xs text-muted-foreground mb-2">
                For detailed performance metrics, please visit the official district links.
              </p>
              {profile_data.amenitiesList.schools.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {profile_data.amenitiesList.schools.map((school, idx) => (
                    <li key={idx}>{school}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">No schools listed</p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-1">👮 Safety & Community Services</h4>
              <p className="text-xs text-muted-foreground">
                Crime and safety are subjective. Please review official statistics from local law enforcement.
              </p>
            </div>
          </div>

          {/* Section 5: Local Amenities */}
          <div>
            <h3 className="text-lg font-semibold mb-2">5. Local Amenities</h3>

            {profile_data.amenitiesList.parks.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">Parks:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {profile_data.amenitiesList.parks.map((park, idx) => (
                    <li key={idx}>{park}</li>
                  ))}
                </ul>
              </div>
            )}

            {profile_data.amenitiesList.shopping.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">Shopping:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {profile_data.amenitiesList.shopping.map((shop, idx) => (
                    <li key={idx}>{shop}</li>
                  ))}
                </ul>
              </div>
            )}

            {profile_data.amenitiesList.dining.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold mb-1">Dining:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {profile_data.amenitiesList.dining.map((restaurant, idx) => (
                    <li key={idx}>{restaurant}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              <strong>DISCLAIMER:</strong> Information obtained from third-party sources has not been verified.
              No warranty is made regarding accuracy. Prospective buyers should conduct independent verification.
              Complies with Fair Housing Act principles.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={downloading}>
            Close
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleDownload("docx")}
            disabled={downloading}
          >
            {downloading && downloadFormat === "docx" ? (
              "Downloading..."
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Download Word
              </>
            )}
          </Button>
          <Button
            onClick={() => handleDownload("pdf")}
            disabled={downloading}
          >
            {downloading && downloadFormat === "pdf" ? (
              "Downloading..."
            ) : (
              <>
                <FileImage className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
