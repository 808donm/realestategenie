"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Loader2, Paperclip, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface MessageComposerProps {
  leaseId: string;
  agentId: string;
  agentName: string;
}

export default function MessageComposer({
  leaseId,
  agentId,
  agentName,
}: MessageComposerProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file count (max 5 attachments)
    if (attachments.length + files.length > 5) {
      setError("Maximum 5 attachments allowed");
      return;
    }

    // Validate file sizes (max 10MB each)
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });

    setAttachments([...attachments, ...validFiles]);
    setError("");
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Upload attachments first if any
      let uploadedAttachments: any[] = [];

      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file) => {
          formData.append("files", file);
        });

        const uploadRes = await fetch("/api/tenant/messages/upload-attachments", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload attachments");
        }

        const uploadData = await uploadRes.json();
        uploadedAttachments = uploadData.attachments;
      }

      // Send message
      const res = await fetch("/api/tenant/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lease_id: leaseId,
          to_user_id: agentId,
          message: message.trim(),
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }

      setSuccess("Message sent successfully!");
      setMessage("");
      setAttachments([]);

      // Refresh the page to show new message
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          To: {agentName}
        </label>
        <Textarea
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          disabled={isSubmitting}
          className="resize-none"
        />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Attachments:</label>
          <div className="space-y-1">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-muted p-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(idx)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <input
            type="file"
            id="attachment-input"
            className="hidden"
            onChange={handleFileSelect}
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            disabled={isSubmitting || attachments.length >= 5}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("attachment-input")?.click()}
            disabled={isSubmitting || attachments.length >= 5}
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Attach Files ({attachments.length}/5)
          </Button>
        </div>
        <Button type="submit" disabled={isSubmitting || !message.trim()}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
