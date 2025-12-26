"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paperclip, Download } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  from_user_id: string;
  from_user_type: string;
  to_user_id: string;
  to_user_type: string;
  message: string;
  attachments: any[] | null;
  read_at: string | null;
  created_at: string;
  from_user: {
    id: string;
    email: string;
    user_metadata: any;
  };
  to_user: {
    id: string;
    email: string;
    user_metadata: any;
  };
}

interface MessagesListProps {
  messages: Message[];
  currentUserId: string;
}

export default function MessagesList({
  messages,
  currentUserId,
}: MessagesListProps) {
  const router = useRouter();
  const [markedAsRead, setMarkedAsRead] = useState<Set<string>>(new Set());

  // Mark unread messages as read
  useEffect(() => {
    const unreadMessages = messages.filter(
      (msg) => msg.to_user_id === currentUserId && !msg.read_at && !markedAsRead.has(msg.id)
    );

    if (unreadMessages.length > 0) {
      // Mark messages as read
      Promise.all(
        unreadMessages.map((msg) =>
          fetch(`/api/tenant/messages/${msg.id}/read`, {
            method: "POST",
          })
        )
      ).then(() => {
        // Add to marked set
        setMarkedAsRead(
          new Set([...markedAsRead, ...unreadMessages.map((m) => m.id)])
        );
        // Refresh to update unread count
        router.refresh();
      });
    }
  }, [messages, currentUserId, markedAsRead, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday " + date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  };

  const getSenderName = (msg: Message) => {
    if (msg.from_user_id === currentUserId) {
      return "You";
    }
    return msg.from_user.user_metadata?.name || msg.from_user.email;
  };

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isFromCurrentUser = msg.from_user_id === currentUserId;
        const isUnread = msg.to_user_id === currentUserId && !msg.read_at && !markedAsRead.has(msg.id);

        return (
          <div
            key={msg.id}
            className={`flex ${isFromCurrentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] space-y-2 ${
                isFromCurrentUser
                  ? "bg-blue-600 text-white"
                  : isUnread
                  ? "bg-orange-50 border-2 border-orange-200"
                  : "bg-gray-100"
              } rounded-lg p-4`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {getSenderName(msg)}
                  </span>
                  {isUnread && (
                    <Badge variant="destructive" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isFromCurrentUser ? "text-blue-100" : "text-muted-foreground"
                  }`}
                >
                  {formatDate(msg.created_at)}
                </span>
              </div>

              {/* Message */}
              <div className="whitespace-pre-wrap break-words">
                {msg.message}
              </div>

              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <Paperclip className="h-3 w-3" />
                    Attachments:
                  </div>
                  {msg.attachments.map((attachment: any, idx: number) => (
                    <Button
                      key={idx}
                      variant={isFromCurrentUser ? "secondary" : "outline"}
                      size="sm"
                      asChild
                      className="w-full justify-start"
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={attachment.filename}
                      >
                        <Download className="h-3 w-3 mr-2" />
                        <span className="truncate">{attachment.filename}</span>
                        {attachment.size && (
                          <span className="text-xs ml-auto">
                            ({(attachment.size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </a>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
