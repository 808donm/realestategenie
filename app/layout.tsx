import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

// Using system fonts due to Google Fonts network restrictions
// Replace with Geist fonts when environment allows

export const metadata: Metadata = {
  title: "The Real Estate Genie™ - Open House Management",
  description: "AI-powered open house management and lead capture for real estate agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
