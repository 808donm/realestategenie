"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Shield, User, UserCheck, UserCog } from "lucide-react";

type TeamMember = {
  id: string;
  account_role: string;
  joined_at: string;
  office_id: string | null;
  agents: {
    id: string;
    email: string;
    display_name: string | null;
  };
  offices: {
    id: string;
    name: string;
  } | null;
};

type Office = {
  id: string;
  name: string;
};

export default function TeamMembersList({
  members,
  currentUserId,
  accountRole,
  offices,
}: {
  members: TeamMember[];
  currentUserId: string;
  accountRole: string;
  offices: Office[];
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Shield className="h-4 w-4" />;
      case "admin":
        return <UserCog className="h-4 w-4" />;
      case "agent":
        return <User className="h-4 w-4" />;
      case "assistant":
        return <UserCheck className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "agent":
        return "bg-green-100 text-green-800";
      case "assistant":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setLoading(memberId);
    try {
      const response = await fetch(`/api/account/members/${memberId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to update role");
        return;
      }

      window.location.reload();
    } catch (error) {
      alert("Failed to update role");
    } finally {
      setLoading(null);
    }
  };

  const handleOfficeChange = async (memberId: string, officeId: string | null) => {
    setLoading(memberId);
    try {
      const response = await fetch(`/api/account/members/${memberId}/office`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ office_id: officeId }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to update office");
        return;
      }

      window.location.reload();
    } catch (error) {
      alert("Failed to update office");
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return;
    }

    setLoading(memberId);
    try {
      const response = await fetch(`/api/account/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to remove member");
        return;
      }

      window.location.reload();
    } catch (error) {
      alert("Failed to remove member");
    } finally {
      setLoading(null);
    }
  };

  const canEditMember = (member: TeamMember) => {
    // Owner can edit anyone except themselves
    if (accountRole === "owner") {
      return member.agents.id !== currentUserId;
    }
    // Admin can only edit agents and assistants
    if (accountRole === "admin") {
      return member.account_role === "agent" || member.account_role === "assistant";
    }
    return false;
  };

  return (
    <div className="space-y-2">
      {members.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No team members yet</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getRoleBadgeColor(member.account_role)}`}>
                    {getRoleIcon(member.account_role)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {member.agents.display_name || member.agents.email}
                      </span>
                      {member.agents.id === currentUserId && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{member.agents.email}</p>
                    {member.offices && (
                      <p className="text-xs text-gray-400 mt-1">📍 {member.offices.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canEditMember(member) ? (
                  <>
                    <Select
                      value={member.account_role}
                      onValueChange={(value) => handleRoleChange(member.id, value)}
                      disabled={loading === member.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accountRole === "owner" && (
                          <SelectItem value="admin">Administrator</SelectItem>
                        )}
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="assistant">Assistant</SelectItem>
                      </SelectContent>
                    </Select>

                    {offices.length > 0 && (
                      <Select
                        value={member.office_id || "none"}
                        onValueChange={(value) =>
                          handleOfficeChange(member.id, value === "none" ? null : value)
                        }
                        disabled={loading === member.id}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="No office" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No office</SelectItem>
                          {offices.map((office) => (
                            <SelectItem key={office.id} value={office.id}>
                              {office.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id, member.agents.email)}
                      disabled={loading === member.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </>
                ) : (
                  <Badge className={getRoleBadgeColor(member.account_role)}>
                    {getRoleLabel(member.account_role)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
