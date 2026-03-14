"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";

interface CalculatorBrandedExportProps {
  /** Calculator name for the cover page */
  calculatorName: string;
  /** Summary data to display on cover page */
  summaryData: Record<string, string | number>;
  /** The property address if applicable */
  propertyAddress?: string;
}

/**
 * Branded cover page generator for calculator exports.
 * Fetches agent profile and adds a branded cover page before the calculator data.
 * Usage: Place this on calculator pages — it provides a "Branded PDF" button.
 */
export default function CalculatorBrandedExport({ calculatorName, summaryData, propertyAddress }: CalculatorBrandedExportProps) {
  const [agentProfile, setAgentProfile] = useState<{ name: string; brokerage: string; email: string; phone: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.agent) {
          setAgentProfile({
            name: data.agent.display_name || "",
            brokerage: data.agent.brokerage_name || "",
            email: data.agent.email || "",
            phone: data.agent.phone_e164 || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const generateBrandedPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const themeColor = "#1e3a5f";

    // Cover page — branded header bar
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pw, 55, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(calculatorName, pw / 2, 25, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Financial Analysis Report", pw / 2, 35, { align: "center" });
    doc.text(`Generated ${new Date().toLocaleDateString()}`, pw / 2, 45, { align: "center" });

    // Agent branding
    let y = 70;
    doc.setTextColor(0, 0, 0);
    if (agentProfile?.name) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(agentProfile.name, pw / 2, y, { align: "center" });
      y += 8;
    }
    if (agentProfile?.brokerage) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(agentProfile.brokerage, pw / 2, y, { align: "center" });
      y += 6;
    }
    if (agentProfile?.phone || agentProfile?.email) {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const contactLine = [agentProfile.phone, agentProfile.email].filter(Boolean).join(" | ");
      doc.text(contactLine, pw / 2, y, { align: "center" });
      y += 6;
    }

    if (propertyAddress) {
      y += 10;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 95);
      doc.text("Property:", pw / 2, y, { align: "center" });
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(propertyAddress, pw / 2, y, { align: "center" });
      y += 10;
    }

    // Divider
    y += 5;
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(30, y, pw - 30, y);
    y += 15;

    // Summary data table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("Analysis Summary", 30, y);
    y += 10;

    doc.setFontSize(11);
    const entries = Object.entries(summaryData);
    entries.forEach(([key, value]) => {
      if (y > ph - 30) { doc.addPage(); y = 20; }

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(key, 30, y);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(String(value), pw - 30, y, { align: "right" });

      y += 3;
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.2);
      doc.line(30, y, pw - 30, y);
      y += 7;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text("Powered by The Real Estate Genie™", pw / 2, ph - 12, { align: "center" });
    doc.text("This analysis is for informational purposes only and does not constitute financial advice.", pw / 2, ph - 7, { align: "center" });

    doc.save(`${calculatorName.replace(/\s+/g, "_")}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <button
      onClick={generateBrandedPDF}
      className="noprint flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Branded PDF
    </button>
  );
}
