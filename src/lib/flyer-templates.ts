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
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    showPrice: boolean;
    showAgentPhoto: boolean;
    showQrCode: boolean;
  };
};

export const FLYER_TEMPLATES: FlyerTemplate[] = [
  {
    id: "modern",
    name: "Modern Elegance",
    description: "Clean, contemporary design with bold typography, centered layout, and large hero images. Perfect for showcasing stunning properties.",
    thumbnail: "/templates/modern-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "centered",
      footerStyle: "contact",
      imageLayout: "hero",
      primaryColor: "#1e40af", // Deep blue
      secondaryColor: "#64748b", // Slate gray
      fontFamily: "inter",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: true,
    },
  },
  {
    id: "classic",
    name: "Classic Professional",
    description: "Traditional, timeless layout with elegant serif fonts, split header design, and multi-image grid. Ideal for established agents and luxury markets.",
    thumbnail: "/templates/classic-thumb.png",
    category: "Traditional",
    defaultSettings: {
      headerStyle: "split",
      footerStyle: "contact",
      imageLayout: "grid",
      primaryColor: "#7c2d12", // Rich brown/burgundy
      secondaryColor: "#78716c", // Warm gray
      fontFamily: "playfair",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: true,
    },
  },
  {
    id: "minimal",
    name: "Minimalist",
    description: "Ultra-clean design with maximum white space, left-aligned text, and focus on property photography. Less is more approach for modern buyers.",
    thumbnail: "/templates/minimal-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "left",
      footerStyle: "minimal",
      imageLayout: "hero",
      primaryColor: "#1f2937", // Charcoal
      secondaryColor: "#9ca3af", // Light gray
      fontFamily: "montserrat",
      showPrice: true,
      showAgentPhoto: false,
      showQrCode: true,
    },
  },
  {
    id: "luxury",
    name: "Luxury Estate",
    description: "Premium design with gold accents, centered elegant typography, side-by-side image layout, and QR code for digital integration. For high-end properties.",
    thumbnail: "/templates/luxury-thumb.png",
    category: "Premium",
    defaultSettings: {
      headerStyle: "centered",
      footerStyle: "qr",
      imageLayout: "side",
      primaryColor: "#854d0e", // Gold/amber
      secondaryColor: "#44403c", // Dark stone
      fontFamily: "playfair",
      showPrice: false, // Luxury often hides price
      showAgentPhoto: true,
      showQrCode: true,
    },
  },
  {
    id: "bold",
    name: "Bold Impact",
    description: "High-contrast design with vibrant colors, dynamic split layout, and multi-image grid. Attention-grabbing for competitive markets and quick sales.",
    thumbnail: "/templates/bold-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "split",
      footerStyle: "contact",
      imageLayout: "grid",
      primaryColor: "#dc2626", // Vibrant red
      secondaryColor: "#1f2937", // Dark charcoal
      fontFamily: "roboto",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: true,
    },
  },
  {
    id: "just-listed",
    name: "Just Listed",
    description: "Eye-catching 'Just Listed' banner with warm coral accents, large hero photo, and prominent QR code. Great for new listings and generating buzz.",
    thumbnail: "/templates/just-listed-thumb.png",
    category: "Marketing",
    defaultSettings: {
      headerStyle: "centered",
      footerStyle: "contact",
      imageLayout: "hero",
      primaryColor: "#e85d3a", // Coral/orange
      secondaryColor: "#2d3436", // Dark charcoal
      fontFamily: "montserrat",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: true,
    },
  },
  {
    id: "showcase",
    name: "Showcase",
    description: "Dark, sophisticated design with a full-bleed property image, overlay text, and clean info cards. Perfect for high-end listings and social media sharing.",
    thumbnail: "/templates/showcase-thumb.png",
    category: "Premium",
    defaultSettings: {
      headerStyle: "left",
      footerStyle: "contact",
      imageLayout: "hero",
      primaryColor: "#1a1a2e", // Deep navy
      secondaryColor: "#e2b04a", // Gold accent
      fontFamily: "playfair",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: true,
    },
  },
  {
    id: "spotlight",
    name: "Property Spotlight",
    description: "Magazine-style layout with a sidebar color accent, large feature photo, and detailed property breakdown. Includes prominent QR code for instant digital access.",
    thumbnail: "/templates/spotlight-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "split",
      footerStyle: "contact",
      imageLayout: "side",
      primaryColor: "#0d9488", // Teal
      secondaryColor: "#334155", // Slate
      fontFamily: "inter",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: true,
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
  show_qr_code: true,
  custom_tagline: null,
  custom_footer_text: null,
};
