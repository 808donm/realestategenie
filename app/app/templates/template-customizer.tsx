"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Save, Eye } from "lucide-react";
import TemplateSelector from "./template-selector";
import BrandSettings from "./brand-settings";
import PropertyFields from "./property-fields";
import LayoutOptions from "./layout-options";
import TemplatePreview from "./template-preview";
import { DEFAULT_TEMPLATE_SETTINGS, FLYER_TEMPLATES, type TemplateSettings } from "@/lib/flyer-templates";

type Props = {
  initialSettings: any;
  agentInfo: any;
};

export default function TemplateCustomizer({ initialSettings, agentInfo }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [settings, setSettings] = useState<TemplateSettings>(
    initialSettings || DEFAULT_TEMPLATE_SETTINGS
  );
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const steps = [
    { id: "template", label: "Choose Template", icon: "📄" },
    { id: "brand", label: "Brand Settings", icon: "🎨" },
    { id: "fields", label: "Property Fields", icon: "✓" },
    { id: "layout", label: "Layout Options", icon: "📐" },
  ];

  const updateSettings = (updates: Partial<TemplateSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  // Apply template defaults when selecting a new template
  const handleTemplateSelect = (templateId: string) => {
    const template = FLYER_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSettings((prev) => ({
        ...prev,
        template_id: templateId,
        primary_color: template.defaultSettings.primaryColor,
        secondary_color: template.defaultSettings.secondaryColor,
        font_family: template.defaultSettings.fontFamily,
        header_style: template.defaultSettings.headerStyle,
        footer_style: template.defaultSettings.footerStyle,
        image_layout: template.defaultSettings.imageLayout,
        show_price: template.defaultSettings.showPrice,
        show_agent_photo: template.defaultSettings.showAgentPhoto,
        show_qr_code: template.defaultSettings.showQrCode,
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/templates/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      alert("Template settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canGoNext = activeStep < steps.length - 1;
  const canGoPrev = activeStep > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Side: Wizard */}
      <div className="lg:col-span-2 space-y-6">
        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        index === activeStep
                          ? "bg-blue-600 text-white"
                          : index < activeStep
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {step.icon}
                    </div>
                    <p
                      className={`text-sm mt-2 ${
                        index === activeStep ? "font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        index < activeStep ? "bg-green-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {activeStep === 0 && (
              <TemplateSelector
                selectedTemplate={settings.template_id}
                onSelect={handleTemplateSelect}
              />
            )}

            {activeStep === 1 && (
              <BrandSettings settings={settings} onUpdate={updateSettings} />
            )}

            {activeStep === 2 && (
              <PropertyFields settings={settings} onUpdate={updateSettings} />
            )}

            {activeStep === 3 && (
              <LayoutOptions settings={settings} onUpdate={updateSettings} />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setActiveStep((prev) => prev - 1)}
                disabled={!canGoPrev}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowPreview(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>

                {canGoNext ? (
                  <Button onClick={() => setActiveStep((prev) => prev + 1)}>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Template"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side: Live Preview */}
      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="text-lg">Live Preview</CardTitle>
            <CardDescription>See your changes in real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <TemplatePreview settings={settings} agentInfo={agentInfo} compact />
          </CardContent>
        </Card>
      </div>

      {/* Full Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Template Preview</h2>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
            <div className="p-6">
              <TemplatePreview settings={settings} agentInfo={agentInfo} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
