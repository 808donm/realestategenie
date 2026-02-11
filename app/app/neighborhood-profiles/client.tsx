"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, MapPin, Calendar, Download, Eye } from "lucide-react";
import GenerateProfileModal from "./generate-modal";
import ProfilePreviewModal from "./profile-preview-modal";

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
  created_at: string;
  download_count: number;
}

export default function NeighborhoodProfilesClient() {
  const [profiles, setProfiles] = useState<NeighborhoodProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<NeighborhoodProfile | null>(null);

  const fetchProfiles = async () => {
    try {
      const response = await fetch("/api/neighborhood-profiles/list");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch profiles");
      }

      setProfiles(data.profiles || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleGenerateSuccess = (profileId: string) => {
    // Refresh the list
    fetchProfiles();
    // Show success message
    alert("Neighborhood profile generated successfully!");
  };

  const handleDownloadPDF = async (profileId: string, neighborhoodName: string) => {
    try {
      const response = await fetch("/api/neighborhood-profiles/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, format: "pdf" }),
      });

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${neighborhoodName.replace(/[^a-zA-Z0-9]/g, "_")}_Profile.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Refresh to update download count
      fetchProfiles();
    } catch (err: any) {
      console.error("Download error:", err);
      alert("Failed to download PDF. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Button onClick={() => setGenerateModalOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Generate New Profile
        </Button>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven't generated any neighborhood profiles yet.
            </p>
            <Button onClick={() => setGenerateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{profile.neighborhood_name}</CardTitle>
                <CardDescription className="flex items-start gap-1">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {profile.city}, {profile.state_province}
                  </span>
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {profile.profile_data.lifestyleVibe}
                </p>

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {profile.download_count || 0} downloads
                  </div>
                </div>
              </CardContent>

              <CardFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewProfile(profile)}
                  className="flex-1"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDownloadPDF(profile.id, profile.neighborhood_name)}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      <GenerateProfileModal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        onSuccess={handleGenerateSuccess}
      />

      {/* Preview Modal */}
      {previewProfile && (
        <ProfilePreviewModal
          isOpen={!!previewProfile}
          onClose={() => setPreviewProfile(null)}
          profile={previewProfile}
        />
      )}
    </>
  );
}
