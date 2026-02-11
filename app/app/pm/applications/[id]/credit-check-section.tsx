"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";

type CreditCheckProps = {
  application: any;
};

export default function CreditCheckSection({ application }: CreditCheckProps) {
  const [creditScore, setCreditScore] = useState(
    application.credit_score?.toString() || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const creditServices = [
    {
      name: "TransUnion SmartMove",
      url: "https://www.mysmartmove.com/",
      description: "Most popular tenant screening service",
    },
    {
      name: "Experian RentBureau",
      url: "https://www.experian.com/rentbureau/landlords.html",
      description: "Comprehensive credit and rental history",
    },
    {
      name: "MyRental",
      url: "https://myrental.com/",
      description: "Affordable tenant screening reports",
    },
  ];

  const handleSaveCreditInfo = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch(`/api/pm/applications/${application.id}/credit-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credit_score: creditScore ? parseInt(creditScore) : null,
          credit_check_result: creditScore ? "pending" : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setSaveMessage("Credit information saved");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("Error saving credit information");
    } finally {
      setIsSaving(false);
    }
  };

  const getCreditResultBadge = () => {
    if (!application.credit_check_result) return null;

    const badges = {
      approved: (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      ),
      declined: (
        <Badge variant="danger" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Declined
        </Badge>
      ),
      pending: (
        <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      ),
    };

    return badges[application.credit_check_result as keyof typeof badges];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Credit Check</CardTitle>
          {getCreditResultBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credit Check Services */}
        <div>
          <div className="text-sm font-semibold mb-2">Run Credit Check</div>
          <div className="space-y-2">
            {creditServices.map((service) => (
              <a
                key={service.name}
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {service.name}
                      <ExternalLink className="h-3 w-3" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {service.description}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Manual Credit Score Entry */}
        <div className="pt-4 border-t">
          <Label htmlFor="credit_score">Credit Score</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="credit_score"
              type="number"
              min="300"
              max="850"
              placeholder="e.g., 720"
              value={creditScore}
              onChange={(e) => setCreditScore(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSaveCreditInfo}
              disabled={isSaving}
              variant="outline"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
          {saveMessage && (
            <div className="text-xs text-muted-foreground mt-2">
              {saveMessage}
            </div>
          )}
          {application.credit_score && (
            <div className="text-sm mt-2">
              Current Score: <strong>{application.credit_score}</strong>
            </div>
          )}
        </div>

        {/* Credit Check Notes */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <strong>Note:</strong> After running a credit check through one of the services
          above, return here to enter the credit score and update the application status.
        </div>
      </CardContent>
    </Card>
  );
}
