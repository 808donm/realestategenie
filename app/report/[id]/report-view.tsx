"use client";

import PropertyReportView from "@/components/reports/property-report-view";
import type { PropertyReportData } from "@/lib/documents/property-intelligence-report";

interface ReportRecord {
  id: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  report_data: PropertyReportData;
  agent_branding: {
    displayName: string;
    email: string;
    phone?: string;
    licenseNumber?: string;
  };
  created_at: string;
}

export default function ReportView({ report }: { report: ReportRecord }) {
  return (
    <PropertyReportView
      data={report.report_data}
      branding={report.agent_branding}
      createdAt={report.created_at}
    />
  );
}
