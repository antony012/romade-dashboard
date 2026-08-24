import type { NextConfig } from "next";
import path from "path";

const ROMADE_API_URL =
  process.env.ROMADE_API_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    if (!ROMADE_API_URL) {
      return [];
    }
    return [
      {
        source: "/backend/:path*",
        destination: `${ROMADE_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
