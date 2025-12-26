import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Send, AlertCircle, Paperclip } from "lucide-react";
import { redirect } from "next/navigation";
import MessageComposer from "./message-composer";
import MessagesList from "./messages-list";

export default async function TenantMessagesPage() {
  const supabase = await createClient();

  // Get current tenant user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/tenant/login");
  }

  // Fetch tenant user data
  const { data: tenantUser, error: tenantError } = await supabase
    .from("tenant_users")
    .select("*, lease:pm_leases(id, agent_id)")
    .eq("id", user.id)
    .single();

  if (tenantError || !tenantUser || !tenantUser.lease) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load messages. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const lease = tenantUser.lease as any;

  // Fetch all messages for this lease
  const { data: messages, error: messagesError } = await supabase
    .from("pm_messages")
    .select(`
      *,
      from_user:auth.users!pm_messages_from_user_id_fkey(
        id,
        email,
        user_metadata
      ),
      to_user:auth.users!pm_messages_to_user_id_fkey(
        id,
        email,
        user_metadata
      )
    `)
    .eq("lease_id", lease.id)
    .order("created_at", { ascending: false });

  // Get agent info
  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, email")
    .eq("id", lease.agent_id)
    .single();

  // Count unread messages
  const unreadCount = messages?.filter(
    (msg: any) => msg.to_user_id === user.id && !msg.read_at
  ).length || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <MessageSquare className="h-8 w-8" />
              Messages
            </h1>
            <p className="text-muted-foreground">
              Communicate with your property manager
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Message Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MessageComposer
              leaseId={lease.id}
              agentId={lease.agent_id}
              agentName={agent?.name || "Property Manager"}
            />
          </CardContent>
        </Card>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation History</CardTitle>
          </CardHeader>
          <CardContent>
            {messages && messages.length > 0 ? (
              <MessagesList messages={messages} currentUserId={user.id} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Send a message to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
