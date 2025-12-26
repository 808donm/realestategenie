"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import OAuthButtons from "./oauth-buttons";

export default function SignInClient() {
  const supabase = supabaseBrowser();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/app/dashboard";
  const oauthError = params.get("error");

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(oauthError);
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Check your email for the sign-in link.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="The Real Estate Genie"
              width={200}
              height={200}
              priority
              className="rounded-lg"
            />
          </div>
          <div>
            <CardTitle className="text-2xl">
              The Real Estate Genie<span className="text-sm align-super">™</span>
            </CardTitle>
            <CardDescription className="mt-2">
              Sign in to manage your open houses and leads
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <OAuthButtons />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={sendMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send sign-in link"}
            </Button>
          </form>

          {err && (
            <div className="p-3 text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg">
              {err}
            </div>
          )}
          {msg && (
            <div className="p-3 text-sm text-success bg-success/10 border border-success/20 rounded-lg">
              {msg}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
