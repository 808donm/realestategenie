import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Data Deletion Instructions - The Real Estate Genie™",
  description: "How to request deletion of your data from The Real Estate Genie",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Data Deletion Instructions</CardTitle>
            <p className="text-sm text-muted-foreground">
              How to request deletion of your personal data
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none">
              <h2>User Data Deletion</h2>
              <p>
                In compliance with Facebook's data deletion requirements and data protection regulations
                (GDPR, CCPA), you have the right to request deletion of your personal data.
              </p>

              <h3>What Data Will Be Deleted?</h3>
              <p>When you request account deletion, we will permanently delete:</p>
              <ul>
                <li>Your account information (name, email, phone, license number)</li>
                <li>Your profile and branding settings (headshot, bio, theme preferences)</li>
                <li>All open house events you created</li>
                <li>All leads and attendee data you collected</li>
                <li>Integration configurations (GHL, n8n connections)</li>
                <li>All associated files (flyers, property photos)</li>
              </ul>

              <h3>What Data May Be Retained?</h3>
              <p>
                We may retain certain data for legal compliance and business purposes:
              </p>
              <ul>
                <li><strong>Audit Logs:</strong> Anonymous transaction records for up to 2 years (as required by law)</li>
                <li><strong>Backup Copies:</strong> May exist for up to 30 days in system backups</li>
                <li><strong>Legal Requirements:</strong> Data subject to legal holds or investigations</li>
              </ul>

              <h3>Timeline</h3>
              <ul>
                <li><strong>Processing Time:</strong> Deletion requests are processed within 30 days</li>
                <li><strong>Confirmation:</strong> You will receive email confirmation once deletion is complete</li>
                <li><strong>Backup Removal:</strong> Data in backups will be purged within 30 days</li>
              </ul>
            </div>

            <div className="bg-muted p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold">Option 1: Self-Service Deletion (Recommended)</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Sign in to your account at <Link href="/signin" className="text-primary hover:underline">realestategenie.com/signin</Link></li>
                <li>Navigate to Settings → Account</li>
                <li>Scroll to the "Danger Zone" section</li>
                <li>Click "Delete Account"</li>
                <li>Confirm deletion by entering your password</li>
                <li>You will receive a confirmation email</li>
              </ol>
              <Button asChild className="w-full sm:w-auto">
                <Link href="/signin">Sign In to Delete Account</Link>
              </Button>
            </div>

            <div className="bg-muted p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold">Option 2: Email Request</h3>
              <p className="text-sm">
                If you cannot access your account, send an email to:
              </p>
              <div className="bg-background p-4 rounded border">
                <p className="font-mono text-sm"><strong>Email:</strong> privacy@realestategenie.com</p>
                <p className="font-mono text-sm"><strong>Subject:</strong> Data Deletion Request</p>
              </div>
              <p className="text-sm">
                Include in your email:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your full name</li>
                <li>Email address associated with your account</li>
                <li>Phone number (if applicable)</li>
                <li>A brief explanation of your request</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                We may ask for additional verification to confirm your identity before processing the request.
              </p>
            </div>

            <div className="bg-muted p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold">Option 3: Facebook App Data Deletion</h3>
              <p className="text-sm">
                If you signed up using Facebook Login and want to delete data associated with
                your Facebook account:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Go to your Facebook Settings → Apps and Websites</li>
                <li>Find "The Real Estate Genie" in the list</li>
                <li>Click "Remove" to revoke access</li>
                <li>Follow Option 1 or 2 above to delete your account data from our platform</li>
              </ol>
              <p className="text-sm text-muted-foreground">
                Note: Removing the app from Facebook does not automatically delete your data from
                our platform. You must separately request account deletion using Option 1 or 2.
              </p>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Important Notes</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <strong>Before Deletion:</strong> We recommend exporting your data (leads, property
                  information) before requesting deletion. This action is permanent and cannot be undone.
                </li>
                <li>
                  <strong>Third-Party Data:</strong> Data shared with integrated services (GoHighLevel, n8n)
                  may not be automatically deleted. You must contact those services separately.
                </li>
                <li>
                  <strong>Team Accounts:</strong> If you're part of a team, removing yourself does not
                  delete team data. Contact the team owner to delete shared data.
                </li>
                <li>
                  <strong>Lead Data:</strong> If you collected leads on behalf of others (brokerage, team),
                  they may retain copies of that data.
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold">Questions?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you have questions about data deletion or our data practices, please contact us:
              </p>
              <div className="bg-background p-4 rounded border space-y-1">
                <p className="text-sm"><strong>Email:</strong> privacy@realestategenie.com</p>
                <p className="text-sm"><strong>Support:</strong> support@realestategenie.com</p>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap pt-6 border-t">
              <Button asChild variant="outline">
                <Link href="/privacy">Privacy Policy</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/terms">Terms of Service</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/signin">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
