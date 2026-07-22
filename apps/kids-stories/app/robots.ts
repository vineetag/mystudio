import type { MetadataRoute } from "next"

// The app answers on more than one host; crawlers should only index the
// canonical one, which is whatever NEXT_PUBLIC_SITE_URL points at.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin"],
    },
    host: siteUrl,
  }
}
