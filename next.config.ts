import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint kaldırıldı
  output: 'standalone',
};

export default nextConfig;