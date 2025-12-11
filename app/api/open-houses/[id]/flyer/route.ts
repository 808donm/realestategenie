import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import jsPDF from "jspdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();

    // Get open house event details
    const { data: event, error } = await supabase
      .from("open_house_events")
      .select(`
        id,
        address,
        start_at,
        end_at,
        beds,
        baths,
        sqft,
        price,
        key_features,
        listing_description
      `)
      .eq("id", id)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Open house not found" }, { status: 404 });
    }

    // Get agent details
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("display_name, phone_e164, email, license_number, brokerage_name, photo_url")
      .eq("id", user.id)
      .single();

    // Generate PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // Header - Property Address
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text(event.address, margin, 25);

    // Property Details Box
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    let yPos = 40;

    if (event.price) {
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 100, 0);
      pdf.text(`$${event.price.toLocaleString()}`, margin, yPos);
      pdf.setTextColor(0, 0, 0);
      yPos += 10;
    }

    // Property stats
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "normal");
    const stats = [];
    if (event.beds) stats.push(`${event.beds} Beds`);
    if (event.baths) stats.push(`${event.baths} Baths`);
    if (event.sqft) stats.push(`${event.sqft.toLocaleString()} sqft`);

    if (stats.length > 0) {
      pdf.text(stats.join(" • "), margin, yPos);
      yPos += 10;
    }

    // Listing Description
    if (event.listing_description) {
      yPos += 5;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      const lines = pdf.splitTextToSize(event.listing_description, pageWidth - (margin * 2));
      pdf.text(lines, margin, yPos);
      yPos += (lines.length * 5) + 5;
    }

    // Key Features
    if (event.key_features && event.key_features.length > 0) {
      yPos += 5;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Key Features:", margin, yPos);
      yPos += 7;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      event.key_features.forEach((feature: string) => {
        pdf.text(`• ${feature}`, margin + 5, yPos);
        yPos += 5;
      });
    }

    // Open House Information Box
    yPos += 10;
    pdf.setDrawColor(0, 0, 255);
    pdf.setFillColor(230, 240, 255);
    pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, "FD");

    yPos += 8;
    pdf.setTextColor(0, 0, 150);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("OPEN HOUSE", margin + 5, yPos);

    yPos += 8;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    const startDate = new Date(event.start_at);
    const endDate = new Date(event.end_at);
    const openHouseText = `${startDate.toLocaleDateString()} • ${startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })} - ${endDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;
    pdf.text(openHouseText, margin + 5, yPos);

    // Agent Information (Bottom)
    yPos = pageHeight - 50;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 8;
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(agent?.display_name || "Your Agent", margin, yPos);

    yPos += 6;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    if (agent?.brokerage_name) {
      pdf.text(agent.brokerage_name, margin, yPos);
      yPos += 5;
    }
    if (agent?.phone_e164) {
      pdf.text(`Phone: ${agent.phone_e164}`, margin, yPos);
      yPos += 5;
    }
    if (agent?.email) {
      pdf.text(`Email: ${agent.email}`, margin, yPos);
      yPos += 5;
    }
    if (agent?.license_number) {
      pdf.text(`License: ${agent.license_number}`, margin, yPos);
    }

    // Disclaimer (Bottom)
    yPos = pageHeight - 15;
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(100, 100, 100);
    const disclaimer = "Information deemed reliable but not guaranteed. All measurements and information should be independently verified.";
    const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - (margin * 2));
    pdf.text(disclaimerLines, margin, yPos);

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="open-house-${event.address.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error.message },
      { status: 500 }
    );
  }
}
