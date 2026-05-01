import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/toaster";
import CapacitorInit from "@/components/capacitor-init";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Inline script that runs before paint to set the html.dark class based on
// the user's stored preference (or OS preference if "system"). Prevents a
// flash of light theme when the app reloads in dark mode.
const themeInitScript = `(function(){try{var p=localStorage.getItem("theme")||"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

// Using system fonts due to Google Fonts network restrictions
// Replace with Geist fonts when environment allows

export const metadata: Metadata = {
  title: "The Real Estate Genie™ - The Real Estate Operating System",
  description: "AI-powered open house management and lead capture for real estate agents",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider>
          <CapacitorInit />
          {children}
          <Analytics />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
