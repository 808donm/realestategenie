"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserPlus, AlertCircle } from "lucide-react";

type Office = {
  id: string;
  name: string;
};

type UsageStatus = {
  agents_available: number;
  assistants_available: number;
  administrators_available: number;
};

export default function InviteMemberButton({
  accountId,
  usage,
  offices,
}: {
  accountId: string;
  usage: UsageStatus | null;
  offices: Office[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("agent");
  const [officeId, setOfficeId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canInviteRole = (selectedRole: string) => {
    if (!usage) return false;

    switch (selectedRole) {
      case "agent":
        return usage.agents_available > 0;
      case "assistant":
        return usage.assistants_available > 0;
      case "admin":
        return usage.administrators_available > 0;
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !role) {
      setError("Email and role are required");
      return;
    }

    if (!canInviteRole(role)) {
      setError(`No ${role} seats available. Please upgrade your plan.`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/account/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          office_id: officeId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send invitation");
        return;
      }

      setSuccess(true);
      setEmail("");
      setRole("agent");
      setOfficeId(undefined);

      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your team. They'll receive an email with instructions to create an account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">
                  Agent
                  {usage && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({usage.agents_available} seats available)
                    </span>
                  )}
                </SelectItem>
                <SelectItem value="assistant">
                  Assistant
                  {usage && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({usage.assistants_available} seats available)
                    </span>
                  )}
                </SelectItem>
                <SelectItem value="admin">
                  Administrator
                  {usage && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({usage.administrators_available} seats available)
                    </span>
                  )}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {role === "agent" && "Full access to manage properties, leads, and tenants"}
              {role === "assistant" && "View and assist with tasks, limited editing permissions"}
              {role === "admin" && "Can manage team members and billing (except account owner)"}
            </p>
          </div>

          {offices.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="office">Office (Optional)</Label>
              <Select value={officeId} onValueChange={setOfficeId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="No office assignment" />
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
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">Invitation sent successfully!</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !canInviteRole(role)}>
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
