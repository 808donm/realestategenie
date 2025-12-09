import { Suspense } from "react";
import MfaClient from "./mfa-client";

export default function MfaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <MfaClient />
    </Suspense>
  );
}
