import AutoResponseSettings from "./auto-response-settings";

export default function AutoResponsePage() {
  return (
    <div style={{ padding: "24px 0" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>AI Auto-Response Settings</h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        Configure 24/7 AI-powered auto-responses for inbound SMS and email messages.
      </p>
      <AutoResponseSettings />
    </div>
  );
}
