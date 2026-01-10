"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { FLYER_TEMPLATES } from "@/lib/flyer-templates";

type Props = {
  selectedTemplate: string;
  onSelect: (templateId: string) => void;
};

export default function TemplateSelector({ selectedTemplate, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Template</h3>
        <p className="text-sm text-muted-foreground">
          Select a professional template as the foundation for your flyers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FLYER_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id;

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? "ring-2 ring-blue-600" : ""
              }`}
              onClick={() => onSelect(template.id)}
            >
              <CardContent className="p-4">
                {/* Template Thumbnail Placeholder */}
                <div className="aspect-[8.5/11] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="text-center p-4">
                    <div className="text-4xl mb-2">
                      {template.id === "modern" && "🏢"}
                      {template.id === "classic" && "🏛️"}
                      {template.id === "minimal" && "⬜"}
                      {template.id === "luxury" && "💎"}
                      {template.id === "bold" && "⚡"}
                    </div>
                    <p className="text-xs text-gray-500">Preview</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{template.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
