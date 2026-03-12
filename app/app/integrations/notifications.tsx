"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function IntegrationsNotifications() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    if (success === "ghl_connected") {
      toast.success("LeadConnector Connected!", {
        description: "Your LeadConnector integration is now active. Leads will be synced automatically.",
      });
      // Clean up URL
      router.replace("/app/integrations");
    } else if (error) {
      let errorMessage = "An unexpected error occurred";

      switch (error) {
        case "ghl_oauth_failed":
          errorMessage = message || "OAuth authorization failed";
          break;
        case "ghl_no_code":
          errorMessage = "No authorization code received from LeadConnector";
          break;
        case "ghl_token_exchange_failed":
          errorMessage = "Failed to exchange authorization code for access token";
          break;
        case "ghl_save_failed":
          errorMessage = "Failed to save LeadConnector credentials";
          break;
        case "unauthorized":
          errorMessage = "You must be logged in to connect integrations";
          break;
        case "ghl_unexpected_error":
          errorMessage = "An unexpected error occurred during LeadConnector OAuth";
          break;
      }

      toast.error("LeadConnector Connection Failed", {
        description: errorMessage,
        duration: 6000,
      });
      // Clean up URL
      router.replace("/app/integrations");
    }
  }, [searchParams, router]);

  return null;
}
