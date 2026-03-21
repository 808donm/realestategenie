"use client";

import { useState } from "react";

type Props = {
  userId: string;
  storedConfig?: {
    api_url?: string;
    auth_method?: string;
    client_id?: string;
    username?: string;
    connected_at?: string;
    total_listings?: number;
  } | null;
  isConnected: boolean;
};

export default function AdminTrestleForm({ userId, storedConfig, isConnected }: Props) {
  const [authMethod, setAuthMethod] = useState<"basic" | "oauth2">(
    (storedConfig?.auth_method as "basic" | "oauth2") || "oauth2"
  );
  const [apiUrl, setApiUrl] = useState(storedConfig?.api_url || "https://api.cotality.com/trestle/odata");
  const [username, setUsername] = useState(storedConfig?.username || "");
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState(storedConfig?.client_id || "");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/integrations/trestle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_method: authMethod,
          api_url: apiUrl,
          ...(authMethod === "basic" ? { username, password } : { client_id: clientId, client_secret: clientSecret }),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Connected! ${data.totalListings ? `${data.totalListings.toLocaleString()} listings accessible.` : ""}` });
        setPassword("");
        setClientSecret("");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to connect" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to connect" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/integrations/trestle/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Request failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Trestle for this user?")) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/admin/users/${userId}/integrations/trestle`, { method: "DELETE" });
      setMessage({ type: "success", text: "Disconnected" });
    } catch {
      setMessage({ type: "error", text: "Failed to disconnect" });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      {isConnected && storedConfig && (
        <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <p style={{ fontWeight: 600, color: "#065f46", margin: "0 0 8px" }}>Currently Connected</p>
          <p style={{ fontSize: 13, color: "#047857", margin: "2px 0" }}>API URL: {storedConfig.api_url}</p>
          <p style={{ fontSize: 13, color: "#047857", margin: "2px 0" }}>
            Auth: {storedConfig.auth_method === "oauth2" ? `OAuth2 — Client ID: ${storedConfig.client_id}` : `Basic — ${storedConfig.username}`}
          </p>
          {storedConfig.connected_at && (
            <p style={{ fontSize: 13, color: "#047857", margin: "2px 0" }}>
              Connected: {new Date(storedConfig.connected_at).toLocaleDateString()}
            </p>
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: "#0891b2", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
          {testResult && (
            <div style={{ marginTop: 10, padding: 10, background: testResult.success ? "#d1fae5" : "#fee2e2", borderRadius: 6, fontSize: 13 }}>
              <strong>{testResult.success ? "✓ Connected" : "✗ Failed"}:</strong> {testResult.message}
              {testResult.data?.totalListings !== undefined && (
                <span> — {testResult.data.totalListings.toLocaleString()} listings</span>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Auth Method</label>
          <select
            value={authMethod}
            onChange={(e) => setAuthMethod(e.target.value as "basic" | "oauth2")}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
          >
            <option value="oauth2">OAuth2 Credentials (client_id + client_secret)</option>
            <option value="basic">Username & Password</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>WebAPI URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
            placeholder="https://api.cotality.com/trestle/odata"
          />
        </div>

        {authMethod === "oauth2" ? (
          <>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                placeholder={storedConfig?.client_id ? `Current: ${storedConfig.client_id}` : "trestle_..."}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
                Client Secret {isConnected && <span style={{ fontWeight: 400, color: "#6b7280" }}>(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                placeholder={isConnected ? "••••••••" : "Enter client secret"}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
                Password {isConnected && <span style={{ fontWeight: 400, color: "#6b7280" }}>(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                placeholder={isConnected ? "••••••••" : "Enter password"}
              />
            </div>
          </>
        )}

        {message && (
          <div style={{ padding: 12, borderRadius: 6, background: message.type === "success" ? "#d1fae5" : "#fee2e2", color: message.type === "success" ? "#065f46" : "#991b1b", fontSize: 14 }}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{ padding: "10px 20px", fontWeight: 700, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
        >
          {saving ? "Connecting..." : isConnected ? "Update Connection" : "Connect Trestle"}
        </button>
      </form>
    </div>
  );
}
