import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Vercel preview deployments must not be indexed. Only production (or a non-Vercel host) is.
  const indexable = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/cart", "/checkout"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
