"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function IntegrationsNotifications() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorBanner, setErrorBanner] = useState<{ title: string; message: string } | null>(null);

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
          errorMessage = message || "Invalid security state. Please try connecting again.";
          break;
        case "microsoft_token_failed":
          errorTitle = "Microsoft Calendar";
          errorMessage = message || "Failed to exchange authorization code. Please try again.";
          break;
        case "microsoft_oauth_failed":
          errorTitle = "Microsoft Calendar";
          errorMessage = message || "An unexpected error occurred during Microsoft OAuth";
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
        duration: 15000,
      });
      setErrorBanner({ title: errorTitle, message: errorMessage });
      router.replace("/app/integrations");
    }
  }, [searchParams, router]);

  if (errorBanner) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">{errorBanner.title}</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{errorBanner.message}</p>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-red-500 hover:text-red-700 text-sm">
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
}
