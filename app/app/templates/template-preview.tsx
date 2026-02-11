"use client";

import { Badge } from "@/components/ui/badge";
import { type TemplateSettings } from "@/lib/flyer-templates";
import { Home, Bed, Bath, Ruler, MapPin, Phone, Mail, Globe, QrCode, Calendar, Star } from "lucide-react";

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

// QR Code placeholder component
function QrCodePlaceholder({ size = "md", label = "Scan to Check In" }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const sizeMap = {
    sm: { box: "w-12 h-12", icon: "w-8 h-8", text: "text-[8px]" },
    md: { box: "w-16 h-16", icon: "w-10 h-10", text: "text-[10px]" },
    lg: { box: "w-24 h-24", icon: "w-16 h-16", text: "text-xs" },
  };
  const s = sizeMap[size];
  return (
    <div className="flex flex-col items-center">
      <div className={`${s.box} bg-gray-100 border border-gray-300 rounded flex items-center justify-center`}>
        <QrCode className={`${s.icon} text-gray-400`} />
      </div>
      <p className={`${s.text} text-gray-500 mt-1`}>{label}</p>
    </div>
  );
}

// Generic footer shared across standard templates
function GenericFooter({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
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
          {settings.show_qr_code && <QrCodePlaceholder size="md" />}
        </div>
      )}

      {settings.footer_style === "qr" && (
        <div className="flex items-center justify-center gap-6">
          <QrCodePlaceholder size="lg" label="Scan for more details" />
        </div>
      )}

      {settings.footer_style === "minimal" && (
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="font-bold">{agentInfo?.display_name || "Agent Name"}</p>
            <div className="flex items-center gap-4 mt-1">
              {settings.show_agent_phone && agentInfo?.phone && <span>{agentInfo.phone}</span>}
              {settings.show_agent_email && agentInfo?.email && <span>{agentInfo.email}</span>}
            </div>
          </div>
          {settings.show_qr_code && <QrCodePlaceholder size="sm" />}
        </div>
      )}

      {settings.custom_footer_text && (
        <p className="text-xs text-gray-500 text-center mt-4">{settings.custom_footer_text}</p>
      )}
    </div>
  );
}

// ── "Just Listed" Template ──
function JustListedPreview({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
    <>
      {/* Banner */}
      <div
        className="relative py-4 text-center"
        style={{ backgroundColor: settings.primary_color }}
      >
        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]" />
        <div className="relative">
          {settings.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="h-8 mx-auto mb-2" />
          )}
          <p className="text-white/80 text-xs font-semibold tracking-[0.3em] uppercase">Exclusively</p>
          <h2 className="text-4xl font-extrabold text-white tracking-wide">JUST LISTED</h2>
          {settings.custom_tagline && (
            <p className="text-white/80 text-sm mt-1">{settings.custom_tagline}</p>
          )}
        </div>
      </div>

      {/* Hero Photo */}
      <div className="h-72 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center relative">
        <Home className="w-20 h-20 text-gray-500" />
        {settings.show_price && (
          <div
            className="absolute bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg"
            style={{ backgroundColor: settings.primary_color }}
          >
            <p className="text-white text-2xl font-bold">${SAMPLE_PROPERTY.price.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Property Info */}
      <div className="p-6 flex-1">
        <h3 className="text-2xl font-bold" style={{ color: settings.primary_color }}>
          {SAMPLE_PROPERTY.address}
        </h3>
        <p className="text-gray-500 mb-4">
          {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
        </p>

        {/* Stats Row */}
        <div
          className="flex justify-around py-3 rounded-lg mb-4"
          style={{ backgroundColor: settings.primary_color + "10" }}
        >
          {settings.show_bedrooms && (
            <div className="text-center">
              <Bed className="w-5 h-5 mx-auto mb-1" style={{ color: settings.primary_color }} />
              <p className="font-bold text-lg">{SAMPLE_PROPERTY.bedrooms}</p>
              <p className="text-xs text-gray-500">Beds</p>
            </div>
          )}
          {settings.show_bathrooms && (
            <div className="text-center">
              <Bath className="w-5 h-5 mx-auto mb-1" style={{ color: settings.primary_color }} />
              <p className="font-bold text-lg">{SAMPLE_PROPERTY.bathrooms}</p>
              <p className="text-xs text-gray-500">Baths</p>
            </div>
          )}
          {settings.show_square_feet && (
            <div className="text-center">
              <Ruler className="w-5 h-5 mx-auto mb-1" style={{ color: settings.primary_color }} />
              <p className="font-bold text-lg">{SAMPLE_PROPERTY.square_feet.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Sq Ft</p>
            </div>
          )}
          {settings.show_lot_size && (
            <div className="text-center">
              <MapPin className="w-5 h-5 mx-auto mb-1" style={{ color: settings.primary_color }} />
              <p className="font-bold text-sm">{SAMPLE_PROPERTY.lot_size}</p>
              <p className="text-xs text-gray-500">Lot</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {settings.show_property_type && <Badge variant="outline">{SAMPLE_PROPERTY.property_type}</Badge>}
          {settings.show_year_built && <Badge variant="outline">Built {SAMPLE_PROPERTY.year_built}</Badge>}
          {settings.show_mls_number && <Badge variant="outline">MLS# {SAMPLE_PROPERTY.mls_number}</Badge>}
        </div>
      </div>

      {/* Footer with agent + QR */}
      <div
        className="p-5 flex items-center gap-4"
        style={{ backgroundColor: settings.secondary_color, color: "white" }}
      >
        {settings.show_agent_photo && (
          <div className="w-14 h-14 rounded-full bg-white/20 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base">{agentInfo?.display_name || "Agent Name"}</p>
          <div className="space-y-0.5 text-xs text-white/80">
            {settings.show_agent_phone && agentInfo?.phone && (
              <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{agentInfo.phone}</div>
            )}
            {settings.show_agent_email && agentInfo?.email && (
              <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{agentInfo.email}</div>
            )}
          </div>
        </div>
        {settings.show_qr_code && (
          <div className="flex flex-col items-center shrink-0">
            <div className="w-14 h-14 bg-white rounded flex items-center justify-center">
              <QrCode className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-[9px] text-white/70 mt-1">Scan to Check In</p>
          </div>
        )}
      </div>
    </>
  );
}

// ── "Showcase" Template ──
function ShowcasePreview({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
    <>
      {/* Full-bleed image with dark overlay */}
      <div className="h-80 relative bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
        <Home className="w-24 h-24 text-gray-600" />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        {/* Top badge */}
        <div className="absolute top-4 left-4 px-3 py-1 text-xs font-bold tracking-wider uppercase"
          style={{ backgroundColor: settings.secondary_color, color: settings.primary_color }}>
          Open House
        </div>
        {/* Logo */}
        {settings.logo_url && (
          <img src={settings.logo_url} alt="Logo" className="absolute top-4 right-4 h-8 opacity-80" />
        )}
        {/* Overlaid property info */}
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <h3 className="text-3xl font-bold mb-1">{SAMPLE_PROPERTY.address}</h3>
          <p className="text-white/70 text-sm mb-3">
            {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
          </p>
          {settings.show_price && (
            <p className="text-3xl font-bold" style={{ color: settings.secondary_color }}>
              ${SAMPLE_PROPERTY.price.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 border-b" style={{ borderColor: settings.secondary_color + "40" }}>
        {settings.show_bedrooms && (
          <div className="py-4 text-center border-r" style={{ borderColor: settings.secondary_color + "20" }}>
            <p className="text-2xl font-bold" style={{ color: settings.primary_color }}>{SAMPLE_PROPERTY.bedrooms}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Beds</p>
          </div>
        )}
        {settings.show_bathrooms && (
          <div className="py-4 text-center border-r" style={{ borderColor: settings.secondary_color + "20" }}>
            <p className="text-2xl font-bold" style={{ color: settings.primary_color }}>{SAMPLE_PROPERTY.bathrooms}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Baths</p>
          </div>
        )}
        {settings.show_square_feet && (
          <div className="py-4 text-center border-r" style={{ borderColor: settings.secondary_color + "20" }}>
            <p className="text-2xl font-bold" style={{ color: settings.primary_color }}>{SAMPLE_PROPERTY.square_feet.toLocaleString()}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Sq Ft</p>
          </div>
        )}
        {settings.show_lot_size && (
          <div className="py-4 text-center">
            <p className="text-lg font-bold" style={{ color: settings.primary_color }}>{SAMPLE_PROPERTY.lot_size}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Lot Size</p>
          </div>
        )}
      </div>

      {/* Details section */}
      <div className="p-6 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4" style={{ color: settings.secondary_color }} />
          <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: settings.secondary_color }}>Property Highlights</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {settings.show_property_type && (
            <Badge className="text-white text-xs" style={{ backgroundColor: settings.primary_color }}>{SAMPLE_PROPERTY.property_type}</Badge>
          )}
          {settings.show_year_built && (
            <Badge className="text-white text-xs" style={{ backgroundColor: settings.primary_color }}>Built {SAMPLE_PROPERTY.year_built}</Badge>
          )}
          {settings.show_mls_number && (
            <Badge variant="outline" className="text-xs">MLS# {SAMPLE_PROPERTY.mls_number}</Badge>
          )}
        </div>
        {settings.custom_tagline && (
          <p className="text-sm text-gray-600 italic">{settings.custom_tagline}</p>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 flex items-center gap-4" style={{ backgroundColor: settings.primary_color }}>
        {settings.show_agent_photo && (
          <div className="w-14 h-14 rounded-full bg-white/20 shrink-0 border-2" style={{ borderColor: settings.secondary_color }} />
        )}
        <div className="flex-1 min-w-0 text-white">
          <p className="font-bold text-base">{agentInfo?.display_name || "Agent Name"}</p>
          <div className="space-y-0.5 text-xs text-white/70">
            {settings.show_agent_phone && agentInfo?.phone && (
              <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{agentInfo.phone}</div>
            )}
            {settings.show_agent_email && agentInfo?.email && (
              <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{agentInfo.email}</div>
            )}
          </div>
        </div>
        {settings.show_qr_code && (
          <div className="flex flex-col items-center shrink-0">
            <div className="w-14 h-14 bg-white rounded flex items-center justify-center">
              <QrCode className="w-10 h-10" style={{ color: settings.primary_color }} />
            </div>
            <p className="text-[9px] text-white/60 mt-1">Scan to Check In</p>
          </div>
        )}
      </div>
    </>
  );
}

// ── "Property Spotlight" Template ──
function SpotlightPreview({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
    <div className="flex h-full">
      {/* Left Sidebar Accent */}
      <div className="w-2 shrink-0" style={{ backgroundColor: settings.primary_color }} />

      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: settings.primary_color }}>
          <div className="flex items-center gap-3">
            {settings.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="h-8" />
            )}
            <div className="text-white">
              <h2 className="text-lg font-bold tracking-wide">PROPERTY SPOTLIGHT</h2>
              {settings.custom_tagline && (
                <p className="text-xs text-white/70">{settings.custom_tagline}</p>
              )}
            </div>
          </div>
          <div className="text-white text-right text-xs">
            {settings.show_agent_phone && agentInfo?.phone && (
              <div className="flex items-center gap-1 justify-end"><Phone className="w-3 h-3" />{agentInfo.phone}</div>
            )}
          </div>
        </div>

        {/* Side-by-side photos */}
        <div className="grid grid-cols-5 gap-1 p-1">
          <div className="col-span-3 h-52 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center rounded-l">
            <Home className="w-14 h-14 text-gray-500" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <div className="flex-1 bg-gradient-to-br from-gray-300 to-gray-350 flex items-center justify-center rounded-tr">
              <Home className="w-8 h-8 text-gray-500" />
            </div>
            <div className="flex-1 bg-gradient-to-br from-gray-350 to-gray-400 flex items-center justify-center rounded-br">
              <Home className="w-8 h-8 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="px-5 py-4 flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-xl font-bold" style={{ color: settings.secondary_color }}>
                {SAMPLE_PROPERTY.address}
              </h3>
              <p className="text-gray-500 text-sm">
                {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
              </p>
            </div>
            {settings.show_price && (
              <p className="text-2xl font-bold" style={{ color: settings.primary_color }}>
                ${SAMPLE_PROPERTY.price.toLocaleString()}
              </p>
            )}
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {settings.show_bedrooms && (
              <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: settings.primary_color + "08" }}>
                <Bed className="w-4 h-4" style={{ color: settings.primary_color }} />
                <span className="text-sm font-medium">{SAMPLE_PROPERTY.bedrooms} Bedrooms</span>
              </div>
            )}
            {settings.show_bathrooms && (
              <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: settings.primary_color + "08" }}>
                <Bath className="w-4 h-4" style={{ color: settings.primary_color }} />
                <span className="text-sm font-medium">{SAMPLE_PROPERTY.bathrooms} Bathrooms</span>
              </div>
            )}
            {settings.show_square_feet && (
              <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: settings.primary_color + "08" }}>
                <Ruler className="w-4 h-4" style={{ color: settings.primary_color }} />
                <span className="text-sm font-medium">{SAMPLE_PROPERTY.square_feet.toLocaleString()} Sq Ft</span>
              </div>
            )}
            {settings.show_lot_size && (
              <div className="flex items-center gap-2 p-2 rounded" style={{ backgroundColor: settings.primary_color + "08" }}>
                <MapPin className="w-4 h-4" style={{ color: settings.primary_color }} />
                <span className="text-sm font-medium">{SAMPLE_PROPERTY.lot_size}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.show_property_type && <Badge variant="outline">{SAMPLE_PROPERTY.property_type}</Badge>}
            {settings.show_year_built && <Badge variant="outline">Built {SAMPLE_PROPERTY.year_built}</Badge>}
            {settings.show_mls_number && <Badge variant="outline">MLS# {SAMPLE_PROPERTY.mls_number}</Badge>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center gap-4" style={{ borderColor: settings.primary_color + "30" }}>
          {settings.show_agent_photo && (
            <div className="w-12 h-12 rounded-full bg-gray-300 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold">{agentInfo?.display_name || "Agent Name"}</p>
            <div className="text-xs text-gray-500 space-y-0.5">
              {settings.show_agent_email && agentInfo?.email && (
                <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{agentInfo.email}</div>
              )}
              {settings.show_agent_website && (
                <div className="flex items-center gap-1"><Globe className="w-3 h-3" />www.youragentsite.com</div>
              )}
            </div>
          </div>
          {settings.show_qr_code && (
            <div className="flex flex-col items-center shrink-0">
              <div className="w-14 h-14 bg-gray-100 border-2 rounded flex items-center justify-center"
                style={{ borderColor: settings.primary_color }}>
                <QrCode className="w-9 h-9" style={{ color: settings.primary_color }} />
              </div>
              <p className="text-[9px] text-gray-500 mt-1">Scan to Check In</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Generic Template (used by modern, classic, minimal, luxury, bold) ──
function GenericPreview({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
    <>
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
      <GenericFooter settings={settings} agentInfo={agentInfo} />
    </>
  );
}

export default function TemplatePreview({ settings, agentInfo, compact = false }: Props) {
  const isCustomTemplate = ["just-listed", "showcase", "spotlight"].includes(settings.template_id);

  return (
    <div
      className="bg-white shadow-lg mx-auto flex flex-col overflow-hidden"
      style={{
        width: compact ? "340px" : "680px",
        aspectRatio: "8.5/11",
        transform: compact ? "scale(0.5)" : "scale(1)",
        transformOrigin: "top center",
      }}
    >
      {settings.template_id === "just-listed" && (
        <JustListedPreview settings={settings} agentInfo={agentInfo} />
      )}
      {settings.template_id === "showcase" && (
        <ShowcasePreview settings={settings} agentInfo={agentInfo} />
      )}
      {settings.template_id === "spotlight" && (
        <SpotlightPreview settings={settings} agentInfo={agentInfo} />
      )}
      {!isCustomTemplate && (
        <GenericPreview settings={settings} agentInfo={agentInfo} />
      )}
    </div>
  );
}
