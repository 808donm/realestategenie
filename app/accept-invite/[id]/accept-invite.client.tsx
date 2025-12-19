"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AcceptInviteClient({
  email,
  invitationId,
}: {
  email: string;
  invitationId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<"register" | "verify">("register");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/accept-invite/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          token,
          fullName,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send verification code");
      }

      // Move to verification step
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          email,
          password,
          fullName,
          verificationCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create account");
      }

      // Redirect to signin
      router.push("/signin?message=Account created successfully! Please sign in.");
    } catch (err: any) {
      setError(err.message || "Failed to verify code");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/accept-invite/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          token,
          fullName,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to resend code");
      }

      alert("Verification code resent! Check your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "100px auto", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <img
            src="/logo.png"
            alt="The Real Estate Genie"
            width={200}
            height={200}
            style={{ borderRadius: 12 }}
          />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>
          Welcome to Real Estate Genie! ⚡
        </h1>
        <p style={{ color: "#6b7280", marginTop: 8 }}>
          {step === "register"
            ? "Create your account to get started"
            : "Verify your email address"}
        </p>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 32,
          border: "1px solid #e5e7eb",
        }}
      >
        {step === "register" ? (
          <form onSubmit={handleRegisterSubmit} style={{ display: "grid", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  background: "#f9fafb",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Enter your full name"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Re-enter your password"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "#fee2e2",
                  color: "#991b1b",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "14px",
                background: "#3b82f6",
                color: "white",
                borderRadius: 8,
                border: "none",
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? "Sending Code..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} style={{ display: "grid", gap: 20 }}>
            <div>
              <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px 0", textAlign: "center" }}>
                We've sent a 6-digit verification code to <strong>{email}</strong>
              </p>

              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
                Enter Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerificationCode(value);
                }}
                required
                maxLength={6}
                placeholder="000000"
                autoFocus
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: 8,
                  border: "2px solid #d1d5db",
                  fontSize: 24,
                  fontWeight: 700,
                  textAlign: "center",
                  letterSpacing: "0.5em",
                  fontFamily: "monospace",
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "#fee2e2",
                  color: "#991b1b",
                  borderRadius: 8,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              style={{
                padding: "14px",
                background: "#3b82f6",
                color: "white",
                borderRadius: 8,
                border: "none",
                fontSize: 16,
                fontWeight: 600,
                cursor: loading || verificationCode.length !== 6 ? "not-allowed" : "pointer",
                opacity: loading || verificationCode.length !== 6 ? 0.5 : 1,
              }}
            >
              {loading ? "Verifying..." : "Verify & Create Account"}
            </button>

            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                onClick={resendCode}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  textDecoration: "underline",
                }}
              >
                Resend Code
              </button>
            </div>

            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setStep("register");
                  setVerificationCode("");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                ← Back to registration
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
