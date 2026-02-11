import { supabaseServer } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download, CreditCard, FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AgentInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Get invoice details
  const { data: invoice, error } = await supabase
    .from("agent_invoices")
    .select("*, agent_subscriptions(plan_type)")
    .eq("id", id)
    .eq("agent_id", userData.user.id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // Parse line items
  const lineItems = invoice.line_items || [];

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    pending: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-yellow-100 text-yellow-800",
    void: "bg-gray-100 text-gray-800",
  };

  const isPending = invoice.status === "pending";
  const isPaid = invoice.status === "paid";
  const dueDate = new Date(invoice.due_date);
  const isOverdue = isPending && dueDate < new Date();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link href="/app/billing/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Invoice {invoice.invoice_number}</h2>
          <p className="text-muted-foreground">
            {new Date(invoice.invoice_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
          {invoice.status.toUpperCase()}
        </Badge>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              <div>
                <div className="font-semibold text-red-900">Payment Overdue</div>
                <p className="text-sm text-red-700">
                  This invoice was due on {dueDate.toLocaleDateString()}. Please pay as soon as possible to avoid service interruption.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                    {dueDate.toLocaleDateString()}
                    {isOverdue && " (Overdue)"}
                  </p>
                </div>
                {invoice.paid_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Paid On</p>
                    <p className="font-medium text-green-600">
                      {new Date(invoice.paid_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {invoice.payment_method && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-medium capitalize">{invoice.payment_method}</p>
                  </div>
                )}
              </div>

              {invoice.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{invoice.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lineItems.length > 0 ? (
                  lineItems.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × ${parseFloat(item.unit_price).toFixed(2)}
                        </div>
                      </div>
                      <div className="font-semibold">
                        ${parseFloat(item.amount).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">{invoice.description || "Platform Subscription"}</div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.agent_subscriptions?.plan_type} plan
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      ${parseFloat(invoice.amount.toString()).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">
                      ${parseFloat(invoice.tax_amount.toString()).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>${parseFloat(invoice.total_amount.toString()).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Amount Due */}
          <Card>
            <CardHeader>
              <CardTitle>Amount {isPaid ? "Paid" : "Due"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${isPaid ? "text-green-600" : "text-orange-600"}`}>
                ${parseFloat(invoice.total_amount.toString()).toFixed(2)}
              </div>
              {!isPaid && (
                <p className="text-sm text-muted-foreground mt-2">
                  Due by {dueDate.toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isPending && (
                <Link href={`/app/billing/invoices/${invoice.id}/pay`}>
                  <Button className="w-full" size="lg">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </Button>
                </Link>
              )}
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Print Invoice
              </Button>
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                If you have questions about this invoice, please contact our billing support.
              </p>
              <Link href="/app/support">
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
