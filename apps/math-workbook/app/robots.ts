import type { MetadataRoute } from "next"

// Canonical host comes from NEXT_PUBLIC_SITE_URL so crawlers index one host
// even if the app is reachable on several.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002"

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin"],
    },
    host: siteUrl,
  }
}
