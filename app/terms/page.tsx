import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Terms of Service - The Real Estate Genie™",
  description: "Terms of Service for The Real Estate Genie",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using The Real Estate Genie ("Service," "Platform," "we," "us," or "our"),
              you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms,
              do not use the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              The Real Estate Genie is an open house management platform that enables real estate agents to:
            </p>
            <ul>
              <li>Create and manage open house events</li>
              <li>Capture and qualify leads through QR code check-ins</li>
              <li>Integrate with CRM systems (GoHighLevel, etc.)</li>
              <li>Automate follow-up workflows</li>
              <li>Manage property information and marketing materials</li>
            </ul>

            <h2>3. Eligibility</h2>
            <p>
              You must:
            </p>
            <ul>
              <li>Be at least 18 years old</li>
              <li>Be a licensed real estate agent or broker (where applicable)</li>
              <li>Have the authority to enter into this agreement</li>
              <li>Provide accurate and complete registration information</li>
            </ul>

            <h2>4. User Accounts</h2>
            <h3>4.1 Account Creation</h3>
            <ul>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
            </ul>

            <h3>4.2 Multi-Factor Authentication</h3>
            <p>
              We strongly recommend enabling multi-factor authentication (MFA) for enhanced security.
              Some features may require MFA to access.
            </p>

            <h2>5. Acceptable Use</h2>
            <h3>5.1 You Agree to:</h3>
            <ul>
              <li>Use the Service only for lawful purposes</li>
              <li>Comply with all applicable real estate laws and regulations</li>
              <li>Obtain proper consent before collecting lead information</li>
              <li>Respect fair housing laws and anti-discrimination regulations</li>
              <li>Maintain accurate property information and disclosures</li>
            </ul>

            <h3>5.2 You Agree NOT to:</h3>
            <ul>
              <li>Use the Service to send spam or unsolicited communications</li>
              <li>Violate any laws, regulations, or third-party rights</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>

            <h2>6. Lead Data and Consent</h2>
            <h3>6.1 Your Responsibilities</h3>
            <p>As a user collecting lead information, you are responsible for:</p>
            <ul>
              <li>Obtaining proper consent before contacting leads via SMS or email</li>
              <li>Honoring opt-out requests (STOP messages, unsubscribe links)</li>
              <li>Complying with TCPA, CAN-SPAM, and other applicable regulations</li>
              <li>Maintaining accurate consent records</li>
              <li>Using lead data only for legitimate business purposes</li>
            </ul>

            <h3>6.2 Consent Versioning</h3>
            <p>
              Our platform tracks consent versions and timestamps. You are responsible for
              reviewing and customizing consent language to comply with your local regulations.
            </p>

            <h2>7. Third-Party Integrations</h2>
            <h3>7.1 Integration Services</h3>
            <p>
              The Service may integrate with third-party services (GoHighLevel, n8n, IDX Broker, etc.).
              Your use of these integrations is subject to:
            </p>
            <ul>
              <li>The third party's own terms of service and privacy policies</li>
              <li>Your responsibility to maintain valid licenses/subscriptions with those services</li>
              <li>Our liability limitations regarding third-party service performance</li>
            </ul>

            <h3>7.2 API Usage</h3>
            <p>
              If you use our API or integrate with external services, you must:
            </p>
            <ul>
              <li>Keep API keys and credentials secure</li>
              <li>Respect rate limits and usage quotas</li>
              <li>Not use the API for malicious purposes</li>
            </ul>

            <h2>8. Intellectual Property</h2>
            <h3>8.1 Our Rights</h3>
            <p>
              The Service, including all content, features, and functionality, is owned by
              The Real Estate Genie and protected by intellectual property laws.
            </p>

            <h3>8.2 Your Content</h3>
            <p>
              You retain ownership of content you upload (property photos, flyers, descriptions, etc.).
              By uploading content, you grant us a license to:
            </p>
            <ul>
              <li>Store, display, and transmit your content as necessary to provide the Service</li>
              <li>Make backups and copies for redundancy and disaster recovery</li>
            </ul>

            <h3>8.3 License Restrictions</h3>
            <p>
              You may not:
            </p>
            <ul>
              <li>Copy, modify, or reverse engineer the Service</li>
              <li>Remove any copyright or proprietary notices</li>
              <li>Create derivative works without permission</li>
            </ul>

            <h2>9. Fees and Payment</h2>
            <h3>9.1 Subscription Plans</h3>
            <ul>
              <li>Fees are charged based on your selected subscription plan</li>
              <li>Prices are subject to change with 30 days' notice</li>
              <li>All fees are non-refundable unless otherwise stated</li>
            </ul>

            <h3>9.2 Payment Terms</h3>
            <ul>
              <li>Payment is due in advance on a monthly or annual basis</li>
              <li>Failed payments may result in service suspension</li>
              <li>You are responsible for all taxes</li>
            </ul>

            <h2>10. Feature Flags and Beta Features</h2>
            <p>
              Some features may be released gradually via feature flags or as beta/preview features.
              These features:
            </p>
            <ul>
              <li>Are provided "as-is" without warranties</li>
              <li>May be changed or discontinued without notice</li>
              <li>May have limited support</li>
            </ul>

            <h2>11. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              By using the Service, you consent to our data practices as described in the Privacy Policy.
            </p>

            <h2>12. Warranty Disclaimer</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              We do not warrant that:
            </p>
            <ul>
              <li>The Service will be uninterrupted or error-free</li>
              <li>Defects will be corrected</li>
              <li>The Service is free of viruses or harmful components</li>
              <li>Results from using the Service will be accurate or reliable</li>
            </ul>

            <h2>13. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE REAL ESTATE GENIE SHALL NOT BE LIABLE FOR:
            </p>
            <ul>
              <li>Indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, revenue, data, or goodwill</li>
              <li>Service interruptions or data loss</li>
              <li>Third-party integrations or services</li>
            </ul>
            <p>
              Our total liability shall not exceed the fees paid by you in the 12 months prior to the claim.
            </p>

            <h2>14. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless The Real Estate Genie from any claims, damages,
              or expenses arising from:
            </p>
            <ul>
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any laws or third-party rights</li>
              <li>Your content or data</li>
            </ul>

            <h2>15. Termination</h2>
            <h3>15.1 By You</h3>
            <p>
              You may terminate your account at any time through your account settings or by
              contacting support.
            </p>

            <h3>15.2 By Us</h3>
            <p>
              We may suspend or terminate your account if:
            </p>
            <ul>
              <li>You violate these Terms</li>
              <li>Your account is inactive for an extended period</li>
              <li>Required by law or legal process</li>
              <li>We discontinue the Service (with 30 days' notice)</li>
            </ul>

            <h3>15.3 Effect of Termination</h3>
            <ul>
              <li>Your access to the Service will cease immediately</li>
              <li>Data may be deleted in accordance with our retention policies</li>
              <li>You may export your data before termination</li>
              <li>Fees are non-refundable</li>
            </ul>

            <h2>16. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material
              changes via email or in-app notification. Continued use of the Service after changes
              constitutes acceptance of the new Terms.
            </p>

            <h2>17. Governing Law</h2>
            <p>
              These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict
              of law provisions. Any disputes shall be resolved in the courts of [Your Jurisdiction].
            </p>

            <h2>18. Dispute Resolution</h2>
            <h3>18.1 Informal Resolution</h3>
            <p>
              Before filing a claim, you agree to contact us to attempt to resolve the dispute informally.
            </p>

            <h3>18.2 Arbitration</h3>
            <p>
              Any disputes not resolved informally shall be resolved through binding arbitration in
              accordance with [Arbitration Rules], except where prohibited by law.
            </p>

            <h2>19. Miscellaneous</h2>
            <h3>19.1 Entire Agreement</h3>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and The Real Estate Genie.
            </p>

            <h3>19.2 Severability</h3>
            <p>
              If any provision of these Terms is found to be invalid, the remaining provisions will
              remain in full force and effect.
            </p>

            <h3>19.3 Waiver</h3>
            <p>
              Our failure to enforce any provision of these Terms does not constitute a waiver of that provision.
            </p>

            <h3>19.4 Assignment</h3>
            <p>
              You may not assign these Terms without our prior written consent. We may assign these
              Terms at any time without notice.
            </p>

            <h2>20. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> legal@realestategenie.com<br />
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
