"use client";

import { Badge } from "@/components/ui/badge";
import { type TemplateSettings } from "@/lib/flyer-templates";
import { Home, Bed, Bath, Ruler, MapPin, Phone, Mail, Globe, Calendar, Clock } from "lucide-react";

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

// Hex to RGB helper
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

// Property features component
function PropertyFeatures({ settings }: { settings: TemplateSettings }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {settings.show_bedrooms && (
        <div className="flex items-center gap-2">
          <Bed className="w-4 h-4" style={{ color: settings.secondary_color }} />
          <span className="text-sm font-medium">{SAMPLE_PROPERTY.bedrooms} Bedrooms</span>
        </div>
      )}
      {settings.show_bathrooms && (
        <div className="flex items-center gap-2">
          <Bath className="w-4 h-4" style={{ color: settings.secondary_color }} />
          <span className="text-sm font-medium">{SAMPLE_PROPERTY.bathrooms} Bathrooms</span>
        </div>
      )}
      {settings.show_square_feet && (
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4" style={{ color: settings.secondary_color }} />
          <span className="text-sm font-medium">{SAMPLE_PROPERTY.square_feet.toLocaleString()} Sq Ft</span>
        </div>
      )}
      {settings.show_lot_size && (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: settings.secondary_color }} />
          <span className="text-sm font-medium">{SAMPLE_PROPERTY.lot_size}</span>
        </div>
      )}
    </div>
  );
}

// Image placeholder(s)
function ImagePlaceholder({ layout }: { layout: string }) {
  if (layout === "hero") {
    return (
      <div className="w-full h-52 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
        <Home className="w-14 h-14 text-gray-500" />
      </div>
    );
  }
  if (layout === "grid") {
    return (
      <div className="grid grid-cols-3 gap-1 h-44">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <Home className="w-6 h-6 text-gray-500" />
          </div>
        ))}
      </div>
    );
  }
  // side
  return (
    <div className="grid grid-cols-2 gap-2 h-44">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center rounded">
          <Home className="w-10 h-10 text-gray-500" />
        </div>
      ))}
    </div>
  );
}

// ─── Template 1: Modern Living ───────────────────────────────────────────
// Dark navy header, gold accents, cream background, hero image, clean details
function ModernLivingTemplate({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#faf7f2" }}>
      {/* Dark navy header */}
      <div className="px-6 py-5 text-center" style={{ backgroundColor: settings.primary_color }}>
        {settings.logo_url && (
          <img src={settings.logo_url} alt="Logo" className="h-8 mx-auto mb-2" />
        )}
        {/* Gold decorative line */}
        <div className="w-16 h-0.5 mx-auto mb-2 rounded" style={{ backgroundColor: settings.secondary_color }} />
        <h2 className="text-3xl font-bold text-white tracking-widest">OPEN HOUSE</h2>
        <div className="w-16 h-0.5 mx-auto mt-2 rounded" style={{ backgroundColor: settings.secondary_color }} />
        {settings.custom_tagline && (
          <p className="text-sm text-white/80 mt-2 tracking-wide">{settings.custom_tagline}</p>
        )}
      </div>

      {/* Hero property image */}
      <div className="mx-4 mt-4">
        <ImagePlaceholder layout={settings.image_layout} />
      </div>

      {/* Property details */}
      <div className="px-6 py-4 flex-1">
        <h3 className="text-xl font-bold" style={{ color: settings.primary_color }}>
          {SAMPLE_PROPERTY.address}
        </h3>
        <p className="text-gray-600 text-sm">
          {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
        </p>

        {settings.show_price && (
          <p className="text-2xl font-bold mt-3" style={{ color: settings.secondary_color }}>
            ${SAMPLE_PROPERTY.price.toLocaleString()}
          </p>
        )}

        <div className="mt-3">
          <PropertyFeatures settings={settings} />
        </div>

        {/* Additional details */}
        <div className="flex flex-wrap gap-2 mt-3">
          {settings.show_property_type && <Badge variant="outline">{SAMPLE_PROPERTY.property_type}</Badge>}
          {settings.show_year_built && <Badge variant="outline">Built {SAMPLE_PROPERTY.year_built}</Badge>}
          {settings.show_mls_number && <Badge variant="outline">MLS# {SAMPLE_PROPERTY.mls_number}</Badge>}
        </div>
      </div>

      {/* Footer - agent contact on dark bg */}
      <div className="px-6 py-4" style={{ backgroundColor: settings.primary_color }}>
        <div className="flex items-center gap-4">
          {settings.show_agent_photo && (
            <div className="w-12 h-12 rounded-full bg-white/20 flex-shrink-0" />
          )}
          <div className="flex-1 text-white">
            <p className="font-bold text-sm">{agentInfo?.display_name || "Agent Name"}</p>
            {agentInfo?.company_name && <p className="text-xs text-white/70">{agentInfo.company_name}</p>}
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-white/80">
              {settings.show_agent_phone && agentInfo?.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{agentInfo.phone}</span>
              )}
              {settings.show_agent_email && agentInfo?.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{agentInfo.email}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template 2: Blue Horizon ────────────────────────────────────────────
// Vibrant blue header, large hero, organized details, QR code
function BlueHorizonTemplate({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Blue header */}
      <div className="px-6 py-6 text-center" style={{ backgroundColor: settings.primary_color }}>
        {settings.logo_url && (
          <img src={settings.logo_url} alt="Logo" className="h-8 mx-auto mb-2" />
        )}
        <p className="text-white/60 text-xs tracking-[0.3em] uppercase mb-1">Welcome to our</p>
        <h2 className="text-4xl font-bold text-white tracking-wider">OPEN HOUSE</h2>
        {settings.custom_tagline && (
          <p className="text-sm text-white/80 mt-2">{settings.custom_tagline}</p>
        )}
      </div>

      {/* Hero property image */}
      <ImagePlaceholder layout={settings.image_layout} />

      {/* Property info section */}
      <div className="px-6 py-4 flex-1" style={{ backgroundColor: settings.secondary_color }}>
        <h3 className="text-xl font-bold" style={{ color: settings.primary_color }}>
          {SAMPLE_PROPERTY.address}
        </h3>
        <p className="text-gray-600 text-sm">
          {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
        </p>

        {settings.show_price && (
          <p className="text-2xl font-bold mt-2" style={{ color: settings.primary_color }}>
            ${SAMPLE_PROPERTY.price.toLocaleString()}
          </p>
        )}

        <div className="mt-3">
          <PropertyFeatures settings={settings} />
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {settings.show_property_type && <Badge variant="outline">{SAMPLE_PROPERTY.property_type}</Badge>}
          {settings.show_year_built && <Badge variant="outline">Built {SAMPLE_PROPERTY.year_built}</Badge>}
          {settings.show_mls_number && <Badge variant="outline">MLS# {SAMPLE_PROPERTY.mls_number}</Badge>}
        </div>

        {/* Date/time banner */}
        <div className="mt-4 px-4 py-2 rounded-lg flex items-center gap-3" style={{ backgroundColor: settings.primary_color + "15" }}>
          <Calendar className="w-5 h-5" style={{ color: settings.primary_color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: settings.primary_color }}>Saturday, March 15, 2025</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> 10:00 AM - 2:00 PM
            </p>
          </div>
        </div>
      </div>

      {/* Footer with agent + QR */}
      <div className="px-6 py-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings.show_agent_photo && (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
          )}
          <div>
            <p className="font-bold text-sm">{agentInfo?.display_name || "Agent Name"}</p>
            {agentInfo?.company_name && <p className="text-xs text-gray-500">{agentInfo.company_name}</p>}
            <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
              {settings.show_agent_phone && agentInfo?.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{agentInfo.phone}</span>
              )}
              {settings.show_agent_email && agentInfo?.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{agentInfo.email}</span>
              )}
            </div>
          </div>
        </div>
        {settings.show_qr_code && (
          <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

// ─── Template 3: Golden Elegance ─────────────────────────────────────────
// Cream bg, gold accents, elegant serif, geometric lines, side images, QR
function GoldenEleganceTemplate({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#fdf8f0" }}>
      {/* Top gold accent bar */}
      <div className="h-1.5" style={{ backgroundColor: settings.primary_color }} />

      {/* Elegant header */}
      <div className="px-6 py-5 text-center">
        {settings.logo_url && (
          <img src={settings.logo_url} alt="Logo" className="h-8 mx-auto mb-3" />
        )}
        {/* Decorative gold line */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-px" style={{ backgroundColor: settings.primary_color }} />
          <div className="w-2 h-2 rotate-45 border" style={{ borderColor: settings.primary_color }} />
          <div className="w-12 h-px" style={{ backgroundColor: settings.primary_color }} />
        </div>
        <h2 className="text-2xl font-serif font-bold tracking-wide" style={{ color: settings.secondary_color }}>
          YOUR DREAM HOME
        </h2>
        <p className="text-sm tracking-[0.2em] mt-1" style={{ color: settings.primary_color }}>
          AWAITS
        </p>
        {settings.custom_tagline && (
          <p className="text-xs mt-2" style={{ color: settings.secondary_color + "aa" }}>
            {settings.custom_tagline}
          </p>
        )}
        {/* Decorative gold line */}
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="w-12 h-px" style={{ backgroundColor: settings.primary_color }} />
          <div className="w-2 h-2 rotate-45 border" style={{ borderColor: settings.primary_color }} />
          <div className="w-12 h-px" style={{ backgroundColor: settings.primary_color }} />
        </div>
      </div>

      {/* Property images */}
      <div className="px-6">
        <ImagePlaceholder layout={settings.image_layout} />
      </div>

      {/* Property details - centered elegant */}
      <div className="px-6 py-4 text-center flex-1">
        <h3 className="text-xl font-serif font-bold" style={{ color: settings.secondary_color }}>
          {SAMPLE_PROPERTY.address}
        </h3>
        <p className="text-sm" style={{ color: settings.primary_color }}>
          {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
        </p>

        {settings.show_price && (
          <p className="text-2xl font-serif font-bold mt-2" style={{ color: settings.primary_color }}>
            ${SAMPLE_PROPERTY.price.toLocaleString()}
          </p>
        )}

        {/* Features in elegant row */}
        <div className="flex items-center justify-center gap-4 mt-3 text-sm" style={{ color: settings.secondary_color }}>
          {settings.show_bedrooms && <span>{SAMPLE_PROPERTY.bedrooms} Bed</span>}
          {settings.show_bedrooms && settings.show_bathrooms && (
            <span style={{ color: settings.primary_color }}>|</span>
          )}
          {settings.show_bathrooms && <span>{SAMPLE_PROPERTY.bathrooms} Bath</span>}
          {settings.show_bathrooms && settings.show_square_feet && (
            <span style={{ color: settings.primary_color }}>|</span>
          )}
          {settings.show_square_feet && <span>{SAMPLE_PROPERTY.square_feet.toLocaleString()} Sq Ft</span>}
        </div>

        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          {settings.show_property_type && <Badge variant="outline">{SAMPLE_PROPERTY.property_type}</Badge>}
          {settings.show_year_built && <Badge variant="outline">Built {SAMPLE_PROPERTY.year_built}</Badge>}
          {settings.show_mls_number && <Badge variant="outline">MLS# {SAMPLE_PROPERTY.mls_number}</Badge>}
        </div>
      </div>

      {/* Footer with agent + QR */}
      <div className="px-6 py-3 border-t" style={{ borderColor: settings.primary_color + "40" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.show_agent_photo && (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
            )}
            <div>
              <p className="font-serif font-bold text-sm" style={{ color: settings.secondary_color }}>
                {agentInfo?.display_name || "Agent Name"}
              </p>
              <div className="flex gap-3 mt-0.5 text-xs" style={{ color: settings.primary_color }}>
                {settings.show_agent_phone && agentInfo?.phone && <span>{agentInfo.phone}</span>}
                {settings.show_agent_email && agentInfo?.email && <span>{agentInfo.email}</span>}
              </div>
            </div>
          </div>
          {settings.show_qr_code && (
            <div className="text-center">
              <div className="w-14 h-14 bg-gray-200 rounded" />
              <p className="text-[8px] mt-0.5" style={{ color: settings.primary_color }}>Scan for details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template 4: Warm Welcome ────────────────────────────────────────────
// Dark brown header, warm cream bg, agent-focused, split header
function WarmWelcomeTemplate({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#faf5f0" }}>
      {/* Split dark brown header */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: settings.primary_color }}>
        <div>
          {settings.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="h-8 mb-1" />
          )}
          <h2 className="text-2xl font-serif font-bold text-white">OPEN HOUSE</h2>
          {settings.custom_tagline && (
            <p className="text-xs mt-0.5" style={{ color: settings.secondary_color }}>
              {settings.custom_tagline}
            </p>
          )}
        </div>
        <div className="text-right text-sm text-white/80">
          {settings.show_agent_phone && agentInfo?.phone && (
            <div className="flex items-center gap-1 justify-end text-xs">
              <Phone className="w-3 h-3" /> {agentInfo.phone}
            </div>
          )}
          {settings.show_agent_email && agentInfo?.email && (
            <div className="flex items-center gap-1 justify-end text-xs">
              <Mail className="w-3 h-3" /> {agentInfo.email}
            </div>
          )}
          {settings.show_agent_website && (
            <div className="flex items-center gap-1 justify-end text-xs">
              <Globe className="w-3 h-3" /> www.youragentsite.com
            </div>
          )}
        </div>
      </div>

      {/* Hero property image */}
      <div className="mx-4 mt-3">
        <ImagePlaceholder layout={settings.image_layout} />
      </div>

      {/* Property details */}
      <div className="px-6 py-4 flex-1">
        <h3 className="text-xl font-serif font-bold" style={{ color: settings.primary_color }}>
          {SAMPLE_PROPERTY.address}
        </h3>
        <p className="text-sm" style={{ color: settings.secondary_color }}>
          {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
        </p>

        {settings.show_price && (
          <p className="text-2xl font-bold mt-2" style={{ color: settings.primary_color }}>
            ${SAMPLE_PROPERTY.price.toLocaleString()}
          </p>
        )}

        <div className="mt-3">
          <PropertyFeatures settings={settings} />
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {settings.show_property_type && <Badge variant="outline">{SAMPLE_PROPERTY.property_type}</Badge>}
          {settings.show_year_built && <Badge variant="outline">Built {SAMPLE_PROPERTY.year_built}</Badge>}
          {settings.show_mls_number && <Badge variant="outline">MLS# {SAMPLE_PROPERTY.mls_number}</Badge>}
        </div>
      </div>

      {/* Date/time banner */}
      <div className="mx-4 px-4 py-2 rounded text-center text-white" style={{ backgroundColor: settings.secondary_color }}>
        <p className="text-sm font-semibold flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4" />
          Saturday, March 15 | 10:00 AM - 2:00 PM
        </p>
      </div>

      {/* Footer - agent prominent */}
      <div className="px-6 py-3 mt-2" style={{ backgroundColor: settings.primary_color }}>
        <div className="flex items-center gap-4">
          {settings.show_agent_photo && (
            <div className="w-14 h-14 rounded-full bg-white/20 flex-shrink-0 border-2" style={{ borderColor: settings.secondary_color }} />
          )}
          <div className="flex-1 text-white">
            <p className="font-serif font-bold">{agentInfo?.display_name || "Agent Name"}</p>
            {agentInfo?.company_name && <p className="text-xs text-white/60">{agentInfo.company_name}</p>}
            <div className="flex gap-3 mt-1 text-xs text-white/70">
              {settings.show_agent_phone && agentInfo?.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{agentInfo.phone}</span>
              )}
              {settings.show_agent_email && agentInfo?.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{agentInfo.email}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template 5: Bold Statement ──────────────────────────────────────────
// Dark navy bg, coral/red accents, geometric dot patterns, bold typography, grid
function BoldStatementTemplate({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  // Generate dot pattern
  const DotPattern = ({ size = 4, className = "" }: { size?: number; className?: string }) => (
    <div className={`grid gap-1 ${className}`} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {Array.from({ length: size * size }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: settings.secondary_color, opacity: 0.3 }}
        />
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: settings.primary_color }}>
      {/* Header with dot patterns */}
      <div className="px-6 py-4 flex items-center justify-between relative">
        <DotPattern size={4} className="absolute left-3 top-3" />
        <div className="ml-14">
          {settings.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="h-6 mb-1" />
          )}
          <h2 className="text-2xl font-bold text-white tracking-wider">HOUSE</h2>
          <p className="text-lg font-bold" style={{ color: settings.secondary_color }}>
            FOR SALE
          </p>
          {settings.custom_tagline && (
            <p className="text-xs text-white/60 mt-0.5">{settings.custom_tagline}</p>
          )}
        </div>
        <DotPattern size={4} className="absolute right-3 top-3" />
      </div>

      {/* Property images grid */}
      <div className="px-3">
        <ImagePlaceholder layout={settings.image_layout} />
      </div>

      {/* Property details on dark bg */}
      <div className="px-6 py-4 flex-1">
        <h3 className="text-xl font-bold text-white">
          {SAMPLE_PROPERTY.address}
        </h3>
        <p className="text-sm text-white/60">
          {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
        </p>

        {settings.show_price && (
          <p className="text-2xl font-bold mt-2" style={{ color: settings.secondary_color }}>
            ${SAMPLE_PROPERTY.price.toLocaleString()}
          </p>
        )}

        {/* Features row with accent color */}
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-white/80">
          {settings.show_bedrooms && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" style={{ color: settings.secondary_color }} />
              <span>{SAMPLE_PROPERTY.bedrooms} Bed</span>
            </div>
          )}
          {settings.show_bathrooms && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" style={{ color: settings.secondary_color }} />
              <span>{SAMPLE_PROPERTY.bathrooms} Bath</span>
            </div>
          )}
          {settings.show_square_feet && (
            <div className="flex items-center gap-1">
              <Ruler className="w-4 h-4" style={{ color: settings.secondary_color }} />
              <span>{SAMPLE_PROPERTY.square_feet.toLocaleString()} Sq Ft</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {settings.show_property_type && (
            <Badge className="bg-white/10 text-white border-white/20">{SAMPLE_PROPERTY.property_type}</Badge>
          )}
          {settings.show_year_built && (
            <Badge className="bg-white/10 text-white border-white/20">Built {SAMPLE_PROPERTY.year_built}</Badge>
          )}
          {settings.show_mls_number && (
            <Badge className="bg-white/10 text-white border-white/20">MLS# {SAMPLE_PROPERTY.mls_number}</Badge>
          )}
        </div>
      </div>

      {/* Footer on accent color */}
      <div className="px-6 py-3" style={{ backgroundColor: settings.secondary_color }}>
        <div className="flex items-center gap-4">
          {settings.show_agent_photo && (
            <div className="w-12 h-12 rounded-full bg-white/30 flex-shrink-0" />
          )}
          <div className="flex-1 text-white">
            <p className="font-bold text-sm">{agentInfo?.display_name || "Agent Name"}</p>
            {agentInfo?.company_name && <p className="text-xs text-white/70">{agentInfo.company_name}</p>}
            <div className="flex gap-3 mt-0.5 text-xs text-white/80">
              {settings.show_agent_phone && agentInfo?.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{agentInfo.phone}</span>
              )}
              {settings.show_agent_email && agentInfo?.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{agentInfo.email}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generic Fallback ────────────────────────────────────────────────────
function GenericTemplate({ settings, agentInfo }: { settings: TemplateSettings; agentInfo: any }) {
  return (
    <div className="h-full flex flex-col bg-white">
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
      </div>

      <ImagePlaceholder layout={settings.image_layout} />

      <div className="p-6 flex-1">
        <h3 className="text-2xl font-bold" style={{ color: settings.primary_color }}>
          {SAMPLE_PROPERTY.address}
        </h3>
        <p className="text-gray-600">
          {SAMPLE_PROPERTY.city}, {SAMPLE_PROPERTY.state} {SAMPLE_PROPERTY.zip}
        </p>
        {settings.show_price && (
          <p className="text-3xl font-bold mt-3" style={{ color: settings.primary_color }}>
            ${SAMPLE_PROPERTY.price.toLocaleString()}
          </p>
        )}
        <div className="mt-3">
          <PropertyFeatures settings={settings} />
        </div>
      </div>

      <div className="p-6 border-t" style={{ borderColor: settings.primary_color + "30" }}>
        <div className="flex items-center gap-4">
          {settings.show_agent_photo && <div className="w-12 h-12 rounded-full bg-gray-300" />}
          <div>
            <p className="font-bold">{agentInfo?.display_name || "Agent Name"}</p>
            {settings.show_agent_phone && agentInfo?.phone && (
              <p className="text-xs text-gray-500">{agentInfo.phone}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Preview Component ──────────────────────────────────────────────
export default function TemplatePreview({ settings, agentInfo, compact = false }: Props) {
  const templateId = settings.template_id;

  const renderTemplate = () => {
    switch (templateId) {
      case "modern-living":
        return <ModernLivingTemplate settings={settings} agentInfo={agentInfo} />;
      case "blue-horizon":
        return <BlueHorizonTemplate settings={settings} agentInfo={agentInfo} />;
      case "golden-elegance":
        return <GoldenEleganceTemplate settings={settings} agentInfo={agentInfo} />;
      case "warm-welcome":
        return <WarmWelcomeTemplate settings={settings} agentInfo={agentInfo} />;
      case "bold-statement":
        return <BoldStatementTemplate settings={settings} agentInfo={agentInfo} />;
      default:
        return <GenericTemplate settings={settings} agentInfo={agentInfo} />;
    }
  };

  return (
    <div
      className="bg-white shadow-lg mx-auto overflow-hidden"
      style={{
        width: compact ? "340px" : "680px",
        aspectRatio: "8.5/11",
        transform: compact ? "scale(0.5)" : "scale(1)",
        transformOrigin: "top center",
      }}
    >
      {renderTemplate()}
    </div>
  );
}
