// Pre-designed flyer templates for open house customization
// Based on professional real estate flyer designs

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
    id: "modern-living",
    name: "Modern Living",
    description:
      "Sleek dark header with cream background. Features bold 'OPEN HOUSE' banner, large hero image, and clean property details. Perfect for contemporary homes.",
    thumbnail: "/templates/modern-living-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "centered",
      footerStyle: "contact",
      imageLayout: "hero",
      primaryColor: "#0f172a", // Dark navy/slate
      secondaryColor: "#d4a853", // Gold accent
      fontFamily: "montserrat",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: false,
    },
  },
  {
    id: "blue-horizon",
    name: "Blue Horizon",
    description:
      "Vibrant blue header with prominent 'OPEN HOUSE' text, large property photo, and organized details section. Eye-catching design for maximum curb appeal.",
    thumbnail: "/templates/blue-horizon-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "centered",
      footerStyle: "contact",
      imageLayout: "hero",
      primaryColor: "#1e3a5f", // Deep blue
      secondaryColor: "#e8edf2", // Light blue-gray
      fontFamily: "inter",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: true,
    },
  },
  {
    id: "golden-elegance",
    name: "Golden Elegance",
    description:
      "Luxurious cream and gold design with elegant serif typography and geometric accent lines. Features 'YOUR DREAM HOME AWAITS' tagline. Ideal for upscale listings.",
    thumbnail: "/templates/golden-elegance-thumb.png",
    category: "Premium",
    defaultSettings: {
      headerStyle: "centered",
      footerStyle: "qr",
      imageLayout: "side",
      primaryColor: "#b8860b", // Dark goldenrod
      secondaryColor: "#2c2c2c", // Near-black
      fontFamily: "playfair",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: true,
    },
  },
  {
    id: "warm-welcome",
    name: "Warm Welcome",
    description:
      "Rich dark brown header with warm tones throughout. Agent-focused layout with prominent photo and contact details. Great for building personal brand.",
    thumbnail: "/templates/warm-welcome-thumb.png",
    category: "Traditional",
    defaultSettings: {
      headerStyle: "split",
      footerStyle: "contact",
      imageLayout: "hero",
      primaryColor: "#3e2723", // Dark espresso brown
      secondaryColor: "#8d6e63", // Warm medium brown
      fontFamily: "playfair",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: false,
    },
  },
  {
    id: "bold-statement",
    name: "Bold Statement",
    description:
      "Attention-grabbing design with dark navy background, decorative geometric dot patterns, and bold sans-serif typography. Maximum impact for competitive markets.",
    thumbnail: "/templates/bold-statement-thumb.png",
    category: "Contemporary",
    defaultSettings: {
      headerStyle: "split",
      footerStyle: "contact",
      imageLayout: "grid",
      primaryColor: "#1a1a2e", // Dark navy
      secondaryColor: "#e94560", // Accent coral/red
      fontFamily: "roboto",
      showPrice: true,
      showAgentPhoto: true,
      showQrCode: false,
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
  { name: "Dark Navy", primary: "#0f172a", secondary: "#d4a853" },
  { name: "Deep Blue", primary: "#1e3a5f", secondary: "#e8edf2" },
  { name: "Golden", primary: "#b8860b", secondary: "#2c2c2c" },
  { name: "Espresso", primary: "#3e2723", secondary: "#8d6e63" },
  { name: "Midnight", primary: "#1a1a2e", secondary: "#e94560" },
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
  template_id: "modern-living",
  logo_url: null,
  primary_color: "#0f172a",
  secondary_color: "#d4a853",
  font_family: "montserrat",
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
