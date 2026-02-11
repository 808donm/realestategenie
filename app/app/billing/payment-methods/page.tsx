import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PaymentMethodsPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Get saved payment methods (placeholder - would integrate with Stripe)
  // For now, we'll show a coming soon message with options to contact support

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Payment Methods</h1>
        <p className="text-muted-foreground">
          Manage your payment methods and billing information
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Payment Integration Coming Soon</h3>
              <p className="text-muted-foreground mb-4">
                We're currently setting up secure payment processing with Stripe. In the meantime,
                you can continue using your existing payment method or contact our billing team
                for manual updates.
              </p>
              <div className="flex gap-3">
                <Link href="mailto:billing@realestategenie.app?subject=Payment Method Update">
                  <Button variant="default">
                    Contact Billing Support
                  </Button>
                </Link>
                <Link href="/app/billing">
                  <Button variant="outline">
                    Back to Billing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future payment methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Saved Payment Methods
            </CardTitle>
            <Button disabled variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
          <CardDescription>
            Credit cards, debit cards, and bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No payment methods saved yet</p>
            <p className="text-sm">
              Payment method management will be available once Stripe integration is complete
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Payment Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                All payment information is encrypted and securely stored using Stripe, a
                PCI-compliant payment processor
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                We never store your full card details on our servers
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                Your payment data is protected by bank-level security
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                All transactions are monitored for fraud prevention
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Contact */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Need Help with Billing?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Our billing team is here to help with payment questions, invoice issues, or account
            updates.
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Email:</span>{" "}
              <a
                href="mailto:billing@realestategenie.app"
                className="text-blue-600 hover:underline"
              >
                billing@realestategenie.app
              </a>
            </div>
            <div>
              <span className="font-medium">Hours:</span> Monday-Friday, 9am-5pm EST
            </div>
            <div>
              <span className="font-medium">Response Time:</span> Within 24 hours
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
