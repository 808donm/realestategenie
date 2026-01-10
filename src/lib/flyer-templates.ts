// Pre-designed flyer templates for open house customization

export type FlyerTemplate = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  defaultSettings: {
    headerStyle: "centered" | "left" | "split";
    footerStyle: "contact" | "qr" | "minimal";
    imageLayout: "hero" | "grid" | "side";
  };
};

export const FLYER_TEMPLATES: FlyerTemplate[] = [
  {
    id: "modern",
    name: "Modern Elegance",
    description: "Clean, contemporary design with bold typography and ample white space",
    thumbnail: "/templates/modern-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "centered",
      footerStyle: "contact",
      imageLayout: "hero",
    },
  },
  {
    id: "classic",
    name: "Classic Professional",
    description: "Traditional layout with serif fonts and elegant borders",
    thumbnail: "/templates/classic-thumb.png",
    category: "Traditional",
    defaultSettings: {
      headerStyle: "split",
      footerStyle: "contact",
      imageLayout: "grid",
    },
  },
  {
    id: "minimal",
    name: "Minimalist",
    description: "Simple, clean design focusing on the property imagery",
    thumbnail: "/templates/minimal-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "left",
      footerStyle: "minimal",
      imageLayout: "hero",
    },
  },
  {
    id: "luxury",
    name: "Luxury Estate",
    description: "Sophisticated design with premium feel, perfect for high-end properties",
    thumbnail: "/templates/luxury-thumb.png",
    category: "Premium",
    defaultSettings: {
      headerStyle: "centered",
      footerStyle: "qr",
      imageLayout: "side",
    },
  },
  {
    id: "bold",
    name: "Bold Impact",
    description: "Eye-catching design with vibrant colors and modern layout",
    thumbnail: "/templates/bold-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "split",
      footerStyle: "contact",
      imageLayout: "grid",
    },
  },
];

export const FONT_OPTIONS = [
  { value: "inter", label: "Inter (Modern Sans-Serif)", preview: "font-sans" },
  { value: "montserrat", label: "Montserrat (Bold & Clean)", preview: "font-sans" },
  { value: "playfair", label: "Playfair Display (Elegant Serif)", preview: "font-serif" },
  { value: "roboto", label: "Roboto (Professional)", preview: "font-sans" },
  { value: "lato", label: "Lato (Friendly & Modern)", preview: "font-sans" },
];

export const COLOR_PRESETS = [
  { name: "Navy Blue", primary: "#1e40af", secondary: "#64748b" },
  { name: "Forest Green", primary: "#047857", secondary: "#6b7280" },
  { name: "Burgundy", primary: "#991b1b", secondary: "#78716c" },
  { name: "Royal Purple", primary: "#7c3aed", secondary: "#71717a" },
  { name: "Teal", primary: "#0f766e", secondary: "#6b7280" },
  { name: "Charcoal", primary: "#1f2937", secondary: "#9ca3af" },
];

export type TemplateSettings = {
  template_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  show_price: boolean;
  show_bedrooms: boolean;
  show_bathrooms: boolean;
  show_square_feet: boolean;
  show_lot_size: boolean;
  show_year_built: boolean;
  show_property_type: boolean;
  show_mls_number: boolean;
  header_style: "centered" | "left" | "split";
  footer_style: "contact" | "qr" | "minimal";
  image_layout: "hero" | "grid" | "side";
  show_agent_photo: boolean;
  show_agent_phone: boolean;
  show_agent_email: boolean;
  show_agent_website: boolean;
  show_qr_code: boolean;
  custom_tagline: string | null;
  custom_footer_text: string | null;
};

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  template_id: "modern",
  logo_url: null,
  primary_color: "#1e40af",
  secondary_color: "#64748b",
  font_family: "inter",
  show_price: true,
  show_bedrooms: true,
  show_bathrooms: true,
  show_square_feet: true,
  show_lot_size: true,
  show_year_built: false,
  show_property_type: true,
  show_mls_number: false,
  header_style: "centered",
  footer_style: "contact",
  image_layout: "hero",
  show_agent_photo: true,
  show_agent_phone: true,
  show_agent_email: true,
  show_agent_website: true,
  show_qr_code: false,
  custom_tagline: null,
  custom_footer_text: null,
};
