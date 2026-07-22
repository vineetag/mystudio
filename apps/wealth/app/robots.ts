import type { MetadataRoute } from "next"

// OneFolio is a private, owner-only ledger reachable on more than one host
// (getonefolio.app plus the onefolio.appcrafter.studio fallback). Nothing here
// belongs in a search index, so every host is disallowed outright; `host` still
// names the canonical origin from NEXT_PUBLIC_SITE_URL.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003"

  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    host: siteUrl,
  }
}
