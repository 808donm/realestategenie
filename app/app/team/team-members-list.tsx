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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Shield, User, UserCheck, UserCog, KeyRound, Copy, Check, AlertCircle } from "lucide-react";

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
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const special = "!@#$%&*";
    let pw = "";
    for (let i = 0; i < 10; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    pw += special[Math.floor(Math.random() * special.length)];
    setResetPassword(pw);
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword) return;
    if (resetPassword.length < 8) {
      setResetError("Password must be at least 8 characters");
      return;
    }

    setResetLoading(true);
    setResetError(null);
    try {
      const response = await fetch(`/api/account/members/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        setResetError(data.error || "Failed to reset password");
        return;
      }

      setResetSuccess(true);
    } catch {
      setResetError("Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const copyCredentials = async () => {
    if (!resetTarget) return;
    const text = `Email: ${resetTarget.agents.email}\nNew Password: ${resetPassword}\n\nPlease sign in and change your password.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeResetDialog = () => {
    setResetTarget(null);
    setResetPassword("");
    setResetError(null);
    setResetSuccess(false);
    setCopied(false);
  };

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
                      title="Reset password"
                      onClick={() => {
                        setResetTarget(member);
                        generatePassword();
                      }}
                      disabled={loading === member.id}
                    >
                      <KeyRound className="h-4 w-4 text-amber-600" />
                    </Button>

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
      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(v) => !v && closeResetDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new temporary password for{" "}
              <span className="font-semibold">
                {resetTarget?.agents.display_name || resetTarget?.agents.email}
              </span>
              . They will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-4 mt-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-900">Password reset successfully!</p>
                <p className="text-sm text-green-800 mt-2">Share the new credentials with the team member:</p>
                <div className="mt-3 bg-white border rounded-lg p-3 font-mono text-sm">
                  <p><span className="text-gray-500">Email:</span> {resetTarget?.agents.email}</p>
                  <p><span className="text-gray-500">Password:</span> {resetPassword}</p>
                </div>
                <p className="text-xs text-green-700 mt-2">
                  They will be required to change their password on next login.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={copyCredentials}>
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Credentials"}
                </Button>
                <Button onClick={closeResetDialog}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">New Temporary Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="reset-password"
                    type="text"
                    placeholder="Min 8 characters"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    minLength={8}
                    disabled={resetLoading}
                  />
                  <Button type="button" variant="outline" onClick={generatePassword} disabled={resetLoading}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  The member will be required to change this on next login.
                </p>
              </div>

              {resetError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800">{resetError}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeResetDialog} disabled={resetLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={resetLoading || resetPassword.length < 8}
                >
                  {resetLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
