"use client";

import { Badge } from "@/components/ui/badge";
import { type TemplateSettings } from "@/lib/flyer-templates";
import { Home, Bed, Bath, Ruler, MapPin, Phone, Mail, Globe } from "lucide-react";

type Props = {
  settings: TemplateSettings;
  agentInfo: any;
  compact?: boolean;
};

// Sample property data for preview
const SAMPLE_PROPERTY = {
  address: "123 Main Street",
  city: "Beverly Hills",
  state: "CA",
  zip: "90210",
  price: 1250000,
  bedrooms: 4,
  bathrooms: 3.5,
  square_feet: 3200,
  lot_size: "0.5 acres",
  year_built: 2018,
  property_type: "Single Family",
  mls_number: "ML81234567",
};

export default function TemplatePreview({ settings, agentInfo, compact = false }: Props) {
  const scale = compact ? 0.5 : 1;

  return (
    <div
      className="bg-white shadow-lg mx-auto"
      style={{
        width: compact ? "340px" : "680px",
        aspectRatio: "8.5/11",
        transform: compact ? "scale(0.5)" : "scale(1)",
        transformOrigin: "top center",
      }}
    >
      {/* Header */}
      <div
        className={`p-6 ${
          settings.header_style === "centered"
            ? "text-center"
            : settings.header_style === "left"
            ? "text-left"
            : "flex justify-between items-center"
        }`}
        style={{ backgroundColor: settings.primary_color, color: "white" }}
      >
        {settings.header_style === "split" ? (
          <>
            <div>
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-12 mb-2" />
              )}
              <h2 className="text-2xl font-bold">OPEN HOUSE</h2>
            </div>
            <div className="text-right text-sm">
              {settings.show_agent_phone && agentInfo?.phone && (
                <div className="flex items-center gap-1 justify-end">
                  <Phone className="w-3 h-3" />
                  {agentInfo.phone}
                </div>
              )}
              {settings.show_agent_email && agentInfo?.email && (
                <div className="flex items-center gap-1 justify-end">
                  <Mail className="w-3 h-3" />
                  {agentInfo.email}
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo"
                className={`h-12 mb-2 ${settings.header_style === "centered" ? "mx-auto" : ""}`}
              />
            )}
            <h2 className="text-3xl font-bold">OPEN HOUSE</h2>
            {settings.custom_tagline && (
              <p className="text-sm mt-1 opacity-90">{settings.custom_tagline}</p>
            )}
          </div>
        )}
      </div>

      {/* Property Image */}
      <div
        className={
          settings.image_layout === "hero"
            ? "h-64 bg-gray-200"
            : settings.image_layout === "grid"
            ? "grid grid-cols-3 gap-1 h-48"
            : "grid grid-cols-2 gap-2 h-48"
        }
      >
        {settings.image_layout === "hero" ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <Home className="w-16 h-16 text-gray-500" />
          </div>
        ) : (
          Array.from({ length: settings.image_layout === "grid" ? 6 : 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center"
            >
              <Home className="w-8 h-8 text-gray-500" />
            </div>
          ))
        )}
      </div>

      {/* Property Details */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-2xl font-bold" style={{ color: settings.primary_color }}>
            {SAMPLE_PROPERTY.address}
          </h3>
          <p className="text-gray-600">
            {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
          </p>
        </div>

        {settings.show_price && (
          <div className="mb-4">
            <p className="text-3xl font-bold" style={{ color: settings.primary_color }}>
              ${SAMPLE_PROPERTY.price.toLocaleString()}
            </p>
          </div>
        )}

        {/* Property Features */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {settings.show_bedrooms && (
            <div className="flex items-center gap-2">
              <Bed className="w-5 h-5" style={{ color: settings.secondary_color }} />
              <span className="font-semibold">{SAMPLE_PROPERTY.bedrooms} Bedrooms</span>
            </div>
          )}
          {settings.show_bathrooms && (
            <div className="flex items-center gap-2">
              <Bath className="w-5 h-5" style={{ color: settings.secondary_color }} />
              <span className="font-semibold">{SAMPLE_PROPERTY.bathrooms} Bathrooms</span>
            </div>
          )}
          {settings.show_square_feet && (
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5" style={{ color: settings.secondary_color }} />
              <span className="font-semibold">{SAMPLE_PROPERTY.square_feet.toLocaleString()} Sq Ft</span>
            </div>
          )}
          {settings.show_lot_size && (
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" style={{ color: settings.secondary_color }} />
              <span className="font-semibold">{SAMPLE_PROPERTY.lot_size}</span>
            </div>
          )}
        </div>

        {/* Additional Details */}
        <div className="flex flex-wrap gap-2 mb-4">
          {settings.show_property_type && (
            <Badge variant="outline">{SAMPLE_PROPERTY.property_type}</Badge>
          )}
          {settings.show_year_built && <Badge variant="outline">Built {SAMPLE_PROPERTY.year_built}</Badge>}
          {settings.show_mls_number && <Badge variant="outline">MLS# {SAMPLE_PROPERTY.mls_number}</Badge>}
        </div>
      </div>

      {/* Footer */}
      <div
        className="p-6 mt-auto border-t"
        style={{ borderColor: settings.primary_color + "30" }}
      >
        {settings.footer_style === "contact" && (
          <div className="flex items-center gap-6 justify-center flex-wrap text-sm">
            {settings.show_agent_photo && (
              <div className="w-16 h-16 rounded-full bg-gray-300" />
            )}
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-lg">{agentInfo?.display_name || "Agent Name"}</p>
              {agentInfo?.company_name && (
                <p className="text-gray-600">{agentInfo.company_name}</p>
              )}
              <div className="mt-2 space-y-1 text-xs">
                {settings.show_agent_phone && agentInfo?.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {agentInfo.phone}
                  </div>
                )}
                {settings.show_agent_email && agentInfo?.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {agentInfo.email}
                  </div>
                )}
                {settings.show_agent_website && (
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    www.youragentsite.com
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {settings.footer_style === "qr" && (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-gray-200 mb-2" />
            <p className="text-xs text-gray-600">Scan for more details</p>
          </div>
        )}

        {settings.footer_style === "minimal" && (
          <div className="text-center text-sm">
            <p className="font-bold">{agentInfo?.display_name || "Agent Name"}</p>
            <div className="flex items-center gap-4 justify-center mt-1">
              {settings.show_agent_phone && agentInfo?.phone && <span>{agentInfo.phone}</span>}
              {settings.show_agent_email && agentInfo?.email && <span>{agentInfo.email}</span>}
            </div>
          </div>
        )}

        {settings.custom_footer_text && (
          <p className="text-xs text-gray-500 text-center mt-4">{settings.custom_footer_text}</p>
        )}
      </div>
    </div>
  );
}
