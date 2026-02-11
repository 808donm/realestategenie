"use client";

import { useState } from "react";
import IntakeForm from "./intake-form.client";
import RentalApplicationForm from "./rental-application-form.client";

type EventType = "sales" | "rental" | "both";

export default function CheckInWrapper({
  eventId,
  eventType,
  pmPropertyId,
  agentName,
  brokerageName,
  accessToken,
}: {
  eventId: string;
  eventType: EventType;
  pmPropertyId: string | null;
  agentName?: string;
  brokerageName?: string;
  accessToken: string;
}) {
  const [userChoice, setUserChoice] = useState<"sales" | "rental" | null>(null);

  // For "rental" events, always show rental application form
  if (eventType === "rental") {
    return <RentalApplicationForm eventId={eventId} pmPropertyId={pmPropertyId} accessToken={accessToken} />;
  }

  // For "sales" events, always show traditional intake form
  if (eventType === "sales") {
    return <IntakeForm eventId={eventId} agentName={agentName} brokerageName={brokerageName} accessToken={accessToken} />;
  }

  // For "both" events, let user choose
  if (eventType === "both") {
    if (!userChoice) {
      return (
        <div style={{ marginTop: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
            What brings you here today?
          </h2>
          <p style={{ opacity: 0.75, marginTop: 0, marginBottom: 20 }}>
            Please select whether you're interested in buying or renting this property.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            <button
              onClick={() => setUserChoice("sales")}
              style={{
                padding: "16px 24px",
                background: "#4f46e5",
                color: "white",
                borderRadius: 12,
                border: "none",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>I'm interested in buying</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                Complete a quick check-in form
              </div>
            </button>

            <button
              onClick={() => setUserChoice("rental")}
              style={{
                padding: "16px 24px",
                background: "#059669",
                color: "white",
                borderRadius: 12,
                border: "none",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>I'm interested in renting</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                Submit a rental application
              </div>
            </button>
          </div>
        </div>
      );
    }

    // User has made a choice, show appropriate form
    if (userChoice === "rental") {
      return (
        <div>
          <button
            onClick={() => setUserChoice(null)}
            style={{
              marginBottom: 12,
              padding: "8px 16px",
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ← Back to selection
          </button>
          <RentalApplicationForm eventId={eventId} pmPropertyId={pmPropertyId} accessToken={accessToken} />
        </div>
      );
    }

    return (
      <div>
        <button
          onClick={() => setUserChoice(null)}
          style={{
            marginBottom: 12,
            padding: "8px 16px",
            background: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ← Back to selection
        </button>
        <IntakeForm eventId={eventId} agentName={agentName} brokerageName={brokerageName} accessToken={accessToken} />
      </div>
    );
  }

  // Fallback to sales form
  return <IntakeForm eventId={eventId} agentName={agentName} brokerageName={brokerageName} accessToken={accessToken} />;
}
