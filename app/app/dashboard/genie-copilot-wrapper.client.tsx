"use client";

import { useState } from "react";
import { GenieAssistant } from "./genie-assistant.client";
import { GenieCopilotPopup } from "@/components/genie-copilot-popup.client";

/**
 * Wraps GenieAssistant + GenieCopilotPopup together.
 * Manages the open/close state and actionContext pass-through.
 */
export function GenieCopilotWrapper() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotAction, setCopilotAction] = useState<string | null>(null);

  return (
    <>
      <GenieAssistant
        onOpenCopilot={(actionType) => {
          setCopilotAction(actionType);
          setCopilotOpen(true);
        }}
      />
      <GenieCopilotPopup
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        actionContext={copilotAction}
        onClearContext={() => setCopilotAction(null)}
      />
    </>
  );
}
