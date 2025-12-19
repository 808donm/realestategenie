import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from "docx";

export interface AgentBranding {
  displayName: string;
  email: string;
  phone: string | null;
  licenseNumber: string | null;
  photoUrl: string | null;
  brokerageName?: string;
}

export interface ProfileData {
  neighborhoodName: string;
  address: string;
  city: string;
  stateProvince: string;
  lifestyleVibe: string;
  locationNarrative: string;
  amenitiesList: {
    parks: string[];
    shopping: string[];
    dining: string[];
    schools: string[];
  };
  marketData?: {
    medianPrice?: string;
    daysOnMarket?: number;
    activeInventory?: number;
    pricePerSqFt?: string;
  };
}

/**
 * Generate a PDF neighborhood profile
 */
export function generatePDF(
  profileData: ProfileData,
  agentBranding: AgentBranding
): Blob {
  const doc = new jsPDF();
  let yPosition = 20;

  // Helper to add text with wrapping
  const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }

    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, 20, yPosition);
    yPosition += lines.length * (fontSize * 0.5);
  };

  // Header
  doc.setFillColor(102, 126, 234); // Purple gradient color
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Neighborhood Profile", 20, 20);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`${profileData.neighborhoodName}`, 20, 30);

  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPosition = 50;

  // Location
  addText(`${profileData.city}, ${profileData.stateProvince}`, 12, true);
  yPosition += 5;

  // Prepared for/by
  addText(`Prepared by: ${agentBranding.displayName}`, 10);
  if (agentBranding.licenseNumber) {
    addText(`License #: ${agentBranding.licenseNumber}`, 10);
  }
  addText(`Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 10);
  yPosition += 10;

  // Section 1: Lifestyle & Vibe
  addText("1. The Lifestyle & Vibe", 14, true);
  yPosition += 5;
  addText(profileData.lifestyleVibe, 11);
  yPosition += 10;

  // Section 2: Location Intelligence
  addText("2. Location Intelligence", 14, true);
  yPosition += 5;
  addText(profileData.locationNarrative, 11);
  yPosition += 10;

  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Section 3: Market Pulse (if data available)
  if (profileData.marketData) {
    addText("3. Market Pulse", 14, true);
    yPosition += 5;

    if (profileData.marketData.medianPrice) {
      addText(`Median List Price: ${profileData.marketData.medianPrice}`, 11);
    }
    if (profileData.marketData.daysOnMarket) {
      addText(`Avg. Days on Market: ${profileData.marketData.daysOnMarket}`, 11);
    }
    if (profileData.marketData.activeInventory) {
      addText(`Active Inventory: ${profileData.marketData.activeInventory} units`, 11);
    }
    if (profileData.marketData.pricePerSqFt) {
      addText(`Price per Sq. Ft.: ${profileData.marketData.pricePerSqFt}`, 11);
    }
    yPosition += 10;
  }

  // Section 4: Community Resources
  addText("4. Community Resources", 14, true);
  yPosition += 5;

  addText("🎓 Schools & Education", 12, true);
  addText("For detailed performance metrics, please visit the official district links.", 10);
  if (profileData.amenitiesList.schools.length > 0) {
    profileData.amenitiesList.schools.forEach((school) => {
      addText(`• ${school}`, 10);
    });
  }
  yPosition += 5;

  addText("👮 Safety & Community Services", 12, true);
  addText("Crime and safety are subjective. Please review official statistics from local law enforcement.", 10);
  yPosition += 10;

  // Section 5: Local Amenities
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }

  addText("5. Local Amenities", 14, true);
  yPosition += 5;

  if (profileData.amenitiesList.parks.length > 0) {
    addText("Parks:", 11, true);
    profileData.amenitiesList.parks.forEach((park) => {
      addText(`• ${park}`, 10);
    });
    yPosition += 3;
  }

  if (profileData.amenitiesList.shopping.length > 0) {
    addText("Shopping:", 11, true);
    profileData.amenitiesList.shopping.forEach((shop) => {
      addText(`• ${shop}`, 10);
    });
    yPosition += 3;
  }

  if (profileData.amenitiesList.dining.length > 0) {
    addText("Dining:", 11, true);
    profileData.amenitiesList.dining.forEach((restaurant) => {
      addText(`• ${restaurant}`, 10);
    });
  }

  // Footer with disclaimer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    const disclaimerText = "DISCLAIMER: Information obtained from third-party sources has not been verified. " +
      "No warranty is made regarding accuracy. Prospective buyers should conduct independent verification. " +
      "Complies with Fair Housing Act principles.";

    const disclaimerLines = doc.splitTextToSize(disclaimerText, 170);
    doc.text(disclaimerLines, 20, 280);

    doc.setTextColor(0, 0, 0);
    doc.text(`${agentBranding.displayName} | ${agentBranding.email}`, 20, 290);
  }

  return doc.output("blob");
}

/**
 * Generate a Word (.docx) neighborhood profile
 */
export async function generateDOCX(
  profileData: ProfileData,
  agentBranding: AgentBranding
): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: "Neighborhood Profile",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: `${profileData.neighborhoodName}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),

          new Paragraph({
            text: `${profileData.city}, ${profileData.stateProvince}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          // Metadata
          new Paragraph({
            children: [
              new TextRun({
                text: `Prepared by: ${agentBranding.displayName}`,
                break: 1,
              }),
              ...(agentBranding.licenseNumber
                ? [
                    new TextRun({
                      text: `License #: ${agentBranding.licenseNumber}`,
                      break: 1,
                    }),
                  ]
                : []),
              new TextRun({
                text: `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
                break: 1,
              }),
            ],
            spacing: { after: 300 },
          }),

          // Section 1: Lifestyle & Vibe
          new Paragraph({
            text: "1. The Lifestyle & Vibe",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            text: profileData.lifestyleVibe,
            spacing: { after: 300 },
          }),

          // Section 2: Location Intelligence
          new Paragraph({
            text: "2. Location Intelligence",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            text: profileData.locationNarrative,
            spacing: { after: 300 },
          }),

          // Section 3: Market Pulse (if available)
          ...(profileData.marketData
            ? [
                new Paragraph({
                  text: "3. Market Pulse",
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 200, after: 100 },
                }),

                new Paragraph({
                  children: [
                    ...(profileData.marketData.medianPrice
                      ? [
                          new TextRun({
                            text: `Median List Price: ${profileData.marketData.medianPrice}`,
                            break: 1,
                          }),
                        ]
                      : []),
                    ...(profileData.marketData.daysOnMarket
                      ? [
                          new TextRun({
                            text: `Avg. Days on Market: ${profileData.marketData.daysOnMarket}`,
                            break: 1,
                          }),
                        ]
                      : []),
                    ...(profileData.marketData.activeInventory
                      ? [
                          new TextRun({
                            text: `Active Inventory: ${profileData.marketData.activeInventory} units`,
                            break: 1,
                          }),
                        ]
                      : []),
                    ...(profileData.marketData.pricePerSqFt
                      ? [
                          new TextRun({
                            text: `Price per Sq. Ft.: ${profileData.marketData.pricePerSqFt}`,
                            break: 1,
                          }),
                        ]
                      : []),
                  ],
                  spacing: { after: 300 },
                }),
              ]
            : []),

          // Section 4: Community Resources
          new Paragraph({
            text: "4. Community Resources",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),

          new Paragraph({
            text: "🎓 Schools & Education",
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 100, after: 50 },
          }),

          new Paragraph({
            text: "For detailed performance metrics, please visit the official district links.",
            spacing: { after: 100 },
          }),

          ...profileData.amenitiesList.schools.map(
            (school) =>
              new Paragraph({
                text: `• ${school}`,
                spacing: { after: 50 },
              })
          ),

          new Paragraph({
            text: "👮 Safety & Community Services",
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 50 },
          }),

          new Paragraph({
            text: "Crime and safety are subjective. Please review official statistics from local law enforcement.",
            spacing: { after: 300 },
          }),

          // Section 5: Local Amenities
          new Paragraph({
            text: "5. Local Amenities",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),

          ...(profileData.amenitiesList.parks.length > 0
            ? [
                new Paragraph({
                  text: "Parks:",
                  bold: true,
                  spacing: { before: 100, after: 50 },
                }),
                ...profileData.amenitiesList.parks.map(
                  (park) =>
                    new Paragraph({
                      text: `• ${park}`,
                      spacing: { after: 50 },
                    })
                ),
              ]
            : []),

          ...(profileData.amenitiesList.shopping.length > 0
            ? [
                new Paragraph({
                  text: "Shopping:",
                  bold: true,
                  spacing: { before: 100, after: 50 },
                }),
                ...profileData.amenitiesList.shopping.map(
                  (shop) =>
                    new Paragraph({
                      text: `• ${shop}`,
                      spacing: { after: 50 },
                    })
                ),
              ]
            : []),

          ...(profileData.amenitiesList.dining.length > 0
            ? [
                new Paragraph({
                  text: "Dining:",
                  bold: true,
                  spacing: { before: 100, after: 50 },
                }),
                ...profileData.amenitiesList.dining.map(
                  (restaurant) =>
                    new Paragraph({
                      text: `• ${restaurant}`,
                      spacing: { after: 50 },
                    })
                ),
              ]
            : []),

          // Disclaimer
          new Paragraph({
            text: "DISCLAIMER",
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 100 },
          }),

          new Paragraph({
            text: "Information obtained from third-party sources has not been verified. No warranty is made regarding accuracy. Prospective buyers should conduct independent verification. Complies with Fair Housing Act principles.",
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: `${agentBranding.displayName} | ${agentBranding.email}${agentBranding.licenseNumber ? ` | License #: ${agentBranding.licenseNumber}` : ""}`,
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
