"use client";

import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type TemplateSettings } from "@/lib/flyer-templates";

type Props = {
  settings: TemplateSettings;
  onUpdate: (updates: Partial<TemplateSettings>) => void;
};

export default function LayoutOptions({ settings, onUpdate }: Props) {
  const headerStyles = [
    {
      value: "centered",
      label: "Centered",
      description: "Logo and title centered at the top",
      preview: "━━━━━━━━\n    🏠\n━━━━━━━━",
    },
    {
      value: "left",
      label: "Left Aligned",
      description: "Logo and title aligned to the left",
      preview: "🏠 ━━━━━\n━━━━━━━━",
    },
    {
      value: "split",
      label: "Split",
      description: "Logo left, contact info right",
      preview: "🏠 ━━━ 📞\n━━━━━━━━",
    },
  ];

  const footerStyles = [
    {
      value: "contact",
      label: "Full Contact",
      description: "Complete contact information",
      preview: "📧 📞 🌐",
    },
    {
      value: "qr",
      label: "QR Code",
      description: "QR code for easy scanning",
      preview: "⊞ SCAN",
    },
    {
      value: "minimal",
      label: "Minimal",
      description: "Just essentials",
      preview: "📧 📞",
    },
  ];

  const imageLayouts = [
    {
      value: "hero",
      label: "Hero Image",
      description: "Large feature image at the top",
      preview: "▓▓▓▓▓▓▓▓\n▓▓▓▓▓▓▓▓",
    },
    {
      value: "grid",
      label: "Photo Grid",
      description: "Multiple images in a grid",
      preview: "▓▓ ▓▓ ▓▓\n▓▓ ▓▓ ▓▓",
    },
    {
      value: "side",
      label: "Side by Side",
      description: "Images alongside text",
      preview: "▓▓▓ ═══\n▓▓▓ ═══",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Layout Options</h3>
        <p className="text-sm text-muted-foreground">
          Customize the layout and structure of your flyers
        </p>
      </div>

      {/* Header Style */}
      <div className="space-y-3">
        <Label>Header Style</Label>
        <div className="grid grid-cols-1 gap-3">
          {headerStyles.map((style) => (
            <Card
              key={style.value}
              className={`cursor-pointer transition-all hover:border-blue-600 ${
                settings.header_style === style.value ? "border-blue-600 bg-blue-50" : ""
              }`}
              onClick={() => onUpdate({ header_style: style.value as any })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center font-mono text-xs whitespace-pre">
                    {style.preview}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{style.label}</h4>
                    <p className="text-xs text-muted-foreground">{style.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Image Layout */}
      <div className="space-y-3">
        <Label>Image Layout</Label>
        <div className="grid grid-cols-1 gap-3">
          {imageLayouts.map((layout) => (
            <Card
              key={layout.value}
              className={`cursor-pointer transition-all hover:border-blue-600 ${
                settings.image_layout === layout.value ? "border-blue-600 bg-blue-50" : ""
              }`}
              onClick={() => onUpdate({ image_layout: layout.value as any })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center font-mono text-xs whitespace-pre">
                    {layout.preview}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{layout.label}</h4>
                    <p className="text-xs text-muted-foreground">{layout.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer Style */}
      <div className="space-y-3">
        <Label>Footer Style</Label>
        <div className="grid grid-cols-1 gap-3">
          {footerStyles.map((style) => (
            <Card
              key={style.value}
              className={`cursor-pointer transition-all hover:border-blue-600 ${
                settings.footer_style === style.value ? "border-blue-600 bg-blue-50" : ""
              }`}
              onClick={() => onUpdate({ footer_style: style.value as any })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center font-mono text-xs">
                    {style.preview}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{style.label}</h4>
                    <p className="text-xs text-muted-foreground">{style.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Footer Text */}
      <div className="space-y-2">
        <Label>Custom Footer Text (Optional)</Label>
        <Textarea
          placeholder="Add any disclaimers, legal text, or additional information..."
          value={settings.custom_footer_text || ""}
          onChange={(e) => onUpdate({ custom_footer_text: e.target.value || null })}
          maxLength={200}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          This text will appear at the bottom of your flyer (200 characters max)
        </p>
      </div>
    </div>
  );
}
