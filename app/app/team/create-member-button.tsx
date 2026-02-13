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
import { UserPlus, AlertCircle, Copy, Check } from "lucide-react";

type Office = {
  id: string;
  name: string;
};

type UsageStatus = {
  agents_available: number;
  assistants_available: number;
  administrators_available: number;
};

export default function CreateMemberButton({
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
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<string>("agent");
  const [password, setPassword] = useState("");
  const [officeId, setOfficeId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const canCreateRole = (selectedRole: string) => {
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

  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const special = "!@#$%&*";
    let pw = "";
    for (let i = 0; i < 14; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    pw += special[Math.floor(Math.random() * special.length)];
    setPassword(pw);
  };

  const copyCredentials = async () => {
    const text = `Email: ${email}\nTemporary Password: ${password}\n\nPlease sign in and change your password on first login.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !role || !password) {
      setError("Email, role, and password are required");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    if (!canCreateRole(role)) {
      setError(`No ${role} seats available. Please upgrade your plan.`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/account/members/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          display_name: displayName || null,
          role,
          password,
          office_id: officeId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create member");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Failed to create member");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (success) {
      setEmail("");
      setDisplayName("");
      setRole("agent");
      setPassword("");
      setOfficeId(undefined);
      setSuccess(false);
      setError(null);
      window.location.reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Create Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team Member</DialogTitle>
          <DialogDescription>
            Create an account directly with a temporary password. The member will be required to change it on first login.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 mt-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-900">Member created successfully!</p>
              <p className="text-sm text-green-800 mt-2">Share these credentials with the new member:</p>
              <div className="mt-3 bg-white border rounded-lg p-3 font-mono text-sm">
                <p><span className="text-gray-500">Email:</span> {email}</p>
                <p><span className="text-gray-500">Password:</span> {password}</p>
              </div>
              <p className="text-xs text-green-700 mt-2">
                They will be required to change their password on first login.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={copyCredentials}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy Credentials"}
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">Email Address</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-name">Display Name (Optional)</Label>
              <Input
                id="create-name"
                type="text"
                placeholder="Jane Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Temporary Password</Label>
              <div className="flex gap-2">
                <Input
                  id="create-password"
                  type="text"
                  placeholder="Min 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  disabled={loading}
                />
                <Button type="button" variant="outline" onClick={generatePassword} disabled={loading}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                The member will be required to change this on first login.
              </p>
            </div>

            {offices.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="create-office">Office (Optional)</Label>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !canCreateRole(role)}>
                {loading ? "Creating..." : "Create Member"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
