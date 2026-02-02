"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { FLYER_TEMPLATES } from "@/lib/flyer-templates";

type Props = {
  selectedTemplate: string;
  onSelect: (templateId: string) => void;
};

// Mini template preview component showing actual layout structure
function TemplatePreviewMini({ templateId, primaryColor }: { templateId: string; primaryColor: string }) {
  // Modern: Centered header, hero image, clean layout
  if (templateId === "modern") {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="h-6 flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
          <div className="w-8 h-1 bg-white/80 rounded" />
        </div>
        <div className="flex-1 bg-gray-200 m-1" />
        <div className="p-1 space-y-1">
          <div className="w-3/4 h-1.5 rounded" style={{ backgroundColor: primaryColor }} />
          <div className="w-1/2 h-1 bg-gray-300 rounded" />
          <div className="flex gap-1 mt-1">
            <div className="w-1/4 h-1 bg-gray-200 rounded" />
            <div className="w-1/4 h-1 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="h-4 border-t flex items-center justify-center gap-1 px-1">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <div className="flex-1 space-y-0.5">
            <div className="w-full h-0.5 bg-gray-300 rounded" />
            <div className="w-2/3 h-0.5 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Classic: Split header, grid images, elegant
  if (templateId === "classic") {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="h-6 flex items-center justify-between px-1" style={{ backgroundColor: primaryColor }}>
          <div className="w-6 h-2 bg-white/80 rounded" />
          <div className="text-right space-y-0.5">
            <div className="w-4 h-0.5 bg-white/60 rounded" />
            <div className="w-3 h-0.5 bg-white/60 rounded" />
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-0.5 m-1">
          <div className="bg-gray-200" />
          <div className="bg-gray-300" />
          <div className="bg-gray-200" />
          <div className="bg-gray-300" />
          <div className="bg-gray-200" />
          <div className="bg-gray-300" />
        </div>
        <div className="p-1 space-y-1 border-t-2" style={{ borderColor: primaryColor }}>
          <div className="w-2/3 h-1.5 rounded" style={{ backgroundColor: primaryColor }} />
          <div className="flex gap-1">
            <div className="w-1/3 h-1 bg-gray-200 rounded" />
            <div className="w-1/3 h-1 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="h-4 border-t flex items-center gap-1 px-1">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <div className="flex-1 space-y-0.5">
            <div className="w-full h-0.5 bg-gray-300 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Minimal: Left-aligned, lots of white space, hero image
  if (templateId === "minimal") {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="h-5 flex items-center px-1" style={{ backgroundColor: primaryColor }}>
          <div className="w-10 h-1 bg-white/80 rounded" />
        </div>
        <div className="flex-1 bg-gray-100 m-2 rounded" />
        <div className="px-2 pb-1 space-y-1">
          <div className="w-1/2 h-2 rounded" style={{ backgroundColor: primaryColor }} />
          <div className="w-1/3 h-1 bg-gray-200 rounded" />
        </div>
        <div className="h-3 flex items-center justify-start px-2 text-[6px] text-gray-400">
          <div className="w-1/3 h-0.5 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Luxury: Centered, gold accents, side images, QR code
  if (templateId === "luxury") {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="h-7 flex flex-col items-center justify-center" style={{ backgroundColor: primaryColor }}>
          <div className="w-6 h-0.5 bg-white/60 rounded mb-0.5" />
          <div className="w-10 h-1.5 bg-white/90 rounded" />
          <div className="w-6 h-0.5 bg-white/60 rounded mt-0.5" />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-1 m-1">
          <div className="bg-gray-200 rounded" />
          <div className="bg-gray-300 rounded" />
        </div>
        <div className="px-2 py-1 text-center space-y-0.5">
          <div className="w-1/2 h-1.5 mx-auto rounded" style={{ backgroundColor: primaryColor }} />
          <div className="w-1/3 h-1 bg-gray-200 mx-auto rounded" />
        </div>
        <div className="h-5 border-t flex items-center justify-center">
          <div className="w-4 h-4 bg-gray-300 rounded" />
        </div>
      </div>
    );
  }

  // Bold: High contrast, split header, vibrant colors, grid
  if (templateId === "bold") {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="h-7 flex items-center justify-between px-1" style={{ backgroundColor: primaryColor }}>
          <div className="w-8 h-2.5 bg-white rounded font-bold" />
          <div className="w-4 h-4 bg-white/20 rounded" />
        </div>
        <div className="flex-1 grid grid-cols-3 gap-0.5 m-0.5">
          <div className="col-span-2 row-span-2 bg-gray-800" />
          <div className="bg-gray-600" />
          <div className="bg-gray-700" />
        </div>
        <div className="p-1 space-y-0.5" style={{ backgroundColor: `${primaryColor}10` }}>
          <div className="w-full h-2 rounded" style={{ backgroundColor: primaryColor }} />
          <div className="flex gap-1">
            <div className="w-1/4 h-1.5 bg-gray-800 rounded" />
            <div className="w-1/4 h-1.5 bg-gray-800 rounded" />
            <div className="w-1/4 h-1.5 bg-gray-800 rounded" />
          </div>
        </div>
        <div className="h-4 flex items-center gap-1 px-1" style={{ backgroundColor: primaryColor }}>
          <div className="w-3 h-3 rounded-full bg-white/80" />
          <div className="flex-1 space-y-0.5">
            <div className="w-full h-0.5 bg-white/80 rounded" />
            <div className="w-2/3 h-0.5 bg-white/60 rounded" />
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
