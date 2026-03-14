"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export interface ExportColumn {
  key: string;
  label: string;
  width?: number; // PDF column width hint (in mm)
}

export interface BrandConfig {
  agentName?: string;
  brokerageName?: string;
  themeColor?: string; // hex color
  logoUrl?: string;
}

interface ExportToolbarProps {
  /** Title shown on the exported document */
  title: string;
  /** Column definitions for the table */
  columns: ExportColumn[];
  /** Data rows — each row is a Record matching column keys */
  getData: () => Record<string, any>[];
  /** Optional branding config for PDFs */
  brand?: BrandConfig;
  /** Optional filename prefix (defaults to title) */
  filenamePrefix?: string;
  /** Compact mode — smaller buttons */
  compact?: boolean;
}

export default function ExportToolbar({ title, columns, getData, brand, filenamePrefix, compact }: ExportToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const prefix = filenamePrefix || title.replace(/\s+/g, "_");
  const dateSuffix = new Date().toISOString().slice(0, 10);

  const exportExcel = () => {
    const rows = getData();
    const ws = XLSX.utils.json_to_sheet(rows.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => { obj[col.label] = row[col.key] ?? ""; });
      return obj;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    XLSX.writeFile(wb, `${prefix}_${dateSuffix}.xlsx`);
    setIsOpen(false);
  };

  const exportCSV = () => {
    const rows = getData();
    const ws = XLSX.utils.json_to_sheet(rows.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => { obj[col.label] = row[col.key] ?? ""; });
      return obj;
    }));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}_${dateSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const exportPDF = () => {
    const rows = getData();
    const doc = new jsPDF({ orientation: rows.length > 50 || columns.length > 6 ? "landscape" : "portrait" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const themeColor = brand?.themeColor || "#1e3a5f";

    // Parse hex to RGB
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const brandRgb = hexToRgb(themeColor);

    // ===== BRANDED COVER PAGE =====
    // Top color bar
    doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.rect(0, 0, pw, 50, "F");

    // Title on color bar
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(title, pw / 2, 28, { align: "center" });

    // Subtitle
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString()} | ${rows.length} records`, pw / 2, 40, { align: "center" });

    // Agent / Brokerage branding
    let brandY = 62;
    doc.setTextColor(0, 0, 0);
    if (brand?.agentName) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(brand.agentName, pw / 2, brandY, { align: "center" });
      brandY += 7;
    }
    if (brand?.brokerageName) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(brand.brokerageName, pw / 2, brandY, { align: "center" });
      brandY += 7;
    }

    // Thin divider
    doc.setDrawColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.setLineWidth(0.5);
    doc.line(30, brandY + 4, pw - 30, brandY + 4);

    // Footer branding on cover
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text("Powered by The Real Estate Genie™", pw / 2, ph - 12, { align: "center" });

    // ===== DATA PAGES =====
    doc.addPage();
    let y = 18;

    // Page header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(title, 14, y);
    y += 10;

    // Calculate column positions
    const margin = 14;
    const tableWidth = pw - margin * 2;
    const totalHintWidth = columns.reduce((sum, c) => sum + (c.width || 1), 0);
    const colPositions: number[] = [];
    let accX = margin;
    for (const col of columns) {
      colPositions.push(accX);
      accX += (tableWidth * (col.width || 1)) / totalHintWidth;
    }

    // Table header row
    doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.rect(margin, y - 4, tableWidth, 7, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    columns.forEach((col, i) => doc.text(col.label, colPositions[i] + 1, y));
    y += 7;

    // Data rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);

    rows.forEach((row, rowIdx) => {
      if (y > ph - 20) {
        // Footer
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        doc.text(`${title} | Page ${doc.getNumberOfPages() - 1}`, pw / 2, ph - 8, { align: "center" });

        doc.addPage();
        y = 18;
        // Re-draw header
        doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
        doc.rect(margin, y - 4, tableWidth, 7, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        columns.forEach((col, i) => doc.text(col.label, colPositions[i] + 1, y));
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(7);
      }

      // Zebra stripe
      if (rowIdx % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, y - 3.5, tableWidth, 5, "F");
      }

      const colWidths = columns.map((c, i) => {
        const nextPos = i < columns.length - 1 ? colPositions[i + 1] : margin + tableWidth;
        return nextPos - colPositions[i] - 2;
      });

      columns.forEach((col, i) => {
        const val = String(row[col.key] ?? "");
        const maxChars = Math.floor(colWidths[i] / 1.7);
        doc.text(val.slice(0, maxChars), colPositions[i] + 1, y);
      });
      y += 5;
    });

    // Final page footer
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`${title} | Page ${doc.getNumberOfPages() - 1}`, pw / 2, ph - 8, { align: "center" });

    doc.save(`${prefix}_${dateSuffix}.pdf`);
    setIsOpen(false);
  };

  const btnClass = compact
    ? "flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
    : "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors";

  return (
    <div className="noprint relative inline-block">
      <button onClick={() => setIsOpen(!isOpen)} className={btnClass}>
        <Download className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        Export
        <ChevronDown className={compact ? "w-3 h-3" : "w-3 h-3"} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
            <button onClick={exportPDF} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <FileText className="w-4 h-4 text-red-500" />
              Branded PDF
            </button>
            <button onClick={exportExcel} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Excel (.xlsx)
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-b-lg">
              <FileText className="w-4 h-4 text-blue-500" />
              CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
