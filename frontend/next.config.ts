import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    '169.254.144.119',
    '192.168.50.141',
    'localhost',
    '127.0.0.1',
    // Chỉ cho phép hostname tunnel đang dùng; đổi DEV_TUNNEL_HOST khi URL đổi.
    process.env.DEV_TUNNEL_HOST || 'level-answered-maple-dominant.trycloudflare.com',
  ],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
