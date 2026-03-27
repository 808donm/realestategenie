import { Suspense } from "react";
import Script from "next/script";
import SignInClient from "./signin-client";

export default function SignInPage() {
  return (
    <>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <SignInClient />
      </Suspense>
      <Script src="https://www.realestategenie.app/js/sales-chat.js" data-color="#6366f1" strategy="lazyOnload" />
    </>
  );
}
