import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.paragonrels.com",
      },
      {
        protocol: "https",
        hostname: "*.corelogic.com",
      },
      {
        protocol: "https",
        hostname: "*.cotality.com",
      },
      {
        protocol: "https",
        hostname: "**.trestlemls.com",
      },
    ],
  },
  // Prevent Resend from being bundled - keep it as external module
  // This prevents build-time initialization errors
  serverExternalPackages: ["resend", "web-push"],
};

export default nextConfig;
