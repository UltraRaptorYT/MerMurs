import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["api.qrserver.com"],
  },
  outputFileTracingIncludes: {
    "/api/scrape": ["node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
