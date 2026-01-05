"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle } from "lucide-react";

type CustomLeaseUploadProps = {
  onUploadComplete: (url: string) => void;
};

export default function CustomLeaseUpload({
  onUploadComplete,
}: CustomLeaseUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pm/leases/upload-lease", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { url } = await response.json();
      setUploadedFile(file.name);
      onUploadComplete(url);
    } catch (err) {
      setError("Error uploading file. Please try again.");
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        {!uploadedFile ? (
          <div className="space-y-3">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <label htmlFor="lease-upload" className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => document.getElementById("lease-upload")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload PDF"}
                </Button>
                <input
                  id="lease-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              PDF only, max 10MB
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <CheckCircle className="h-12 w-12 mx-auto text-success" />
            <div>
              <div className="font-semibold">{uploadedFile}</div>
              <p className="text-sm text-muted-foreground">
                Lease document uploaded successfully
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setUploadedFile(null);
                onUploadComplete("");
              }}
            >
              Change File
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
    </div>
  );
}
