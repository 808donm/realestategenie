"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
} from "recharts";
import { OAHU_MONTHLY_DATA, PRICE_RANGES_BY_MONTH } from "@/lib/data/oahu-monthly-data";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const COLORS = {
  sf: "#dc2626",
  sfLight: "#fca5a5",
  condo: "#3b82f6",
  condoLight: "#93c5fd",
  green: "#10b981",
  amber: "#f59e0b",
  purple: "#8b5cf6",
};

export default function MonthlyStatisticsClient() {
  const [selectedMonth, setSelectedMonth] = useState(OAHU_MONTHLY_DATA[OAHU_MONTHLY_DATA.length - 1].month);

  const data = useMemo(() => {
    return OAHU_MONTHLY_DATA.find((m) => m.month === selectedMonth) ?? OAHU_MONTHLY_DATA[0];
  }, [selectedMonth]);

  const sf = data.singleFamily;
  const cd = data.condo;

  const priceRanges = PRICE_RANGES_BY_MONTH[selectedMonth] ?? [];

  // Comparison data for bar charts
  const salesComparison = [
    { category: "Sales", "Single-Family": sf.sales, Condo: cd.sales },
    { category: "Pending Sales", "Single-Family": sf.pendingSales, Condo: cd.pendingSales },
    { category: "New Listings", "Single-Family": sf.newListings, Condo: cd.newListings },
    { category: "Active Inventory", "Single-Family": sf.activeInventory, Condo: cd.activeInventory },
  ];

  const yoyChanges = [
    { metric: "Sales", sf: sf.salesYoY, condo: cd.salesYoY },
    { metric: "Median Price", sf: sf.medianPriceYoY, condo: cd.medianPriceYoY },
    { metric: "Pending", sf: sf.pendingSalesYoY, condo: cd.pendingSalesYoY },
    { metric: "New Listings", sf: sf.newListingsYoY, condo: cd.newListingsYoY },
    { metric: "Inventory", sf: sf.activeInventoryYoY, condo: cd.activeInventoryYoY },
  ];

  const domComparison = [
    { label: "SF Current", value: sf.medianDOM, color: COLORS.sf },
    { label: "SF Last Year", value: sf.prevYearMedianDOM, color: COLORS.sfLight },
    { label: "Condo Current", value: cd.medianDOM, color: COLORS.condo },
    { label: "Condo Last Year", value: cd.prevYearMedianDOM, color: COLORS.condoLight },
  ];

  const aboveAskingData = [
    { name: "SF Current", value: sf.aboveAskingPct, color: COLORS.sf },
    { name: "SF Last Year", value: sf.prevYearAboveAskingPct, color: COLORS.sfLight },
    { name: "Condo Current", value: cd.aboveAskingPct, color: COLORS.condo },
    { name: "Condo Last Year", value: cd.prevYearAboveAskingPct, color: COLORS.condoLight },
  ];

  const inventoryPie = [
    { name: "Single-Family", value: sf.activeInventory, color: COLORS.sf },
    { name: "Condo", value: cd.activeInventory, color: COLORS.condo },
  ];

  // Trend data across all months for line charts
  const trendData = useMemo(() => {
    return OAHU_MONTHLY_DATA.map((m) => ({
      month: m.label.replace(/\s\d{4}$/, "").slice(0, 3),
      fullLabel: m.label,
      sfMedianPrice: m.singleFamily.medianPrice,
      condoMedianPrice: m.condo.medianPrice,
      sfSales: m.singleFamily.sales,
      condoSales: m.condo.sales,
      sfDOM: m.singleFamily.medianDOM,
      condoDOM: m.condo.medianDOM,
      sfInventory: m.singleFamily.activeInventory,
      condoInventory: m.condo.activeInventory,
      sfPending: m.singleFamily.pendingSales,
      condoPending: m.condo.pendingSales,
    }));
  }, []);

  const hasMultipleMonths = OAHU_MONTHLY_DATA.length > 1;
  const chartsRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [agentProfile, setAgentProfile] = useState<{
    name: string;
    brokerage: string;
    email: string;
    phone: string;
    licenseNumber: string;
    headshotUrl: string;
    logoUrl: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.agent) {
          setAgentProfile({
            name: d.agent.display_name || "",
            brokerage: d.agent.brokerage_name || "",
            email: d.agent.email || "",
            phone: d.agent.phone_e164 || "",
            licenseNumber: d.agent.license_number || "",
            headshotUrl: d.agent.headshot_url || "",
            logoUrl: d.agent.logo_url || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const captureChart = async (chartId: string): Promise<string | null> => {
    const el = chartsRef.current?.querySelector(`[data-pdf-chart="${chartId}"]`) as HTMLElement | null;
    if (!el) return null;
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL("image/png");
  };

  const exportReport = async (format: "pdf" | "xlsx") => {
    const exportData = [
      {
        Metric: "Number of Sales",
        "Single-Family": sf.sales,
        "SF YoY": `${sf.salesYoY}%`,
        Condo: cd.sales,
        "Condo YoY": `${cd.salesYoY}%`,
      },
      {
        Metric: "Median Sales Price",
        "Single-Family": sf.medianPrice,
        "SF YoY": `${sf.medianPriceYoY}%`,
        Condo: cd.medianPrice,
        "Condo YoY": `${cd.medianPriceYoY}%`,
      },
      {
        Metric: "Median Days on Market",
        "Single-Family": sf.medianDOM,
        "SF YoY": `vs ${sf.prevYearMedianDOM}`,
        Condo: cd.medianDOM,
        "Condo YoY": `vs ${cd.prevYearMedianDOM}`,
      },
      {
        Metric: "Pending Sales",
        "Single-Family": sf.pendingSales,
        "SF YoY": `${sf.pendingSalesYoY}%`,
        Condo: cd.pendingSales,
        "Condo YoY": `${cd.pendingSalesYoY}%`,
      },
      {
        Metric: "New Listings",
        "Single-Family": sf.newListings,
        "SF YoY": `${sf.newListingsYoY}%`,
        Condo: cd.newListings,
        "Condo YoY": `${cd.newListingsYoY}%`,
      },
      {
        Metric: "Active Inventory",
        "Single-Family": sf.activeInventory,
        "SF YoY": `${sf.activeInventoryYoY}%`,
        Condo: cd.activeInventory,
        "Condo YoY": `${cd.activeInventoryYoY}%`,
      },
      {
        Metric: "% Above Asking",
        "Single-Family": `${sf.aboveAskingPct}%`,
        "SF YoY": `vs ${sf.prevYearAboveAskingPct}%`,
        Condo: `${cd.aboveAskingPct}%`,
        "Condo YoY": `vs ${cd.prevYearAboveAskingPct}%`,
      },
    ];

    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Statistics");
      XLSX.writeFile(wb, "Monthly_Statistics.xlsx");
    } else {
      setIsExporting(true);
      try {
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        let y = 0;
        let pageNum = 1;

        // Helper: check if we need a new page
        const ensureSpace = (needed: number) => {
          if (y + needed > ph - 20) {
            doc.addPage();
            pageNum++;
            y = 20;
          }
        };

        // Helper: draw a section title
        const sectionTitle = (title: string) => {
          ensureSpace(20);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 58, 95);
          doc.text(title, 10, y);
          y += 2;
          doc.setDrawColor(30, 58, 95);
          doc.setLineWidth(0.5);
          doc.line(10, y, pw - 10, y);
          y += 8;
          doc.setTextColor(0, 0, 0);
        };

        // Helper: draw a table
        const drawTable = (headers: string[], rows: string[][], colWidths?: number[]) => {
          const cw = colWidths || headers.map(() => (pw - 20) / headers.length);
          ensureSpace(14);
          doc.setFillColor(30, 58, 95);
          doc.rect(10, y - 4, pw - 20, 8, "F");
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          let x = 10;
          headers.forEach((h, i) => {
            doc.text(h, x + 2, y);
            x += cw[i];
          });
          y += 7;
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          rows.forEach((row, ri) => {
            ensureSpace(8);
            if (ri % 2 === 0) {
              doc.setFillColor(245, 247, 250);
              doc.rect(10, y - 4, pw - 20, 7, "F");
            }
            x = 10;
            row.forEach((cell, ci) => {
              doc.text(cell, x + 2, y);
              x += cw[ci];
            });
            y += 7;
          });
          y += 4;
        };

        // Helper: add a chart image to the PDF
        const addChartImage = async (chartId: string, imgHeight: number = 80) => {
          const imgData = await captureChart(chartId);
          if (!imgData) return;
          ensureSpace(imgHeight + 6);
          const imgWidth = pw - 20;
          doc.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);
          y += imgHeight + 6;
        };

        // ===== PAGE 1: Blue Header + Agent Info + KPIs + Highlights =====
        // Blue header banner
        doc.setFillColor(30, 58, 95);
        doc.rect(0, 0, pw, 55, "F");
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("Monthly Market Statistics", pw / 2, 22, { align: "center" });
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("Oahu Monthly Residential Resales \u2014 Honolulu Board of REALTORS\u00AE", pw / 2, 34, {
          align: "center",
        });
        doc.setFontSize(10);
        doc.text(data.label, pw / 2, 46, { align: "center" });
        doc.setTextColor(0, 0, 0);
        y = 62;

        // Agent branding section below blue header
        const hasAgent = agentProfile?.name;
        if (hasAgent) {
          const photoSize = 28;
          const agentBlockX = 14;
          const agentTextX = agentBlockX + photoSize + 8;
          const agentStartY = y;

          // Agent headshot (left side)
          if (agentProfile.headshotUrl) {
            try {
              const imgResponse = await fetch(agentProfile.headshotUrl);
              const blob = await imgResponse.blob();
              const imgDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              doc.addImage(imgDataUrl, "JPEG", agentBlockX, agentStartY, photoSize, photoSize);
            } catch {
              // Skip headshot if it fails to load
            }
          }

          // Agent name
          let ty = agentStartY + 6;
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 58, 95);
          doc.text(agentProfile.name, agentTextX, ty);
          ty += 6;

          // License number
          if (agentProfile.licenseNumber) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(`License #${agentProfile.licenseNumber}`, agentTextX, ty);
            ty += 5;
          }

          // Phone
          if (agentProfile.phone) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(agentProfile.phone, agentTextX, ty);
            ty += 5;
          }

          // Brokerage name + logo (right side)
          if (agentProfile.brokerage) {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(80, 80, 80);
            doc.text(agentProfile.brokerage, pw - 14, agentStartY + 8, { align: "right" });

            // Brokerage logo below name
            if (agentProfile.logoUrl) {
              try {
                const logoResponse = await fetch(agentProfile.logoUrl);
                const logoBlob = await logoResponse.blob();
                const logoDataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(logoBlob);
                });
                doc.addImage(logoDataUrl, "PNG", pw - 48, agentStartY + 12, 34, 18);
              } catch {
                // Skip logo if it fails to load
              }
            }
          }

          y = agentStartY + photoSize + 6;

          // Thin divider line
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.3);
          doc.line(14, y, pw - 14, y);
          y += 6;
        }

        // Headline
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 95);
        doc.text("Oahu Housing Market", 10, y);
        y += 7;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        const headlineLines = doc.splitTextToSize(data.headline, pw - 20);
        doc.text(headlineLines, 10, y);
        y += headlineLines.length * 5 + 6;
        doc.setTextColor(0, 0, 0);

        // KPI Cards
        sectionTitle("Key Performance Indicators");
        const kpiData = [
          {
            label: "SF Median Price",
            value: fmt(sf.medianPrice),
            change: `${sf.medianPriceYoY >= 0 ? "+" : ""}${sf.medianPriceYoY}% YoY`,
          },
          {
            label: "Condo Median Price",
            value: fmt(cd.medianPrice),
            change: `${cd.medianPriceYoY >= 0 ? "+" : ""}${cd.medianPriceYoY}% YoY`,
          },
          { label: "Total Sales", value: `${sf.sales + cd.sales}`, change: `SF: ${sf.sales} | Condo: ${cd.sales}` },
          {
            label: "Pending Sales",
            value: `${sf.pendingSales + cd.pendingSales}`,
            change: `SF: ${sf.pendingSalesYoY >= 0 ? "+" : ""}${sf.pendingSalesYoY}% | Condo: ${cd.pendingSalesYoY >= 0 ? "+" : ""}${cd.pendingSalesYoY}%`,
          },
        ];
        const kpiW = (pw - 20 - 18) / 4;
        const kpiColors = ["#dc2626", "#3b82f6", "#10b981", "#8b5cf6"];
        kpiData.forEach((kpi, i) => {
          const kx = 10 + i * (kpiW + 6);
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.3);
          doc.roundedRect(kx, y, kpiW, 28, 3, 3, "S");
          const rgb = parseInt(kpiColors[i].slice(1), 16);
          doc.setFillColor((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255);
          doc.rect(kx, y, 2, 28, "F");
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(107, 114, 128);
          doc.text(kpi.label, kx + 6, y + 7);
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(kpi.value, kx + 6, y + 16);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(107, 114, 128);
          doc.text(kpi.change, kx + 6, y + 23);
        });
        y += 36;

        // Market Highlights
        sectionTitle("Market Highlights");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        data.highlights.forEach((h) => {
          ensureSpace(10);
          const lines = doc.splitTextToSize(`\u2022  ${h}`, pw - 30);
          doc.text(lines, 14, y);
          y += lines.length * 4.5 + 2;
        });
        y += 2;
        doc.setTextColor(0, 0, 0);

        // ===== PAGE 2: Tables + Graphs =====
        doc.addPage();
        pageNum++;
        y = 20;

        // Sales table
        sectionTitle("Sales, Pending, Listings & Inventory");
        drawTable(
          ["Category", "Single-Family", "Condo"],
          salesComparison.map((r) => [r.category, r["Single-Family"].toLocaleString(), r.Condo.toLocaleString()]),
          [(pw - 20) * 0.4, (pw - 20) * 0.3, (pw - 20) * 0.3],
        );

        // YoY table
        sectionTitle("Year-over-Year Changes (%)");
        drawTable(
          ["Metric", "Single-Family", "Condo"],
          yoyChanges.map((r) => [
            r.metric,
            `${r.sf >= 0 ? "+" : ""}${r.sf.toFixed(1)}%`,
            `${r.condo >= 0 ? "+" : ""}${r.condo.toFixed(1)}%`,
          ]),
          [(pw - 20) * 0.4, (pw - 20) * 0.3, (pw - 20) * 0.3],
        );

        // Sales comparison graph
        await addChartImage("sales-comparison", 70);

        // YoY changes graph
        await addChartImage("yoy-changes", 70);

        // ===== PAGE 3: Remaining Tables =====
        doc.addPage();
        pageNum++;
        y = 20;

        sectionTitle("Median Days on Market");
        drawTable(
          ["Property Type", "Current", "Last Year", "Change"],
          [
            [
              "Single-Family",
              `${sf.medianDOM} days`,
              `${sf.prevYearMedianDOM} days`,
              `${sf.medianDOM - sf.prevYearMedianDOM >= 0 ? "+" : ""}${sf.medianDOM - sf.prevYearMedianDOM} days`,
            ],
            [
              "Condo",
              `${cd.medianDOM} days`,
              `${cd.prevYearMedianDOM} days`,
              `${cd.medianDOM - cd.prevYearMedianDOM >= 0 ? "+" : ""}${cd.medianDOM - cd.prevYearMedianDOM} days`,
            ],
          ],
          [(pw - 20) * 0.3, (pw - 20) * 0.23, (pw - 20) * 0.23, (pw - 20) * 0.24],
        );

        y += 4;
        sectionTitle("Sales Above Asking Price");
        drawTable(
          ["Property Type", "Current", "Last Year"],
          [
            ["Single-Family", `${sf.aboveAskingPct}%`, `${sf.prevYearAboveAskingPct}%`],
            ["Condo", `${cd.aboveAskingPct}%`, `${cd.prevYearAboveAskingPct}%`],
          ],
          [(pw - 20) * 0.4, (pw - 20) * 0.3, (pw - 20) * 0.3],
        );

        sectionTitle("Active Inventory");
        drawTable(
          ["Property Type", "Active Listings", "% of Total"],
          [
            [
              "Single-Family",
              sf.activeInventory.toLocaleString(),
              `${((sf.activeInventory / (sf.activeInventory + cd.activeInventory)) * 100).toFixed(1)}%`,
            ],
            [
              "Condo",
              cd.activeInventory.toLocaleString(),
              `${((cd.activeInventory / (sf.activeInventory + cd.activeInventory)) * 100).toFixed(1)}%`,
            ],
            ["Total", (sf.activeInventory + cd.activeInventory).toLocaleString(), "100%"],
          ],
          [(pw - 20) * 0.4, (pw - 20) * 0.3, (pw - 20) * 0.3],
        );

        if (priceRanges.length > 0) {
          sectionTitle("Sales by Price Range");
          drawTable(
            ["Price Range", "SF Sales", "Condo Sales", "Total"],
            priceRanges.map((r: any) => [
              r.range,
              (r.sfSales ?? 0).toLocaleString(),
              (r.condoSales ?? 0).toLocaleString(),
              ((r.sfSales ?? 0) + (r.condoSales ?? 0)).toLocaleString(),
            ]),
            [(pw - 20) * 0.34, (pw - 20) * 0.22, (pw - 20) * 0.22, (pw - 20) * 0.22],
          );
        }

        // Detailed Statistics table
        sectionTitle(`Detailed Statistics \u2014 ${data.label}`);
        drawTable(
          ["Metric", "Single-Family", "SF YoY", "Condo", "Condo YoY"],
          exportData.map((row) => [
            row.Metric,
            String(row["Single-Family"]).includes("$")
              ? String(row["Single-Family"])
              : typeof row["Single-Family"] === "number"
                ? row["Single-Family"].toLocaleString()
                : String(row["Single-Family"]),
            row["SF YoY"],
            String(row.Condo).includes("$")
              ? String(row.Condo)
              : typeof row.Condo === "number"
                ? row.Condo.toLocaleString()
                : String(row.Condo),
            row["Condo YoY"],
          ]),
          [(pw - 20) * 0.28, (pw - 20) * 0.2, (pw - 20) * 0.14, (pw - 20) * 0.2, (pw - 20) * 0.18],
        );

        // ===== Additional pages for remaining charts =====
        // DOM & Above Asking charts
        doc.addPage();
        pageNum++;
        y = 20;
        sectionTitle("Median Days on Market");
        await addChartImage("dom-comparison", 75);
        sectionTitle("Sales Above Asking Price");
        await addChartImage("above-asking", 75);

        // Inventory pie + Price range chart
        doc.addPage();
        pageNum++;
        y = 20;
        sectionTitle("Active Inventory");
        await addChartImage("inventory-pie", 80);
        if (priceRanges.length > 0) {
          sectionTitle("Sales by Price Range");
          await addChartImage("price-range", 80);
        }

        // ===== Trend Charts (if multiple months) =====
        if (hasMultipleMonths) {
          doc.addPage();
          pageNum++;
          y = 20;
          sectionTitle("Median Price Trend");
          await addChartImage("median-price-trend", 85);
          sectionTitle("Sales Trend");
          await addChartImage("sales-trend", 80);

          doc.addPage();
          pageNum++;
          y = 20;
          sectionTitle("Days on Market Trend");
          await addChartImage("dom-trend", 80);
          sectionTitle("Active Inventory Trend");
          await addChartImage("inventory-trend", 80);

          doc.addPage();
          pageNum++;
          y = 20;
          sectionTitle("Pending Sales Trend");
          await addChartImage("pending-trend", 80);
        }

        // Footer on every page — Honolulu Board of REALTORS branding
        const totalPages = pageNum;
        for (let p = 1; p <= totalPages; p++) {
          doc.setPage(p);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(156, 163, 175);
          doc.text(
            "Source: Honolulu Board of REALTORS\u00AE / HiCentral MLS, Ltd. \u2014 Resales of existing properties only",
            pw / 2,
            ph - 12,
            { align: "center" },
          );
          doc.text(`Generated ${new Date().toLocaleDateString()} \u2014 Page ${p} of ${totalPages}`, pw / 2, ph - 7, {
            align: "center",
          });
        }

        doc.save(`Monthly_Market_Statistics_${data.label.replace(/\s/g, "_")}.pdf`);
      } finally {
        setIsExporting(false);
      }
    }
  };

  const cardStyle: React.CSSProperties = {
    padding: 20,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  };

  const yoyColor = (val: number) => (val >= 0 ? "#059669" : "#dc2626");
  const yoyText = (val: number) => `${val >= 0 ? "+" : ""}${val}%`;

  return (
    <div>
      {/* Month Header + Selector */}
      <div
        style={{
          padding: "20px 24px",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)",
          borderRadius: 12,
          color: "#fff",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{data.label}</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Oahu Housing Market: {data.headline}</div>
        </div>
        {OAHU_MONTHLY_DATA.length > 1 && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
            }}
          >
            {OAHU_MONTHLY_DATA.map((m) => (
              <option key={m.month} value={m.month} style={{ color: "#1e3a5f" }}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="noprint" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={() => exportReport("xlsx")}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            background: "#fff",
            color: "#374151",
            cursor: "pointer",
          }}
        >
          Export Excel
        </button>
        <button
          onClick={() => exportReport("pdf")}
          disabled={isExporting}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            border: "none",
            borderRadius: 6,
            background: isExporting ? "#9ca3af" : "#dc2626",
            color: "#fff",
            cursor: isExporting ? "wait" : "pointer",
          }}
        >
          {isExporting ? "Generating PDF..." : "Export PDF"}
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.sf}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>SF Median Price</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(sf.medianPrice)}</div>
          <div style={{ fontSize: 13, color: yoyColor(sf.medianPriceYoY), fontWeight: 600 }}>
            {yoyText(sf.medianPriceYoY)} YoY
          </div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.condo}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Condo Median Price</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(cd.medianPrice)}</div>
          <div style={{ fontSize: 13, color: yoyColor(cd.medianPriceYoY), fontWeight: 600 }}>
            {yoyText(cd.medianPriceYoY)} YoY
          </div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.green}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Total Sales</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.sales + cd.sales}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            SF: {sf.sales} | Condo: {cd.sales}
          </div>
        </div>
        <div style={{ ...cardStyle, borderLeft: `4px solid ${COLORS.purple}` }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Pending Sales</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{sf.pendingSales + cd.pendingSales}</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            <span style={{ color: yoyColor(sf.pendingSalesYoY) }}>SF {yoyText(sf.pendingSalesYoY)}</span>
            {" | "}
            <span style={{ color: yoyColor(cd.pendingSalesYoY) }}>Condo {yoyText(cd.pendingSalesYoY)}</span>
          </div>
        </div>
      </div>

      {/* Market Highlights */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Market Highlights</h3>
        <ul style={{ margin: 0, padding: "0 0 0 20px", fontSize: 14, lineHeight: 2, color: "#374151" }}>
          {data.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>

      <div ref={chartsRef}>
        {/* Trend Line Charts (only shown when 2+ months of data) */}
        {hasMultipleMonths && (
          <>
            {/* Median Price Trend */}
            <div data-pdf-chart="median-price-trend" style={{ ...cardStyle, marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Median Price Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => fmt(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sfMedianPrice"
                    name="Single-Family"
                    stroke={COLORS.sf}
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="condoMedianPrice"
                    name="Condo"
                    stroke={COLORS.condo}
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Sales & Pending Trend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <div data-pdf-chart="sales-trend" style={{ ...cardStyle, flex: "1 1 380px" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales Trend</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sfSales"
                      name="SF Sales"
                      stroke={COLORS.sf}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="condoSales"
                      name="Condo Sales"
                      stroke={COLORS.condo}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div data-pdf-chart="dom-trend" style={{ ...cardStyle, flex: "1 1 380px" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Days on Market Trend</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => `${value} days`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sfDOM"
                      name="SF DOM"
                      stroke={COLORS.sf}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="condoDOM"
                      name="Condo DOM"
                      stroke={COLORS.condo}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory & Pending Trend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <div data-pdf-chart="inventory-trend" style={{ ...cardStyle, flex: "1 1 380px" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Active Inventory Trend</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sfInventory"
                      name="SF Inventory"
                      stroke={COLORS.sf}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="condoInventory"
                      name="Condo Inventory"
                      stroke={COLORS.condo}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div data-pdf-chart="pending-trend" style={{ ...cardStyle, flex: "1 1 380px" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Pending Sales Trend</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sfPending"
                      name="SF Pending"
                      stroke={COLORS.sf}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="condoPending"
                      name="Condo Pending"
                      stroke={COLORS.condo}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* Sales & Inventory Bar Chart */}
        <div data-pdf-chart="sales-comparison" style={{ ...cardStyle, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales, Pending, Listings & Inventory</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={salesComparison} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Single-Family" fill={COLORS.sf} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Condo" fill={COLORS.condo} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Year-over-Year Changes */}
        <div data-pdf-chart="yoy-changes" style={{ ...cardStyle, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Year-over-Year Changes (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yoyChanges} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="sf" name="Single-Family" fill={COLORS.sf} radius={[4, 4, 0, 0]} />
              <Bar dataKey="condo" name="Condo" fill={COLORS.condo} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Price Range Distribution */}
        {priceRanges.length > 0 && (
          <div data-pdf-chart="price-range" style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales by Price Range</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={priceRanges} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sfSales" name="Single-Family" fill={COLORS.sf} radius={[4, 4, 0, 0]} />
                <Bar dataKey="condoSales" name="Condo" fill={COLORS.condo} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Days on Market & Above Asking */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div data-pdf-chart="dom-comparison" style={{ ...cardStyle, flex: "1 1 380px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Median Days on Market</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={domComparison} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => `${value} days`} />
                <Bar dataKey="value" name="Days" radius={[6, 6, 0, 0]}>
                  {domComparison.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div data-pdf-chart="above-asking" style={{ ...cardStyle, flex: "1 1 380px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>Sales Above Asking Price (%)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={aboveAskingData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Bar dataKey="value" name="% Above Asking" radius={[6, 6, 0, 0]}>
                  {aboveAskingData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Inventory Split */}
        <div data-pdf-chart="inventory-pie" style={{ ...cardStyle, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Active Inventory Split</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={inventoryPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={45}
                label={(props: any) => `${props.name}: ${props.value.toLocaleString()}`}
                labelLine
              >
                {inventoryPie.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>
            Total: {(sf.activeInventory + cd.activeInventory).toLocaleString()} active listings
          </div>
        </div>

        {/* Detailed Data Table */}
        <div style={{ ...cardStyle, marginBottom: 24, overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>Detailed Statistics — {data.label}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th
                  style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}
                >
                  Metric
                </th>
                <th
                  style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: COLORS.sf }}
                >
                  Single-Family
                </th>
                <th
                  style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}
                >
                  YoY Change
                </th>
                <th
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: 12,
                    color: COLORS.condo,
                  }}
                >
                  Condo
                </th>
                <th
                  style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}
                >
                  YoY Change
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Number of Sales",
                  sfVal: sf.sales.toString(),
                  sfYoY: sf.salesYoY,
                  cdVal: cd.sales.toString(),
                  cdYoY: cd.salesYoY,
                },
                {
                  label: "Median Sales Price",
                  sfVal: fmt(sf.medianPrice),
                  sfYoY: sf.medianPriceYoY,
                  cdVal: fmt(cd.medianPrice),
                  cdYoY: cd.medianPriceYoY,
                },
                {
                  label: "Median Days on Market",
                  sfVal: `${sf.medianDOM} days`,
                  sfYoY: null,
                  sfAlt: `vs ${sf.prevYearMedianDOM}`,
                  cdVal: `${cd.medianDOM} days`,
                  cdYoY: null,
                  cdAlt: `vs ${cd.prevYearMedianDOM}`,
                },
                {
                  label: "Pending Sales",
                  sfVal: sf.pendingSales.toString(),
                  sfYoY: sf.pendingSalesYoY,
                  cdVal: cd.pendingSales.toString(),
                  cdYoY: cd.pendingSalesYoY,
                },
                {
                  label: "New Listings",
                  sfVal: sf.newListings.toString(),
                  sfYoY: sf.newListingsYoY,
                  cdVal: cd.newListings.toString(),
                  cdYoY: cd.newListingsYoY,
                },
                {
                  label: "Active Inventory",
                  sfVal: sf.activeInventory.toString(),
                  sfYoY: sf.activeInventoryYoY,
                  cdVal: cd.activeInventory.toLocaleString(),
                  cdYoY: cd.activeInventoryYoY,
                },
                {
                  label: "% Above Asking",
                  sfVal: `${sf.aboveAskingPct}%`,
                  sfYoY: null,
                  sfAlt: `vs ${sf.prevYearAboveAskingPct}%`,
                  cdVal: `${cd.aboveAskingPct}%`,
                  cdYoY: null,
                  cdAlt: `vs ${cd.prevYearAboveAskingPct}%`,
                },
              ].map((row: any, i) => (
                <tr
                  key={row.label}
                  style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.label}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{row.sfVal}</td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      color: row.sfYoY !== null ? yoyColor(row.sfYoY) : "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    {row.sfYoY !== null ? yoyText(row.sfYoY) : row.sfAlt}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{row.cdVal}</td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      color: row.cdYoY !== null ? yoyColor(row.cdYoY) : "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    {row.cdYoY !== null ? yoyText(row.cdYoY) : row.cdAlt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* end chartsRef */}

      {/* Source Attribution */}
      <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
        Source: Honolulu Board of REALTORS® / HiCentral MLS, Ltd. &middot; Resales of existing properties only &middot;
        Does not include new home sales
      </div>
    </div>
  );
}
