import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the development badge from covering the compact mobile Feed control.
  // Compile/runtime errors still surface normally.
  devIndicators: false,
};

export default nextConfig;
