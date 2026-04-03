"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  agentId: string;
  agentName: string;
  agentPhoto: string | null;
  agentPhone: string | null;
  agentEmail: string;
  brokerageName: string | null;
  logoUrl: string | null;
}

interface Message {
  role: "assistant" | "visitor";
  content: string;
}

export default function ChatWidget({ agentId, agentName, agentPhoto, agentPhone, agentEmail, brokerageName, logoUrl }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start conversation on first load
  const startConversation = async () => {
    setStarted(true);
    setLoading(true);
    try {
      const res = await fetch("/api/web-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([{ role: "assistant", content: data.reply }]);
        setSessionId(data.sessionId);
      }
    } catch {
      setMessages([{ role: "assistant", content: `Hi! I'm Hoku, ${agentName}'s AI assistant. How can I help you today?` }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "visitor", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/web-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, sessionId, message: msg }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (data.sessionId) setSessionId(data.sessionId);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm sorry, I had trouble processing that. Could you try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  if (!started) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ maxWidth: 400, textAlign: "center", padding: 32 }}>
          {/* Agent branding */}
          {agentPhoto && (
            <img src={agentPhoto} alt={agentName} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", display: "block", border: "3px solid #e5e7eb" }} />
          )}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>{agentName}</h1>
          {brokerageName && <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 4px" }}>{brokerageName}</p>}
          {agentPhone && <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{agentPhone}</p>}

          <div style={{ margin: "24px 0", padding: "20px", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
              Chat with Hoku
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: "0 0 16px" }}>
              I'm {agentName}'s AI assistant. I can help you find properties, answer questions about the market, and connect you with {agentName}.
            </p>
            <button
              onClick={startConversation}
              style={{
                padding: "12px 32px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                background: "#1e40af",
                color: "#fff",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Start Chat
            </button>
          </div>

          {logoUrl && (
            <img src={logoUrl} alt={brokerageName || "Brokerage"} style={{ height: 32, opacity: 0.6, margin: "0 auto", display: "block" }} />
          )}
          <p style={{ fontSize: 10, color: "#d1d5db", marginTop: 12 }}>Powered by Real Estate Genie</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {agentPhoto && (
          <img src={agentPhoto} alt={agentName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
        )}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Hoku - {agentName}'s Assistant</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{brokerageName || "Real Estate Professional"}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "visitor" ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 14px",
                borderRadius: msg.role === "visitor" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "visitor" ? "#1e40af" : "#f3f4f6",
                color: msg.role === "visitor" ? "#fff" : "#111827",
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: "#f3f4f6", color: "#9ca3af", fontSize: 14 }}>
              Hoku is typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: loading || !input.trim() ? "#d1d5db" : "#1e40af",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          Send
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: "6px 16px", textAlign: "center", fontSize: 10, color: "#d1d5db", borderTop: "1px solid #f3f4f6" }}>
        Powered by Real Estate Genie
      </div>
    </div>
  );
}
