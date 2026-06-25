import "server-only"

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

interface Bucket {
  count: number
  resetAt: number
}

interface RateLimitRule {
  key: string
  limit: number
  windowMs: number
}

const buckets = new Map<string, Bucket>()

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function checkRateLimit(
  rules: RateLimitRule[],
  now = Date.now(),
): RateLimitResult {
  pruneExpiredBuckets(now)

  const blocked = rules
    .map((rule) => {
      const bucket = buckets.get(rule.key)
      if (!bucket || bucket.resetAt <= now) return null
      return bucket.count >= rule.limit ? bucket : null
    })
    .filter((bucket): bucket is Bucket => Boolean(bucket))
    .sort((a, b) => a.resetAt - b.resetAt)[0]

  if (blocked) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((blocked.resetAt - now) / 1000)),
    }
  }

  for (const rule of rules) {
    const bucket = buckets.get(rule.key)
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(rule.key, {
        count: 1,
        resetAt: now + rule.windowMs,
      })
    } else {
      bucket.count += 1
    }
  }

  return { allowed: true }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim()
  return (
    firstForwardedIp ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  )
}
