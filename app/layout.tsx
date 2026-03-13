import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/toaster";
import CapacitorInit from "@/components/capacitor-init";
import "./globals.css";

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
      <body className="antialiased font-sans">
        <CapacitorInit />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
