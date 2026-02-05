import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix turbopack root to this folder (not parent)
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
