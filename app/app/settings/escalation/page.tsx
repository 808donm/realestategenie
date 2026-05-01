import EscalationRulesClient from "./escalation-rules.client";

export default function EscalationPage() {
  return (
    <div style={{ padding: "24px 0" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Escalation Rules</h1>
      <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", marginBottom: 24 }}>
        Define rules to automatically escalate leads based on intent signals, sentiment, and engagement patterns.
      </p>
      <EscalationRulesClient />
    </div>
  );
}
