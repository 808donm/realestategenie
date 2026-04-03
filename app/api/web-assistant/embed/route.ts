import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/web-assistant/embed?agentId=xxx
 *
 * Returns a JavaScript snippet that agents can paste into their website
 * to embed the Hoku chat widget as a floating button.
 *
 * Usage:
 *   <script src="https://realestategenie.app/api/web-assistant/embed?agentId=YOUR_AGENT_ID"></script>
 */
export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId");

  if (!agentId) {
    return new NextResponse("// Error: agentId parameter is required", {
      headers: { "Content-Type": "application/javascript" },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://realestategenie.app";
  const chatUrl = `${appUrl}/chat/${agentId}`;

  const script = `
(function() {
  // Hoku Web Assistant - Embeddable Chat Widget
  // Powered by Real Estate Genie

  if (window.__hokuLoaded) return;
  window.__hokuLoaded = true;

  // Create floating button
  var btn = document.createElement('div');
  btn.id = 'hoku-chat-btn';
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:#1e40af;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:99999;transition:transform 0.2s;';
  btn.onmouseenter = function() { btn.style.transform = 'scale(1.1)'; };
  btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; };

  // Create chat iframe container
  var container = document.createElement('div');
  container.id = 'hoku-chat-container';
  container.style.cssText = 'position:fixed;bottom:88px;right:20px;width:380px;height:580px;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);z-index:99998;display:none;border:1px solid #e5e7eb;';

  var iframe = document.createElement('iframe');
  iframe.src = '${chatUrl}';
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  iframe.title = 'Chat with Hoku';

  container.appendChild(iframe);
  document.body.appendChild(container);
  document.body.appendChild(btn);

  var open = false;
  btn.onclick = function() {
    open = !open;
    container.style.display = open ? 'block' : 'none';
    btn.innerHTML = open
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  };

  // Mobile responsive
  if (window.innerWidth < 480) {
    container.style.width = 'calc(100vw - 32px)';
    container.style.height = 'calc(100vh - 120px)';
    container.style.bottom = '88px';
    container.style.right = '16px';
    container.style.left = '16px';
  }
})();
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
