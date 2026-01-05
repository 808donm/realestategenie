import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Policy - The Real Estate Genie™",
  description: "Privacy Policy for The Real Estate Genie",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h2>1. Introduction</h2>
            <p>
              The Real Estate Genie ("we," "our," or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information
              when you use our open house management platform.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, phone number, license number, brokerage information</li>
              <li><strong>Profile Information:</strong> Headshot/logo, bio, locations served, branding preferences</li>
              <li><strong>Property Information:</strong> Open house details, property fact sheets, listings</li>
              <li><strong>Lead Information:</strong> Visitor contact details, preferences, and responses collected during open houses</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li>Usage data and analytics</li>
              <li>Device information and IP address</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Authentication tokens and session data</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Process authentication and account management</li>
              <li>Facilitate open house management and lead capture</li>
              <li>Send notifications and communications related to your account</li>
              <li>Integrate with third-party services (GoHighLevel, n8n, etc.)</li>
              <li>Improve our services and develop new features</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>4. Information Sharing and Disclosure</h2>
            <h3>4.1 Third-Party Integrations</h3>
            <p>
              With your explicit consent, we may share your data with:
            </p>
            <ul>
              <li><strong>GoHighLevel:</strong> For CRM and lead management</li>
              <li><strong>n8n:</strong> For workflow automation</li>
              <li><strong>IDX Broker:</strong> For property listings (if enabled)</li>
            </ul>

            <h3>4.2 Service Providers</h3>
            <ul>
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Vercel:</strong> Hosting and deployment</li>
              <li><strong>Email Service Providers:</strong> For transactional emails</li>
            </ul>

            <h3>4.3 Legal Requirements</h3>
            <p>
              We may disclose your information if required by law or in response to valid legal requests.
            </p>

            <h2>5. Data Security</h2>
            <p>
              We implement industry-standard security measures including:
            </p>
            <ul>
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Encryption of data at rest</li>
              <li>Row-level security (RLS) in our database</li>
              <li>Multi-factor authentication (MFA) support</li>
              <li>Regular security audits and updates</li>
            </ul>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct your information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data (see <Link href="/data-deletion" className="text-primary hover:underline">Data Deletion Instructions</Link>)</li>
              <li><strong>Portability:</strong> Export your data in a standard format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
            </ul>

            <h2>7. Consent Management</h2>
            <p>
              For leads captured during open houses:
            </p>
            <ul>
              <li>We obtain explicit consent before sending SMS or email communications</li>
              <li>All consent is versioned and audited with timestamps</li>
              <li>Leads can opt out at any time by replying "STOP" to SMS or clicking unsubscribe in emails</li>
            </ul>

            <h2>8. Data Retention</h2>
            <ul>
              <li><strong>Active Accounts:</strong> Data retained while account is active</li>
              <li><strong>Inactive Accounts:</strong> Data may be deleted after 2 years of inactivity</li>
              <li><strong>Audit Logs:</strong> Retained for 2 years for compliance purposes</li>
              <li><strong>Deleted Accounts:</strong> Data permanently deleted within 30 days of deletion request</li>
            </ul>

            <h2>9. Children's Privacy</h2>
            <p>
              Our services are not intended for individuals under the age of 18. We do not knowingly
              collect personal information from children.
            </p>

            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country
              of residence. We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2>11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>

            <h2>12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> privacy@realestategenie.com<br />
              <strong>Address:</strong> [Your Business Address]
            </p>

            <div className="mt-8 pt-8 border-t">
              <Link href="/signin" className="text-primary hover:underline">
                ← Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
