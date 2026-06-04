import type { NextConfig } from "next";
import { securityHeaders } from "./security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Mobile LAN dev — allow all local network origins
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.10",
    "192.168.1.10:3000",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(securityHeaders()).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
