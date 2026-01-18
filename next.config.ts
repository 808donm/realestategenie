import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Prevent Resend from being bundled - keep it as external module
  // This prevents build-time initialization errors
  serverExternalPackages: ["resend"],
};

export default nextConfig;
