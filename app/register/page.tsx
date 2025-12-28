import { Suspense } from "react";
import RegisterClient from "./register-client";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <RegisterClient />
    </Suspense>
  );
}
