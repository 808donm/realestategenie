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
  const [password, setPassword] = useState("");
  const [signInMode, setSignInMode] = useState<"magic" | "password">("magic");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(oauthError);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  async function handleDemoLogin(accountType: "brokerage" | "realtor") {
    setErr(null);
    setMsg(null);
    setDemoLoading(accountType);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Demo login failed");
        return;
      }
      // Set the session using the tokens from the API
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) {
        setErr(sessionError.message);
        return;
      }
      window.location.href = redirectTo;
    } catch {
      setErr("Failed to connect to demo login service");
    } finally {
      setDemoLoading(null);
    }
  }

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

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
    } else {
      window.location.href = redirectTo;
    }
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
            <p className="mt-2 text-sm font-bold text-foreground">
              Real Estate Deal Flow &amp; Analytics For The Independent Agent
            </p>
            <CardDescription className="mt-2">Sign in to manage your open houses and leads</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Registration Notice */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">Need an account?</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                New users can register to get started with The Real Estate Genie.
              </p>
            </div>
            <Link href="/register">
              <Button variant="outline" className="w-full bg-white dark:bg-slate-800">
                Register Here
              </Button>
            </Link>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Already have an invitation? Sign in below with your credentials.
            </p>
          </div>

          <OAuthButtons />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {/* Toggle between magic link and password */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={signInMode === "magic" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSignInMode("magic");
                setErr(null);
                setMsg(null);
              }}
            >
              Magic Link
            </Button>
            <Button
              variant={signInMode === "password" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSignInMode("password");
                setErr(null);
                setMsg(null);
              }}
            >
              Password
            </Button>
          </div>

          {signInMode === "magic" ? (
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
          ) : (
            <form onSubmit={signInWithPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-pw">Email address</Label>
                <Input
                  id="email-pw"
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          )}

          {err && <div className="p-3 text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg">{err}</div>}
          {msg && (
            <div className="p-3 text-sm text-success bg-success/10 border border-success/20 rounded-lg">{msg}</div>
          )}

          {/* Demo Accounts */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Try a demo</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="w-full border-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900 dark:border-amber-700"
              disabled={demoLoading !== null}
              onClick={() => handleDemoLogin("brokerage")}
            >
              {demoLoading === "brokerage" ? "Loading..." : "Brokerage Demo"}
            </Button>
            <Button
              variant="outline"
              className="w-full border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:border-emerald-700"
              disabled={demoLoading !== null}
              onClick={() => handleDemoLogin("realtor")}
            >
              {demoLoading === "realtor" ? "Loading..." : "Realtor Demo"}
            </Button>
          </div>

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
