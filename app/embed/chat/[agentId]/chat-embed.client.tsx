"use client";

import ChatWidget from "@/components/chat-widget";

export default function ChatWidgetEmbed(props: {
  agentId: string;
  agentName: string;
  primaryColor?: string;
  greeting?: string;
  apiUrl?: string;
}) {
  return <ChatWidget {...props} />;
}
