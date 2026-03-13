(function () {
  "use strict";

  var script = document.currentScript;
  var color = script.getAttribute("data-color") || "#6366f1";
  var position = script.getAttribute("data-position") || "right";
  var greeting =
    script.getAttribute("data-greeting") ||
    "Hey there! \uD83D\uDC4B I'm Genie. I can tell you all about how Real Estate Genie gives agents and brokers everything they need to buy, sell, and prospect \u2014 all in one platform powered by AI. What brings you here today?";
  var apiUrl =
    script.getAttribute("data-api-url") ||
    script.src.replace(/\/js\/sales-chat\.js.*$/, "");

  var sessionId = null;
  var messages = [];
  var isOpen = false;
  var isLoading = false;

  // ── Styles ──────────────────────────────────────────────────────
  var css = document.createElement("style");
  css.textContent =
    '#reg-sales-chat,#reg-sales-chat *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    "#reg-sales-chat{position:fixed;bottom:24px;" + (position === "left" ? "left" : "right") + ":24px;z-index:99999}" +
    "#reg-sc-toggle{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:transform .2s,box-shadow .2s;background:" + color + "}" +
    "#reg-sc-toggle:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,.2)}" +
    // Notification dot
    "#reg-sc-dot{position:absolute;top:-2px;right:-2px;width:16px;height:16px;background:#ef4444;border-radius:50%;border:2px solid #fff;display:block}" +
    "#reg-sc-dot.hidden{display:none}" +
    // Window
    "#reg-sc-window{position:absolute;bottom:72px;" + (position === "left" ? "left" : "right") + ":0;width:400px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);display:none;flex-direction:column;overflow:hidden;animation:reg-sc-up .25s ease-out}" +
    "#reg-sc-window.open{display:flex}" +
    "@keyframes reg-sc-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}" +
    // Header
    "#reg-sc-header{padding:16px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between;background:" + color + "}" +
    "#reg-sc-header-left{display:flex;align-items:center;gap:12px}" +
    "#reg-sc-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px}" +
    "#reg-sc-title{font-size:16px;font-weight:600}" +
    "#reg-sc-sub{font-size:12px;opacity:.85;margin-top:1px}" +
    "#reg-sc-close{background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}" +
    "#reg-sc-close:hover{background:rgba(255,255,255,.3)}" +
    // Messages
    "#reg-sc-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}" +
    ".reg-sc-msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-wrap:break-word}" +
    ".reg-sc-msg a{color:inherit;text-decoration:underline}" +
    ".reg-sc-user{align-self:flex-end;color:#fff;border-bottom-right-radius:4px;background:" + color + "}" +
    ".reg-sc-assistant{align-self:flex-start;background:#f3f4f6;color:#1f2937;border-bottom-left-radius:4px}" +
    ".reg-sc-typing{align-self:flex-start;background:#f3f4f6;padding:12px 18px;border-radius:16px;border-bottom-left-radius:4px;display:flex;gap:4px}" +
    ".reg-sc-dot-anim{width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:reg-sc-b 1.2s infinite}" +
    ".reg-sc-dot-anim:nth-child(2){animation-delay:.15s}.reg-sc-dot-anim:nth-child(3){animation-delay:.3s}" +
    "@keyframes reg-sc-b{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}" +
    // Input
    "#reg-sc-input-area{padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px}" +
    "#reg-sc-input{flex:1;border:1px solid #d1d5db;border-radius:24px;padding:10px 16px;font-size:14px;outline:none;transition:border-color .2s}" +
    "#reg-sc-input:focus{border-color:" + color + "}" +
    "#reg-sc-send{width:40px;height:40px;border-radius:50%;border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:" + color + "}" +
    "#reg-sc-send:disabled{opacity:.5;cursor:not-allowed}" +
    "#reg-sc-powered{text-align:center;padding:6px;font-size:11px;color:#9ca3af}" +
    "#reg-sc-powered a{color:#9ca3af;text-decoration:none}" +
    "#reg-sc-powered a:hover{text-decoration:underline}";
  document.head.appendChild(css);

  // ── HTML ────────────────────────────────────────────────────────
  var widget = document.createElement("div");
  widget.id = "reg-sales-chat";
  widget.innerHTML =
    '<div id="reg-sc-window">' +
      '<div id="reg-sc-header">' +
        '<div id="reg-sc-header-left">' +
          '<div id="reg-sc-avatar">\u2728</div>' +
          "<div>" +
            '<div id="reg-sc-title">Genie</div>' +
            '<div id="reg-sc-sub">Real Estate Genie Assistant</div>' +
          "</div>" +
        "</div>" +
        '<button id="reg-sc-close" aria-label="Close chat">\u2715</button>' +
      "</div>" +
      '<div id="reg-sc-messages"></div>' +
      '<form id="reg-sc-input-area">' +
        '<input id="reg-sc-input" type="text" placeholder="Ask me anything..." autocomplete="off" />' +
        '<button type="submit" id="reg-sc-send" aria-label="Send">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        "</button>" +
      "</form>" +
      '<div id="reg-sc-powered"><a href="https://realestategenie.app" target="_blank" rel="noopener">Powered by Real Estate Genie</a></div>' +
    "</div>" +
    '<button id="reg-sc-toggle" aria-label="Chat with us">' +
      '<span id="reg-sc-dot"></span>' +
      '<svg id="reg-sc-icon-chat" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<svg id="reg-sc-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    "</button>";
  document.body.appendChild(widget);

  // ── Elements ────────────────────────────────────────────────────
  var chatWindow = document.getElementById("reg-sc-window");
  var chatMessages = document.getElementById("reg-sc-messages");
  var chatInput = document.getElementById("reg-sc-input");
  var chatForm = document.getElementById("reg-sc-input-area");
  var toggleBtn = document.getElementById("reg-sc-toggle");
  var closeBtn = document.getElementById("reg-sc-close");
  var iconChat = document.getElementById("reg-sc-icon-chat");
  var iconClose = document.getElementById("reg-sc-icon-close");
  var sendBtn = document.getElementById("reg-sc-send");
  var notifDot = document.getElementById("reg-sc-dot");

  // ── Actions ─────────────────────────────────────────────────────
  function toggle() {
    isOpen = !isOpen;
    chatWindow.classList.toggle("open", isOpen);
    iconChat.style.display = isOpen ? "none" : "block";
    iconClose.style.display = isOpen ? "block" : "none";
    notifDot.classList.add("hidden");
    toggleBtn.setAttribute("aria-label", isOpen ? "Close chat" : "Chat with us");
    if (isOpen) {
      chatInput.focus();
      if (messages.length === 0) {
        addMessage("assistant", greeting);
      }
    }
  }

  toggleBtn.addEventListener("click", toggle);
  closeBtn.addEventListener("click", toggle);

  function linkify(text) {
    return text.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );
  }

  function addMessage(role, text) {
    messages.push({ role: role, content: text });
    var div = document.createElement("div");
    div.className = "reg-sc-msg " + (role === "user" ? "reg-sc-user" : "reg-sc-assistant");
    div.innerHTML = role === "assistant" ? linkify(escapeHtml(text)) : escapeHtml(text);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement("div");
    div.className = "reg-sc-typing";
    div.id = "reg-sc-typing";
    div.innerHTML = '<div class="reg-sc-dot-anim"></div><div class="reg-sc-dot-anim"></div><div class="reg-sc-dot-anim"></div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById("reg-sc-typing");
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

    fetch(apiUrl + "/api/public/sales-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
        addMessage("assistant", "Sorry, I'm having trouble connecting. Please try again in a moment.");
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
