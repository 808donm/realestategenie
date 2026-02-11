import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, ArrowLeft, Download, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AgentInvoicesPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // Get all invoices
  const { data: invoices } = await supabase
    .from("agent_invoices")
    .select("*")
    .eq("agent_id", userData.user.id)
    .order("invoice_date", { ascending: false });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    pending: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-yellow-100 text-yellow-800",
    void: "bg-gray-100 text-gray-800",
  };

  // Calculate totals
  const totalPaid = invoices
    ?.filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + parseFloat(i.total_amount.toString()), 0) || 0;

  const totalPending = invoices
    ?.filter((i) => i.status === "pending")
    .reduce((sum, i) => sum + parseFloat(i.total_amount.toString()), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link href="/app/billing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
        </Link>
      </div>

      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">All Invoices</h2>
        <p className="text-muted-foreground">View and manage your billing invoices</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalPaid.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${totalPending.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/app/billing/invoices/${invoice.id}`}
                  className="block p-4 border rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{invoice.invoice_number}</span>
                        <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.description || "Platform subscription"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Invoice Date: {new Date(invoice.invoice_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Due Date: {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                      {invoice.paid_at && (
                        <div className="text-sm text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Paid on {new Date(invoice.paid_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        ${parseFloat(invoice.total_amount.toString()).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        ${parseFloat(invoice.amount.toString()).toFixed(2)} + ${parseFloat(invoice.tax_amount.toString()).toFixed(2)} tax
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
