// Client-safe: builds logo.dev IMAGE urls only. The publishable key (pk_...)
// is embedded in the URL by design — logo.dev image auth is not a secret, so
// this module is safe to import from Client Components. The SECRET key and the
// Brand Search API live in the server-only ./logodev module instead.

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_LOGODEV_PUBLISHABLE_KEY

/**
 * A logo.dev image URL for a symbol. Prefers the resolved company domain
 * (best quality); falls back to the by-ticker endpoint, which still returns a
 * logo for most stocks and a generic placeholder for funds. Returns null when
 * no publishable key is configured, so callers can render their own fallback.
 */
export function symbolLogoUrl(
  symbol: string,
  domain: string | null,
  size = 64,
): string | null {
  if (!PUBLISHABLE_KEY) return null
  const query = `token=${PUBLISHABLE_KEY}&size=${size}&format=webp&retina=true`
  const base = domain
    ? `https://img.logo.dev/${encodeURIComponent(domain)}`
    : `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}`
  return `${base}?${query}`
}

/**
 * A logo.dev image URL for a known company domain (e.g. a brokerage's own
 * website). Returns null when no publishable key is configured.
 */
export function domainLogoUrl(domain: string, size = 64): string | null {
  if (!PUBLISHABLE_KEY) return null
  return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${PUBLISHABLE_KEY}&size=${size}&format=webp&retina=true`
}
