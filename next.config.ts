import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable prerendering to prevent stale cache on Vercel
  output: 'standalone',
  experimental: {
    forceSwcTransforms: true,
  },
};

export default nextConfig;
