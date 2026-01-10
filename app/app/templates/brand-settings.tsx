"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { FONT_OPTIONS, COLOR_PRESETS, type TemplateSettings } from "@/lib/flyer-templates";

type Props = {
  settings: TemplateSettings;
  onUpdate: (updates: Partial<TemplateSettings>) => void;
};

export default function BrandSettings({ settings, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Brand Settings</h3>
        <p className="text-sm text-muted-foreground">
          Customize colors, fonts, and branding to match your style
        </p>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-3">
          {settings.logo_url && (
            <div className="w-20 h-20 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
              <img
                src={settings.logo_url}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1">
            <Input
              type="url"
              placeholder="https://example.com/logo.png"
              value={settings.logo_url || ""}
              onChange={(e) => onUpdate({ logo_url: e.target.value || null })}
              className="mb-2"
            />
            <p className="text-xs text-muted-foreground">
              Enter a URL to your logo image (PNG or JPG recommended)
            </p>
          </div>
        </div>
      </div>

      {/* Color Selection */}
      <div className="space-y-3">
        <Label>Brand Colors</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2">Primary Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={settings.primary_color}
                onChange={(e) => onUpdate({ primary_color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={settings.primary_color}
                onChange={(e) => onUpdate({ primary_color: e.target.value })}
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2">Secondary Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={settings.secondary_color}
                onChange={(e) => onUpdate({ secondary_color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={settings.secondary_color}
                onChange={(e) => onUpdate({ secondary_color: e.target.value })}
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Color Presets */}
        <div>
          <Label className="text-sm text-muted-foreground mb-2">Quick Presets</Label>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() =>
                  onUpdate({
                    primary_color: preset.primary,
                    secondary_color: preset.secondary,
                  })
                }
                className="flex items-center gap-2 p-2 border rounded-lg hover:border-blue-600 transition-colors"
              >
                <div className="flex gap-1">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: preset.secondary }}
                  />
                </div>
                <span className="text-xs">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Font Selection */}
      <div className="space-y-2">
        <Label>Typography</Label>
        <div className="grid grid-cols-1 gap-2">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.value}
              onClick={() => onUpdate({ font_family: font.value })}
              className={`p-3 border rounded-lg text-left transition-all ${
                settings.font_family === font.value
                  ? "border-blue-600 bg-blue-50"
                  : "hover:border-gray-400"
              }`}
            >
              <div className={`${font.preview} text-sm font-semibold`}>{font.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Tagline */}
      <div className="space-y-2">
        <Label>Custom Tagline (Optional)</Label>
        <Input
          type="text"
          placeholder="Your trusted real estate partner"
          value={settings.custom_tagline || ""}
          onChange={(e) => onUpdate({ custom_tagline: e.target.value || null })}
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">
          Add a catchy tagline to appear on your flyers (60 characters max)
        </p>
      </div>
    </div>
  );
}
