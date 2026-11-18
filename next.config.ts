import type { NextConfig } from "next";

// Product and post images are served by the WooCommerce site itself.
const storeUrl = process.env.WC_STORE_URL ? new URL(process.env.WC_STORE_URL) : null;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: storeUrl
      ? [
          {
            protocol: storeUrl.protocol.replace(":", "") as "http" | "https",
            hostname: storeUrl.hostname,
            pathname: "/wp-content/uploads/**",
          },
        ]
      : [],
  },
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
