import type { NextConfig } from "next";

// Product and post images are served by the WooCommerce site itself.
const storeUrl = process.env.WC_STORE_URL ? new URL(process.env.WC_STORE_URL) : null;

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy without nonces, so pages stay statically cacheable (a nonce would force
 * every page to render per request). 'unsafe-inline' is needed for Next's inline bootstrap scripts.
 * Third parties: Paystack (checkout popup + API), Google Maps (store locator embed), YouTube (embeds
 * inside Insights posts), and the WordPress host for images.
 */
const wpOrigin = storeUrl?.origin ?? "";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://js.paystack.co https://*.paystack.co https://*.paystack.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${wpOrigin} https://*.paystack.co https://*.paystack.com https://*.google.com https://*.gstatic.com https://*.googleapis.com https://i.ytimg.com`.trim(),
  "font-src 'self' data:",
  "connect-src 'self' https://*.paystack.co https://*.paystack.com" + (isDev ? " ws: wss:" : ""),
  "frame-src https://*.paystack.co https://*.paystack.com https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(self), usb=(), geolocation=(self)" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The WooCommerce origin is slow (~100KB/s); give the image optimizer longer than the 7s default.
    imgOptTimeoutInSeconds: 30,
  },
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
