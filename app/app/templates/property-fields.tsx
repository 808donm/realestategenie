"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { type TemplateSettings } from "@/lib/flyer-templates";

type Props = {
  settings: TemplateSettings;
  onUpdate: (updates: Partial<TemplateSettings>) => void;
};

export default function PropertyFields({ settings, onUpdate }: Props) {
  const propertyFields = [
    { key: "show_price", label: "Price", description: "Display the listing price" },
    { key: "show_bedrooms", label: "Bedrooms", description: "Number of bedrooms" },
    { key: "show_bathrooms", label: "Bathrooms", description: "Number of bathrooms" },
    { key: "show_square_feet", label: "Square Feet", description: "Total living area" },
    { key: "show_lot_size", label: "Lot Size", description: "Property lot dimensions" },
    { key: "show_year_built", label: "Year Built", description: "Construction year" },
    { key: "show_property_type", label: "Property Type", description: "Single-family, condo, etc." },
    { key: "show_mls_number", label: "MLS Number", description: "MLS listing number" },
  ];

  const agentFields = [
    { key: "show_agent_photo", label: "Agent Photo", description: "Display your headshot" },
    { key: "show_agent_phone", label: "Phone Number", description: "Your contact phone" },
    { key: "show_agent_email", label: "Email Address", description: "Your email address" },
    { key: "show_agent_website", label: "Website", description: "Your website URL" },
    { key: "show_qr_code", label: "QR Code", description: "Scannable link to listing" },
  ];

  const handleToggle = (key: string, value: boolean) => {
    onUpdate({ [key]: value } as Partial<TemplateSettings>);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Property Fields</h3>
        <p className="text-sm text-muted-foreground">
          Choose which property information to display on your flyers
        </p>
      </div>

      {/* Property Information */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-4">Property Information</h4>
          <div className="space-y-4">
            {propertyFields.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex-1">
                  <Label htmlFor={field.key} className="text-sm font-medium">
                    {field.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <Switch
                  id={field.key}
                  checked={settings[field.key as keyof TemplateSettings] as boolean}
                  onCheckedChange={(checked) => handleToggle(field.key, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Contact Information */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-4">Agent Contact Information</h4>
          <div className="space-y-4">
            {agentFields.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex-1">
                  <Label htmlFor={field.key} className="text-sm font-medium">
                    {field.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
                <Switch
                  id={field.key}
                  checked={settings[field.key as keyof TemplateSettings] as boolean}
                  onCheckedChange={(checked) => handleToggle(field.key, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
