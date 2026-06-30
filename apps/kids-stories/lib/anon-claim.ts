/** Legacy httpOnly cookie that older releases used for anonymous story claims. */
export const ANON_CLAIM_COOKIE = "zippy_anon_claim"

/** Client-side localStorage hint for an explicit anonymous OAuth/link flow. */
export const ANON_CLAIM_KEY = "zippy_anon_uid"

interface AnonClaimMarker {
  version: 1
  anonId: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function createAnonClaimMarker(anonId: string): string {
  return JSON.stringify({ version: 1, anonId } satisfies AnonClaimMarker)
}

export function parseAnonClaimMarker(value: string | null): string | null {
  if (!value) return null

  try {
    const marker = JSON.parse(value) as Partial<AnonClaimMarker>
    if (marker.version !== 1 || typeof marker.anonId !== "string") {
      return null
    }
    return UUID_RE.test(marker.anonId) ? marker.anonId : null
  } catch {
    // Reject legacy raw UUID markers so old shared-browser state is discarded.
    return null
  }
}
