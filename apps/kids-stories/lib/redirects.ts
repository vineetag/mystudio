const DEFAULT_AUTH_REDIRECT = "/library"

const SAFE_AUTH_REDIRECT_PATHS = new Set([
  "/",
  "/admin",
  "/auth/reset-password",
  "/library",
])

const SAFE_AUTH_REDIRECT_PREFIXES = ["/story/"]

export function safeAuthRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
): string {
  const candidate = value?.trim()
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback
  }

  if (candidate.includes("\\") || /[\u0000-\u001f\u007f]/.test(candidate)) {
    return fallback
  }

  try {
    const base = "https://zippytales.local"
    const url = new URL(candidate, base)
    if (url.origin !== base) return fallback

    const path = `${url.pathname}${url.search}${url.hash}`
    const allowed =
      SAFE_AUTH_REDIRECT_PATHS.has(url.pathname) ||
      SAFE_AUTH_REDIRECT_PREFIXES.some((prefix) =>
        url.pathname.startsWith(prefix),
      )

    return allowed ? path : fallback
  } catch {
    return fallback
  }
}
