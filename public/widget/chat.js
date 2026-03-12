"use strict";(()=>{(function(){let d=document.currentScript;if(!d)return;let l=d.getAttribute("data-agent-id");if(!l){console.error("[REG Chat] data-agent-id is required");return}let c=d.getAttribute("data-color")||"#667eea",E=d.getAttribute("data-position")||"right",m=d.getAttribute("data-api")||new URL(d.src).origin,a=localStorage.getItem(`reg_chat_${l}`),T="",u="",p=!1,b=!1,i=[],h=document.createElement("div");h.id="reg-chat-widget";let y=h.attachShadow({mode:"closed"});document.body.appendChild(h);let L=document.createElement("style");L.textContent=`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .reg-bubble {
      position: fixed;
      bottom: 20px;
      ${E}: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${c};
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
      ${E}: 20px;
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
      background: ${c};
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
      background: ${c};
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
    .reg-input:focus { border-color: ${c}; }
    .reg-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${c};
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
  `,y.appendChild(L);let x=document.createElement("button");x.className="reg-bubble",x.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',y.appendChild(x);let n=document.createElement("div");n.className="reg-panel",n.innerHTML=`
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
  `,y.appendChild(n);let o=n.querySelector(".reg-messages"),w=n.querySelector(".reg-typing"),g=n.querySelector(".reg-input"),v=n.querySelector(".reg-send"),$=n.querySelector(".reg-close"),I=n.querySelector(".reg-header-name");async function H(){try{let e=await(await fetch(`${m}/api/widget/identify?agentId=${l}`)).json();if(T=e.agentName||"Agent",u=e.greeting,I.textContent=T,!e.enabled){h.style.display="none";return}if(!a)a=e.sessionToken,localStorage.setItem(`reg_chat_${l}`,a);else{let r=await fetch(`${m}/api/widget/session?token=${a}`);if(r.ok){let s=await r.json();if(s.messages&&s.messages.length>0){i=s.messages,z();return}}else a=e.sessionToken,localStorage.setItem(`reg_chat_${l}`,a)}}catch(t){console.error("[REG Chat] Init error:",t)}}function z(){o.innerHTML="";for(let t of i){let e=document.createElement("div");e.className=`reg-msg ${t.role==="lead"?"lead":"ai"}`,e.textContent=t.content,o.appendChild(e)}o.scrollTop=o.scrollHeight}function f(t,e){let r=document.createElement("div");return r.className=`reg-msg ${t==="lead"?"lead":"ai"}`,r.textContent=e,o.appendChild(r),o.scrollTop=o.scrollHeight,r}async function S(){let t=g.value.trim();if(!(!t||b||!a)){b=!0,v.disabled=!0,g.value="",i.push({role:"lead",content:t}),f("lead",t),w.classList.add("visible");try{let e=await fetch(`${m}/api/widget/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t,sessionToken:a})});if(!e.ok){let s=await e.json();throw new Error(s.error||"Failed to send")}w.classList.remove("visible");let r=e.headers.get("Content-Type")||"";if(r.includes("text/event-stream")||r.includes("application/octet-stream")){let s=f("ai",""),C=e.body?.getReader(),A=new TextDecoder,k="";if(C)for(;;){let{done:N,value:R}=await C.read();if(N)break;let _=A.decode(R,{stream:!0}).split(`
`);for(let M of _)if(M.startsWith("0:"))try{let B=JSON.parse(M.slice(2));k+=B,s.textContent=k,o.scrollTop=o.scrollHeight}catch{}}i.push({role:"ai",content:k})}else{let s=await e.json();s.response&&(i.push({role:"ai",content:s.response}),f("ai",s.response))}}catch(e){w.classList.remove("visible"),f("ai","Sorry, something went wrong. Please try again."),console.error("[REG Chat] Send error:",e)}finally{b=!1,v.disabled=!1,g.focus()}}}x.addEventListener("click",()=>{p=!p,n.classList.toggle("open",p),p&&(g.focus(),i.length===0&&u&&(i.push({role:"ai",content:u}),f("ai",u)))}),$.addEventListener("click",()=>{p=!1,n.classList.remove("open")}),v.addEventListener("click",S),g.addEventListener("keydown",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),S())}),H()})();})();
