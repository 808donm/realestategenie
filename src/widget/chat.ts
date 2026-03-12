/**
 * Real Estate Genie — Embeddable Chat Widget
 *
 * Usage:
 *   <script src="https://app.realestategenie.app/widget/chat.js"
 *           data-agent-id="abc123"
 *           data-color="#667eea"
 *           data-position="right"
 *           data-greeting="Hi! How can I help?">
 *   </script>
 *
 * Uses Shadow DOM for CSS isolation. < 30KB gzipped.
 */

(function () {
  // ─── Configuration ──────────────────────────────────────────────────────────
  const script = document.currentScript as HTMLScriptElement;
  if (!script) return;

  const AGENT_ID = script.getAttribute("data-agent-id");
  if (!AGENT_ID) {
    console.error("[REG Chat] data-agent-id is required");
    return;
  }

  const PRIMARY_COLOR = script.getAttribute("data-color") || "#667eea";
  const POSITION = script.getAttribute("data-position") || "right";
  const API_BASE =
    script.getAttribute("data-api") ||
    new URL(script.src).origin;

  // ─── State ──────────────────────────────────────────────────────────────────
  let sessionToken: string | null = localStorage.getItem(`reg_chat_${AGENT_ID}`);
  let agentName = "";
  let greeting = "";
  let isOpen = false;
  let isLoading = false;
  let messages: { role: string; content: string }[] = [];

  // ─── Shadow DOM Container ───────────────────────────────────────────────────
  const host = document.createElement("div");
  host.id = "reg-chat-widget";
  const shadow = host.attachShadow({ mode: "closed" });
  document.body.appendChild(host);

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const styles = document.createElement("style");
  styles.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .reg-bubble {
      position: fixed;
      bottom: 20px;
      ${POSITION}: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 999999;
      transition: transform 0.2s, box-shadow 0.2s;
      border: none;
      font-size: 24px;
    }
    .reg-bubble:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }

    .reg-panel {
      position: fixed;
      bottom: 90px;
      ${POSITION}: 20px;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 520px;
      max-height: calc(100vh - 120px);
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      z-index: 999999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .reg-panel.open { display: flex; }

    .reg-header {
      background: ${PRIMARY_COLOR};
      color: #fff;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .reg-header-name {
      font-size: 15px;
      font-weight: 600;
      flex: 1;
    }
    .reg-header-sub {
      font-size: 12px;
      opacity: 0.85;
    }
    .reg-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      opacity: 0.8;
      padding: 4px;
    }
    .reg-close:hover { opacity: 1; }

    .reg-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .reg-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .reg-msg.ai {
      align-self: flex-start;
      background: #f3f4f6;
      color: #1f2937;
      border-bottom-left-radius: 4px;
    }
    .reg-msg.lead {
      align-self: flex-end;
      background: ${PRIMARY_COLOR};
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .reg-typing {
      align-self: flex-start;
      padding: 10px 14px;
      background: #f3f4f6;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      display: none;
    }
    .reg-typing.visible { display: flex; gap: 4px; }
    .reg-typing span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      animation: reg-bounce 1.4s infinite;
    }
    .reg-typing span:nth-child(2) { animation-delay: 0.2s; }
    .reg-typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes reg-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    .reg-input-area {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      gap: 8px;
    }
    .reg-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 24px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
    }
    .reg-input:focus { border-color: ${PRIMARY_COLOR}; }
    .reg-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .reg-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .reg-powered {
      text-align: center;
      padding: 6px;
      font-size: 10px;
      color: #9ca3af;
    }
    .reg-powered a {
      color: #6b7280;
      text-decoration: none;
    }
  `;
  shadow.appendChild(styles);

  // ─── HTML Structure ─────────────────────────────────────────────────────────
  const bubble = document.createElement("button");
  bubble.className = "reg-bubble";
  bubble.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  shadow.appendChild(bubble);

  const panel = document.createElement("div");
  panel.className = "reg-panel";
  panel.innerHTML = `
    <div class="reg-header">
      <div>
        <div class="reg-header-name"></div>
        <div class="reg-header-sub">AI Assistant</div>
      </div>
      <button class="reg-close">&times;</button>
    </div>
    <div class="reg-messages"></div>
    <div class="reg-typing"><span></span><span></span><span></span></div>
    <div class="reg-input-area">
      <input class="reg-input" placeholder="Type a message..." />
      <button class="reg-send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div class="reg-powered">Powered by Real Estate Genie</div>
  `;
  shadow.appendChild(panel);

  const msgContainer = panel.querySelector(".reg-messages") as HTMLElement;
  const typingIndicator = panel.querySelector(".reg-typing") as HTMLElement;
  const input = panel.querySelector(".reg-input") as HTMLInputElement;
  const sendBtn = panel.querySelector(".reg-send") as HTMLButtonElement;
  const closeBtn = panel.querySelector(".reg-close") as HTMLButtonElement;
  const headerName = panel.querySelector(".reg-header-name") as HTMLElement;

  // ─── Initialize ─────────────────────────────────────────────────────────────
  async function init() {
    try {
      // Identify: get agent info + session token
      const res = await fetch(`${API_BASE}/api/widget/identify?agentId=${AGENT_ID}`);
      const data = await res.json();

      agentName = data.agentName || "Agent";
      greeting = data.greeting;
      headerName.textContent = agentName;

      if (!data.enabled) {
        host.style.display = "none";
        return;
      }

      if (!sessionToken) {
        sessionToken = data.sessionToken;
        localStorage.setItem(`reg_chat_${AGENT_ID}`, sessionToken!);
      } else {
        // Try to resume session
        const sessionRes = await fetch(
          `${API_BASE}/api/widget/session?token=${sessionToken}`
        );
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.messages && sessionData.messages.length > 0) {
            messages = sessionData.messages;
            renderMessages();
            return;
          }
        } else {
          // Session expired, get new one
          sessionToken = data.sessionToken;
          localStorage.setItem(`reg_chat_${AGENT_ID}`, sessionToken!);
        }
      }
    } catch (err) {
      console.error("[REG Chat] Init error:", err);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  function renderMessages() {
    msgContainer.innerHTML = "";
    for (const msg of messages) {
      const el = document.createElement("div");
      el.className = `reg-msg ${msg.role === "lead" ? "lead" : "ai"}`;
      el.textContent = msg.content;
      msgContainer.appendChild(el);
    }
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function addMessageToUI(role: string, content: string) {
    const el = document.createElement("div");
    el.className = `reg-msg ${role === "lead" ? "lead" : "ai"}`;
    el.textContent = content;
    msgContainer.appendChild(el);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    return el;
  }

  // ─── Send Message ───────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading || !sessionToken) return;

    isLoading = true;
    sendBtn.disabled = true;
    input.value = "";

    messages.push({ role: "lead", content: text });
    addMessageToUI("lead", text);
    typingIndicator.classList.add("visible");

    try {
      const res = await fetch(`${API_BASE}/api/widget/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionToken }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }

      typingIndicator.classList.remove("visible");

      // Handle streaming or non-streaming response
      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("text/event-stream") || contentType.includes("application/octet-stream")) {
        // Streaming — read chunks
        const aiEl = addMessageToUI("ai", "");
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            // Parse SSE data lines
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("0:")) {
                // Vercel AI SDK data stream format: 0:"text chunk"
                try {
                  const text = JSON.parse(line.slice(2));
                  fullText += text;
                  aiEl.textContent = fullText;
                  msgContainer.scrollTop = msgContainer.scrollHeight;
                } catch {
                  // Skip unparseable lines
                }
              }
            }
          }
        }
        messages.push({ role: "ai", content: fullText });
      } else {
        // JSON response (non-streaming fallback)
        const data = await res.json();
        if (data.response) {
          messages.push({ role: "ai", content: data.response });
          addMessageToUI("ai", data.response);
        }
      }
    } catch (err: any) {
      typingIndicator.classList.remove("visible");
      addMessageToUI("ai", "Sorry, something went wrong. Please try again.");
      console.error("[REG Chat] Send error:", err);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────
  bubble.addEventListener("click", () => {
    isOpen = !isOpen;
    panel.classList.toggle("open", isOpen);
    if (isOpen) {
      input.focus();
      // Show greeting on first open
      if (messages.length === 0 && greeting) {
        messages.push({ role: "ai", content: greeting });
        addMessageToUI("ai", greeting);
      }
    }
  });

  closeBtn.addEventListener("click", () => {
    isOpen = false;
    panel.classList.remove("open");
  });

  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ─── Boot ───────────────────────────────────────────────────────────────────
  init();
})();
