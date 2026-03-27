"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  agentId: string;
  agentName?: string;
  primaryColor?: string;
  greeting?: string;
  apiUrl?: string;
}

export default function ChatWidget({
  agentId,
  agentName = "us",
  primaryColor = "#6366f1",
  greeting,
  apiUrl,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const baseUrl = apiUrl || "";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Show greeting when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greetingMessage =
        greeting ||
        `Hi there! 👋 I'm ${agentName}'s assistant. Whether you're looking to buy, sell, or just have questions about real estate — I'm here to help. What brings you here today?`;
      setMessages([{ role: "assistant", content: greetingMessage }]);
    }
  }, [isOpen, messages.length, agentName, greeting]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${baseUrl}/api/public/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          sessionId,
          message: text,
        }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .reg-chat-widget * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        .reg-chat-widget {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999;
        }
        .reg-chat-toggle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .reg-chat-toggle:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        }
        .reg-chat-window {
          position: absolute;
          bottom: 72px;
          right: 0;
          width: 380px;
          max-width: calc(100vw - 32px);
          height: 520px;
          max-height: calc(100vh - 120px);
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: reg-slide-up 0.25s ease-out;
        }
        @keyframes reg-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reg-chat-header {
          padding: 16px 20px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .reg-chat-header-title {
          font-size: 16px;
          font-weight: 600;
        }
        .reg-chat-header-sub {
          font-size: 12px;
          opacity: 0.85;
          margin-top: 2px;
        }
        .reg-chat-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: #fff;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .reg-chat-close:hover {
          background: rgba(255,255,255,0.3);
        }
        .reg-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .reg-chat-msg {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.45;
          word-wrap: break-word;
        }
        .reg-chat-msg-user {
          align-self: flex-end;
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .reg-chat-msg-assistant {
          align-self: flex-start;
          background: #f3f4f6;
          color: #1f2937;
          border-bottom-left-radius: 4px;
        }
        .reg-chat-typing {
          align-self: flex-start;
          background: #f3f4f6;
          padding: 12px 18px;
          border-radius: 16px;
          border-bottom-left-radius: 4px;
          display: flex;
          gap: 4px;
        }
        .reg-chat-dot {
          width: 6px;
          height: 6px;
          background: #9ca3af;
          border-radius: 50%;
          animation: reg-bounce 1.2s infinite;
        }
        .reg-chat-dot:nth-child(2) { animation-delay: 0.15s; }
        .reg-chat-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes reg-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        .reg-chat-input-area {
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
        }
        .reg-chat-input {
          flex: 1;
          border: 1px solid #d1d5db;
          border-radius: 24px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .reg-chat-input:focus {
          border-color: ${primaryColor};
        }
        .reg-chat-send {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .reg-chat-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .reg-chat-powered {
          text-align: center;
          padding: 6px;
          font-size: 11px;
          color: #9ca3af;
        }
      `}</style>

      <div className="reg-chat-widget">
        {isOpen && (
          <div className="reg-chat-window">
            <div className="reg-chat-header" style={{ background: primaryColor }}>
              <div>
                <div className="reg-chat-header-title">Chat with {agentName}</div>
                <div className="reg-chat-header-sub">Typically replies instantly</div>
              </div>
              <button className="reg-chat-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
                ✕
              </button>
            </div>

            <div className="reg-chat-messages">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`reg-chat-msg ${msg.role === "user" ? "reg-chat-msg-user" : "reg-chat-msg-assistant"}`}
                  style={msg.role === "user" ? { background: primaryColor } : undefined}
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="reg-chat-typing">
                  <div className="reg-chat-dot" />
                  <div className="reg-chat-dot" />
                  <div className="reg-chat-dot" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="reg-chat-input-area" onSubmit={sendMessage}>
              <input
                ref={inputRef}
                className="reg-chat-input"
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="reg-chat-send"
                style={{ background: primaryColor }}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>

            <div className="reg-chat-powered">Powered by Real Estate Genie</div>
          </div>
        )}

        <button
          className="reg-chat-toggle"
          style={{ background: primaryColor }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          {isOpen ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
