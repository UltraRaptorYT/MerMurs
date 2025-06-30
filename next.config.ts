import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/scrape": ["node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;
