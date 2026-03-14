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
      toast.success("CRM Connected!", {
        description: "Your CRM integration is now active. Leads will be synced automatically.",
      });
      router.replace("/app/integrations");
    } else if (success === "microsoft_calendar_connected") {
      toast.success("Microsoft Calendar Connected!", {
        description: "Two-way calendar sync is now active.",
      });
      router.replace("/app/integrations");
    } else if (success === "google_calendar_connected") {
      toast.success("Google Calendar Connected!", {
        description: "Two-way calendar sync is now active.",
      });
      router.replace("/app/integrations");
    } else if (error) {
      let errorTitle = "Connection Failed";
      let errorMessage = "An unexpected error occurred";

      switch (error) {
        case "ghl_oauth_failed":
          errorTitle = "CRM Connection Failed";
          errorMessage = message || "OAuth authorization failed";
          break;
        case "ghl_no_code":
          errorTitle = "CRM Connection Failed";
          errorMessage = "No authorization code received from CRM";
          break;
        case "ghl_token_exchange_failed":
          errorTitle = "CRM Connection Failed";
          errorMessage = "Failed to exchange authorization code for access token";
          break;
        case "ghl_save_failed":
          errorTitle = "CRM Connection Failed";
          errorMessage = "Failed to save CRM credentials";
          break;
        case "unauthorized":
        case "not_authenticated":
          errorMessage = "You must be logged in to connect integrations";
          break;
        case "ghl_unexpected_error":
          errorTitle = "CRM Connection Failed";
          errorMessage = "An unexpected error occurred during CRM OAuth";
          break;
        case "microsoft_oauth_denied":
          errorTitle = "Microsoft Calendar";
          errorMessage = "Authorization was denied. Please approve the required permissions.";
          break;
        case "microsoft_no_code":
          errorTitle = "Microsoft Calendar";
          errorMessage = "No authorization code received from Microsoft";
          break;
        case "microsoft_invalid_state":
          errorTitle = "Microsoft Calendar";
          errorMessage = "Invalid security state. Please try connecting again.";
          break;
        case "microsoft_token_failed":
          errorTitle = "Microsoft Calendar";
          errorMessage = "Failed to exchange authorization code. Please try again.";
          break;
        case "microsoft_oauth_failed":
          errorTitle = "Microsoft Calendar";
          errorMessage = "An unexpected error occurred during Microsoft OAuth";
          break;
        case "google_oauth_denied":
          errorTitle = "Google Calendar";
          errorMessage = "Authorization was denied. Please approve the required permissions.";
          break;
        case "google_no_code":
          errorTitle = "Google Calendar";
          errorMessage = "No authorization code received from Google";
          break;
        case "google_invalid_state":
          errorTitle = "Google Calendar";
          errorMessage = "Invalid security state. Please try connecting again.";
          break;
        case "google_token_failed":
          errorTitle = "Google Calendar";
          errorMessage = "Failed to exchange authorization code. Please try again.";
          break;
        case "google_oauth_failed":
          errorTitle = "Google Calendar";
          errorMessage = "An unexpected error occurred during Google OAuth";
          break;
      }

      toast.error(errorTitle, {
        description: errorMessage,
        duration: 6000,
      });
      router.replace("/app/integrations");
    }
  }, [searchParams, router]);

  return null;
}
