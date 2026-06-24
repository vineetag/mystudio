/** Cookie set client-side so server components can read the visitor's IANA timezone. */
export const USER_TIMEZONE_COOKIE = "user-timezone"

/** Validate an IANA timezone name; fall back to UTC when missing or invalid. */
export function resolveTimezone(tz?: string | null): string {
  if (!tz?.trim()) return "UTC"
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return tz
  } catch {
    return "UTC"
  }
}

/** Read timezone from a Request (header or JSON body field). */
export function timezoneFromRequest(
  request: Request,
  body?: { timezone?: unknown },
): string {
  const fromBody =
    typeof body?.timezone === "string" ? body.timezone.trim() : null
  const fromHeader = request.headers.get("X-User-Timezone")?.trim() ?? null
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get("tz")?.trim() ?? null
  return resolveTimezone(fromBody ?? fromHeader ?? fromQuery)
}

/** Browser-only helper for client components and fetch payloads. */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "UTC"
  }
}
