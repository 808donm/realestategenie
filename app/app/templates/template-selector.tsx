"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { FLYER_TEMPLATES } from "@/lib/flyer-templates";

type Props = {
  selectedTemplate: string;
  onSelect: (templateId: string) => void;
};

// Mini template preview component showing actual layout structure per design
function TemplatePreviewMini({ templateId, primaryColor, secondaryColor }: { templateId: string; primaryColor: string; secondaryColor: string }) {
  // Modern Living: Dark navy header, gold accent line, hero image, cream bg, contact footer
  if (templateId === "modern-living") {
    return (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: "#faf7f2" }}>
        {/* Dark header with centered "OPEN HOUSE" */}
        <div className="h-7 flex flex-col items-center justify-center" style={{ backgroundColor: primaryColor }}>
          <div className="w-6 h-0.5 rounded mb-0.5" style={{ backgroundColor: secondaryColor }} />
          <div className="w-12 h-1.5 bg-white/90 rounded" />
          <div className="w-6 h-0.5 rounded mt-0.5" style={{ backgroundColor: secondaryColor }} />
        </div>
        {/* Hero image */}
        <div className="flex-1 bg-gradient-to-br from-gray-300 to-gray-400 mx-1.5 mt-1.5 rounded-sm" />
        {/* Property info */}
        <div className="px-2 py-1 space-y-0.5">
          <div className="w-3/4 h-1.5 rounded" style={{ backgroundColor: primaryColor }} />
          <div className="w-1/2 h-1 bg-gray-300 rounded" />
          <div className="flex gap-1">
            <div className="w-1/4 h-1 rounded" style={{ backgroundColor: secondaryColor, opacity: 0.5 }} />
            <div className="w-1/4 h-1 rounded" style={{ backgroundColor: secondaryColor, opacity: 0.5 }} />
            <div className="w-1/4 h-1 rounded" style={{ backgroundColor: secondaryColor, opacity: 0.5 }} />
          </div>
        </div>
        {/* Footer with agent */}
        <div className="h-5 flex items-center gap-1 px-2" style={{ backgroundColor: primaryColor }}>
          <div className="w-3 h-3 rounded-full bg-white/60" />
          <div className="flex-1 space-y-0.5">
            <div className="w-full h-0.5 bg-white/70 rounded" />
            <div className="w-2/3 h-0.5 bg-white/50 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Blue Horizon: Blue header, large hero, clean details, contact footer
  if (templateId === "blue-horizon") {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        {/* Blue header */}
        <div className="h-8 flex flex-col items-center justify-center" style={{ backgroundColor: primaryColor }}>
          <div className="w-10 h-1 bg-white/50 rounded mb-0.5" />
          <div className="w-14 h-2 bg-white/90 rounded" />
        </div>
        {/* Hero image */}
        <div className="flex-1 bg-gradient-to-br from-gray-200 to-gray-350 mx-0" />
        {/* Address & details */}
        <div className="px-2 py-1.5 space-y-0.5" style={{ backgroundColor: secondaryColor }}>
          <div className="w-2/3 h-1.5 rounded" style={{ backgroundColor: primaryColor }} />
          <div className="w-1/2 h-1 bg-gray-400 rounded" />
          {/* Date banner */}
          <div className="w-full h-2 rounded mt-0.5" style={{ backgroundColor: primaryColor, opacity: 0.15 }}>
            <div className="w-3/4 h-full mx-auto rounded" style={{ backgroundColor: primaryColor, opacity: 0.3 }} />
          </div>
        </div>
        {/* Footer */}
        <div className="h-4 border-t flex items-center justify-between px-2">
          <div className="flex items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <div className="space-y-0.5">
              <div className="w-8 h-0.5 bg-gray-400 rounded" />
              <div className="w-5 h-0.5 bg-gray-300 rounded" />
            </div>
          </div>
          <div className="w-3 h-3 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Golden Elegance: Cream bg, gold lines, side images, elegant serif, QR footer
  if (templateId === "golden-elegance") {
    return (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: "#fdf8f0" }}>
        {/* Top gold accent bar */}
        <div className="h-1" style={{ backgroundColor: primaryColor }} />
        {/* Header with tagline */}
        <div className="py-1.5 text-center space-y-0.5">
          <div className="w-8 h-0.5 mx-auto rounded" style={{ backgroundColor: primaryColor }} />
          <div className="w-16 h-1.5 mx-auto rounded" style={{ backgroundColor: secondaryColor }} />
          <div className="w-12 h-0.5 mx-auto rounded" style={{ backgroundColor: primaryColor, opacity: 0.5 }} />
          <div className="w-8 h-0.5 mx-auto rounded" style={{ backgroundColor: primaryColor }} />
        </div>
        {/* Side by side images */}
        <div className="flex-1 grid grid-cols-2 gap-0.5 mx-2">
          <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-sm" />
          <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-sm" />
        </div>
        {/* Property details centered */}
        <div className="px-2 py-1 text-center space-y-0.5">
          <div className="w-1/2 h-1.5 mx-auto rounded" style={{ backgroundColor: secondaryColor }} />
          <div className="w-1/3 h-1 mx-auto rounded" style={{ backgroundColor: primaryColor, opacity: 0.4 }} />
          <div className="flex gap-1 justify-center">
            <div className="w-1/5 h-0.5 rounded" style={{ backgroundColor: primaryColor, opacity: 0.3 }} />
            <div className="w-1/5 h-0.5 rounded" style={{ backgroundColor: primaryColor, opacity: 0.3 }} />
            <div className="w-1/5 h-0.5 rounded" style={{ backgroundColor: primaryColor, opacity: 0.3 }} />
          </div>
        </div>
        {/* QR code footer */}
        <div className="h-5 flex items-center justify-center" style={{ borderTop: `1px solid ${primaryColor}40` }}>
          <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: secondaryColor, opacity: 0.3 }} />
        </div>
      </div>
    );
  }

  // Warm Welcome: Dark brown header split layout, warm bg, agent-focused footer
  if (templateId === "warm-welcome") {
    return (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: "#faf5f0" }}>
        {/* Split header: left text, right contact */}
        <div className="h-7 flex items-center justify-between px-1.5" style={{ backgroundColor: primaryColor }}>
          <div className="space-y-0.5">
            <div className="w-8 h-1.5 bg-white/80 rounded" />
            <div className="w-5 h-0.5 rounded" style={{ backgroundColor: secondaryColor, opacity: 0.7 }} />
          </div>
          <div className="space-y-0.5 items-end flex flex-col">
            <div className="w-5 h-0.5 bg-white/50 rounded" />
            <div className="w-4 h-0.5 bg-white/40 rounded" />
          </div>
        </div>
        {/* Hero image */}
        <div className="flex-1 bg-gradient-to-br from-amber-100 to-gray-300 mx-1 mt-1 rounded-sm" />
        {/* Property details */}
        <div className="px-2 py-1 space-y-0.5">
          <div className="w-2/3 h-1.5 rounded" style={{ backgroundColor: primaryColor }} />
          <div className="w-1/2 h-1 rounded" style={{ backgroundColor: secondaryColor, opacity: 0.5 }} />
          <div className="flex gap-1">
            <div className="w-1/4 h-0.5 bg-gray-300 rounded" />
            <div className="w-1/4 h-0.5 bg-gray-300 rounded" />
          </div>
        </div>
        {/* Date banner */}
        <div className="mx-2 h-2.5 rounded flex items-center justify-center" style={{ backgroundColor: secondaryColor }}>
          <div className="w-2/3 h-0.5 bg-white/80 rounded" />
        </div>
        {/* Agent footer */}
        <div className="h-5 flex items-center gap-1 px-2 mt-0.5" style={{ backgroundColor: primaryColor }}>
          <div className="w-3.5 h-3.5 rounded-full bg-white/50" />
          <div className="flex-1 space-y-0.5">
            <div className="w-full h-0.5 bg-white/70 rounded" />
            <div className="w-2/3 h-0.5 bg-white/40 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Bold Statement: Dark navy, geometric dots, bold text, grid images
  if (templateId === "bold-statement") {
    return (
      <div className="w-full h-full flex flex-col" style={{ backgroundColor: primaryColor }}>
        {/* Header with dot pattern and bold text */}
        <div className="h-7 flex items-center justify-between px-1.5 relative">
          {/* Dot pattern left */}
          <div className="absolute left-0.5 top-1 grid grid-cols-3 gap-px">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: secondaryColor, opacity: 0.4 }} />
            ))}
          </div>
          <div className="w-10 h-2 rounded ml-3" style={{ backgroundColor: secondaryColor }} />
          {/* Dot pattern right */}
          <div className="absolute right-0.5 top-1 grid grid-cols-3 gap-px">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="w-0.5 h-0.5 rounded-full" style={{ backgroundColor: secondaryColor, opacity: 0.4 }} />
            ))}
          </div>
        </div>
        {/* Grid images */}
        <div className="flex-1 grid grid-cols-3 gap-0.5 mx-1">
          <div className="col-span-2 row-span-2 bg-gradient-to-br from-gray-400 to-gray-500 rounded-sm" />
          <div className="bg-gradient-to-br from-gray-300 to-gray-400 rounded-sm" />
          <div className="bg-gradient-to-br from-gray-350 to-gray-450 rounded-sm" />
        </div>
        {/* Property details on dark bg */}
        <div className="px-2 py-1 space-y-0.5">
          <div className="w-3/4 h-1.5 bg-white/90 rounded" />
          <div className="w-1/2 h-1 bg-white/40 rounded" />
          <div className="flex gap-1">
            <div className="w-1/4 h-0.5 rounded" style={{ backgroundColor: secondaryColor, opacity: 0.6 }} />
            <div className="w-1/4 h-0.5 rounded" style={{ backgroundColor: secondaryColor, opacity: 0.6 }} />
            <div className="w-1/4 h-0.5 rounded" style={{ backgroundColor: secondaryColor, opacity: 0.6 }} />
          </div>
        </div>
        {/* Footer */}
        <div className="h-4 flex items-center gap-1 px-2" style={{ backgroundColor: secondaryColor }}>
          <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
          <div className="flex-1 space-y-0.5">
            <div className="w-full h-0.5 bg-white/80 rounded" />
            <div className="w-1/2 h-0.5 bg-white/50 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function TemplateSelector({ selectedTemplate, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Template</h3>
        <p className="text-sm text-muted-foreground">
          Each template has a unique design and layout. Selecting a template will apply its default colors, fonts, and layout options.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FLYER_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id;

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                isSelected ? "ring-2 ring-blue-600 shadow-lg" : ""
              }`}
              onClick={() => onSelect(template.id)}
            >
              <CardContent className="p-4">
                {/* Visual Template Preview */}
                <div className="aspect-[8.5/11] rounded-lg mb-3 relative overflow-hidden border border-gray-200 shadow-sm">
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 z-10 shadow">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <TemplatePreviewMini
                    templateId={template.id}
                    primaryColor={template.defaultSettings.primaryColor}
                    secondaryColor={template.defaultSettings.secondaryColor}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{template.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>

                  {/* Color preview */}
                  <div className="flex items-center gap-2 pt-1">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: template.defaultSettings.primaryColor }}
                      title="Primary color"
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: template.defaultSettings.secondaryColor }}
                      title="Secondary color"
                    />
                    <span className="text-xs text-gray-400 ml-1">
                      {template.defaultSettings.fontFamily}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
