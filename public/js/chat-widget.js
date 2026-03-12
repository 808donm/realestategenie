(function () {
  "use strict";

  // Read config from the script tag
  var script = document.currentScript;
  var agentId = script.getAttribute("data-agent-id");
  var agentName = script.getAttribute("data-agent-name") || "us";
  var color = script.getAttribute("data-color") || "#6366f1";
  var greeting =
    script.getAttribute("data-greeting") ||
    "Hi there! \uD83D\uDC4B I'm " +
      agentName +
      "'s assistant. Whether you're looking to buy, sell, or just have questions about real estate \u2014 I'm here to help. What brings you here today?";
  var apiUrl = script.getAttribute("data-api-url") || script.src.replace(/\/js\/chat-widget\.js.*$/, "");
  var position = script.getAttribute("data-position") || "right";

  if (!agentId) {
    console.error("RealEstateGenie Chat: data-agent-id is required");
    return;
  }

  var sessionId = null;
  var messages = [];
  var isOpen = false;
  var isLoading = false;

  // ── Styles ──────────────────────────────────────────────────────────
  var css = document.createElement("style");
  css.textContent =
    '#reg-chat-widget,#reg-chat-widget *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    "#reg-chat-widget{position:fixed;bottom:24px;" + (position === "left" ? "left" : "right") + ":24px;z-index:99999}" +
    "#reg-chat-toggle{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:transform .2s,box-shadow .2s;background:" + color + "}" +
    "#reg-chat-toggle:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,.2)}" +
    "#reg-chat-window{position:absolute;bottom:72px;" + (position === "left" ? "left" : "right") + ":0;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);display:none;flex-direction:column;overflow:hidden;animation:reg-up .25s ease-out}" +
    "#reg-chat-window.open{display:flex}" +
    "@keyframes reg-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}" +
    "#reg-chat-header{padding:16px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between;background:" + color + "}" +
    "#reg-chat-header-title{font-size:16px;font-weight:600}" +
    "#reg-chat-header-sub{font-size:12px;opacity:.85;margin-top:2px}" +
    "#reg-chat-close{background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}" +
    "#reg-chat-close:hover{background:rgba(255,255,255,.3)}" +
    "#reg-chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}" +
    ".reg-msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.45;word-wrap:break-word}" +
    ".reg-msg-user{align-self:flex-end;color:#fff;border-bottom-right-radius:4px;background:" + color + "}" +
    ".reg-msg-assistant{align-self:flex-start;background:#f3f4f6;color:#1f2937;border-bottom-left-radius:4px}" +
    ".reg-typing{align-self:flex-start;background:#f3f4f6;padding:12px 18px;border-radius:16px;border-bottom-left-radius:4px;display:flex;gap:4px}" +
    ".reg-dot{width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:reg-b 1.2s infinite}" +
    ".reg-dot:nth-child(2){animation-delay:.15s}.reg-dot:nth-child(3){animation-delay:.3s}" +
    "@keyframes reg-b{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}" +
    "#reg-chat-input-area{padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px}" +
    "#reg-chat-input{flex:1;border:1px solid #d1d5db;border-radius:24px;padding:10px 16px;font-size:14px;outline:none;transition:border-color .2s}" +
    "#reg-chat-input:focus{border-color:" + color + "}" +
    "#reg-chat-send{width:40px;height:40px;border-radius:50%;border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:" + color + "}" +
    "#reg-chat-send:disabled{opacity:.5;cursor:not-allowed}" +
    "#reg-chat-powered{text-align:center;padding:6px;font-size:11px;color:#9ca3af}";
  document.head.appendChild(css);

  // ── HTML ────────────────────────────────────────────────────────────
  var widget = document.createElement("div");
  widget.id = "reg-chat-widget";
  widget.innerHTML =
    '<div id="reg-chat-window">' +
      '<div id="reg-chat-header">' +
        '<div><div id="reg-chat-header-title">Chat with ' + escapeHtml(agentName) + "</div>" +
        '<div id="reg-chat-header-sub">Typically replies instantly</div></div>' +
        '<button id="reg-chat-close" aria-label="Close chat">\u2715</button>' +
      "</div>" +
      '<div id="reg-chat-messages"></div>' +
      '<form id="reg-chat-input-area">' +
        '<input id="reg-chat-input" type="text" placeholder="Type a message..." autocomplete="off" />' +
        '<button type="submit" id="reg-chat-send" aria-label="Send">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        "</button>" +
      "</form>" +
      '<div id="reg-chat-powered">Powered by Real Estate Genie</div>' +
    "</div>" +
    '<button id="reg-chat-toggle" aria-label="Open chat">' +
      '<svg id="reg-icon-chat" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<svg id="reg-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    "</button>";
  document.body.appendChild(widget);

  // ── Elements ────────────────────────────────────────────────────────
  var chatWindow = document.getElementById("reg-chat-window");
  var chatMessages = document.getElementById("reg-chat-messages");
  var chatInput = document.getElementById("reg-chat-input");
  var chatForm = document.getElementById("reg-chat-input-area");
  var toggleBtn = document.getElementById("reg-chat-toggle");
  var closeBtn = document.getElementById("reg-chat-close");
  var iconChat = document.getElementById("reg-icon-chat");
  var iconClose = document.getElementById("reg-icon-close");
  var sendBtn = document.getElementById("reg-chat-send");

  // ── Actions ─────────────────────────────────────────────────────────
  function toggle() {
    isOpen = !isOpen;
    chatWindow.classList.toggle("open", isOpen);
    iconChat.style.display = isOpen ? "none" : "block";
    iconClose.style.display = isOpen ? "block" : "none";
    toggleBtn.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
    if (isOpen) {
      chatInput.focus();
      if (messages.length === 0) {
        addMessage("assistant", greeting);
      }
    }
  }

  toggleBtn.addEventListener("click", toggle);
  closeBtn.addEventListener("click", toggle);

  function addMessage(role, text) {
    messages.push({ role: role, content: text });
    var div = document.createElement("div");
    div.className = "reg-msg " + (role === "user" ? "reg-msg-user" : "reg-msg-assistant");
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement("div");
    div.className = "reg-typing";
    div.id = "reg-typing-indicator";
    div.innerHTML = '<div class="reg-dot"></div><div class="reg-dot"></div><div class="reg-dot"></div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById("reg-typing-indicator");
    if (el) el.remove();
  }

  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = chatInput.value.trim();
    if (!text || isLoading) return;

    chatInput.value = "";
    addMessage("user", text);
    isLoading = true;
    sendBtn.disabled = true;
    showTyping();

    fetch(apiUrl + "/api/public/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: agentId,
        sessionId: sessionId,
        message: text,
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        hideTyping();
        if (data.reply) addMessage("assistant", data.reply);
        if (data.sessionId) sessionId = data.sessionId;
      })
      .catch(function () {
        hideTyping();
        addMessage("assistant", "Sorry, I'm having trouble connecting. Please try again.");
      })
      .finally(function () {
        isLoading = false;
        sendBtn.disabled = false;
        chatInput.focus();
      });
  });

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
})();
