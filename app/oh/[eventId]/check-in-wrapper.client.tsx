"use client";

import IntakeForm from "./intake-form.client";

export default function CheckInWrapper({
  eventId,
  agentName,
  brokerageName,
  accessToken,
}: {
  eventId: string;
  eventType?: string;
  pmPropertyId?: string | null;
  agentName?: string;
  brokerageName?: string;
  accessToken: string;
}) {
  return <IntakeForm eventId={eventId} agentName={agentName} brokerageName={brokerageName} accessToken={accessToken} />;
}
