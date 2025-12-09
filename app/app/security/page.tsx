import { Suspense } from "react";
import SecurityClient from "./security-client";

export default function SecurityPage() {
  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Security</h1>
      <p style={{ opacity: 0.75 }}>
        Enable an authenticator app for extra protection.
      </p>

      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <SecurityClient />
      </Suspense>
    </div>
  );
}
