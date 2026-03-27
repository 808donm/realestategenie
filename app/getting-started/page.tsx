import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Getting Started - The Real Estate Genie™",
  description: "Learn how to set up and use The Real Estate Genie™",
};

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Getting Started</CardTitle>
            <p className="text-sm text-muted-foreground">Your guide to setting up and using The Real Estate Genie™</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h2>Welcome to The Real Estate Genie™</h2>
            <p>
              Welcome to your new real estate management platform! This guide will walk you through everything you need
              to get up and running. The Real Estate Genie™ is designed to be your central hub —{" "}
              <strong>98% of what you do will take place right here in the app</strong>. You will rarely, if ever, need
              to log in to GoHighLevel (GHL) directly.
            </p>

            <h2>1. Signing In to Your Account</h2>
            <p>
              To get started, you will receive a sign-in email from <strong>noreply@mg.aiprofitandgrowth.com</strong>{" "}
              with a link to access your new account. Click the link in the email to sign in — no password setup is
              required for your first login.
            </p>
            <p>
              If you don&apos;t see the email in your inbox, be sure to check your spam or junk folder. Add{" "}
              <strong>noreply@mg.aiprofitandgrowth.com</strong> to your contacts to ensure future emails arrive in your
              inbox.
            </p>

            <h2>2. Connecting GoHighLevel (GHL)</h2>
            <p>
              The first thing you&apos;ll want to do after signing in is connect your GoHighLevel (GHL) account. This
              integration powers your CRM, lead management, and automated follow-ups.
            </p>

            <h3>Step 1: Create a Private Integration in GHL</h3>
            <ol>
              <li>
                Should you need to log in to GHL directly, go to <strong>https://app.aiprofitandgrowth.com</strong> and
                sign in with your GHL credentials.
              </li>
              <li>
                Navigate to <strong>Settings → Integrations</strong> in the GHL dashboard.
              </li>
              <li>
                Click <strong>&quot;Create Private Integration&quot;</strong> (or &quot;Add API Key&quot;).
              </li>
              <li>Give your integration a name (e.g., &quot;Real Estate Genie&quot;) and save it.</li>
              <li>
                GHL will generate an <strong>API Key</strong> for you. Copy this key — you will need it in the next
                step.
              </li>
            </ol>

            <h3>Step 2: Find Your GHL Location ID</h3>
            <ol>
              <li>
                While still in GHL, navigate to <strong>Settings → Business Profile</strong> (or look in the URL bar —
                the Location ID is the string of characters after <code>/location/</code> in the URL).
              </li>
              <li>
                Copy your <strong>Location ID</strong>.
              </li>
            </ol>

            <h3>Step 3: Connect GHL in The Real Estate Genie™</h3>
            <ol>
              <li>
                In The Real Estate Genie™ app, navigate to the <strong>Integrations</strong> page from the sidebar.
              </li>
              <li>
                Find the <strong>GoHighLevel</strong> card at the top of the page.
              </li>
              <li>
                Paste your <strong>API Key</strong> into the API Key text box.
              </li>
              <li>
                Paste your <strong>Location ID</strong> into the Location ID text box.
              </li>
              <li>
                Click <strong>&quot;Connect&quot;</strong> to save your integration.
              </li>
              <li>You should see a success confirmation once the connection is established.</li>
            </ol>

            <h2>3. Using The Real Estate Genie™</h2>
            <p>
              Once your GHL integration is connected, you&apos;re ready to start using the app! Remember,{" "}
              <strong>the vast majority of your work happens right here in The Real Estate Genie™</strong>. The app is
              designed to handle lead management, open house coordination, property data, and automated follow-ups — all
              from one place.
            </p>
            <p>
              You will rarely need to log in to GHL directly. Should you need to access GHL for any reason, the URL is{" "}
              <strong>https://app.aiprofitandgrowth.com</strong> and you can sign in with the credentials associated
              with your account.
            </p>

            <h2>4. Need Help?</h2>
            <p>
              If you run into any issues or have questions, don&apos;t hesitate to reach out to our support team.
              We&apos;re here to help you get the most out of The Real Estate Genie™.
            </p>

            <div className="mt-8 pt-8 border-t flex flex-wrap gap-4">
              <Link href="/signin" className="text-primary hover:underline">
                ← Back to Sign In
              </Link>
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
