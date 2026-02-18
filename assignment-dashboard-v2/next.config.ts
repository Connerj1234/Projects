import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Keep lint for local/dev workflows, but do not fail production builds on lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
