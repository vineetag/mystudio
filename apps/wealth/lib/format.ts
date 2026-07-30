// Number/date formatting shared by server and client components.

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const quantityFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
})

// Crypto positions are commonly fractional (0.85 BTC, 0.0042 ETH), so they keep
// finer precision than equities, which only ever hold whole/2-dp share counts.
const cryptoQuantityFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 6,
})

// Index levels are points, not dollars (S&P 500 at 7,515.34 — no $ sign).
const indexPoints = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const wholeMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export function formatMoney(value: number): string {
  return money.format(value)
}

/** Whole dollars, rounded up — for the headline portfolio total. */
export function formatWholeMoney(value: number): string {
  return wholeMoney.format(Math.ceil(value))
}

export function formatIndexPoints(value: number): string {
  return indexPoints.format(value)
}

/** Signed money for gain/loss: +$1,234.56 / −$1,234.56 */
export function formatSignedMoney(value: number): string {
  const formatted = money.format(Math.abs(value))
  return value < 0 ? `−${formatted}` : `+${formatted}`
}

export function formatSignedPct(value: number): string {
  const formatted = `${Math.abs(value).toFixed(2)}%`
  return value < 0 ? `−${formatted}` : `+${formatted}`
}

export function formatQuantity(value: number, isCrypto = false): string {
  return (isCrypto ? cryptoQuantityFormat : quantityFormat).format(value)
}

function shortTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function shortDay(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** "as of 12:42 PM" for today, "as of Jul 3, 12:42 PM" otherwise. */
export function formatAsOf(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) return `as of ${shortTime(date)}`
  return `as of ${shortDay(date)}, ${shortTime(date)}`
}

/** "Synced 2:37 PM" for today, "Synced Jul 3, 2:37 PM" otherwise. */
export function formatSyncedAt(iso: string): string {
  const date = new Date(iso)
  const sameDay = date.toDateString() === new Date().toDateString()
  if (sameDay) return `Synced ${shortTime(date)}`
  return `Synced ${shortDay(date)}, ${shortTime(date)}`
}

/**
 * How stale the institution's own balance is, relative to our last pull.
 * SimpleFIN passes through each bank's `balance-date` untouched and offers no
 * force-refresh, so banks legitimately sit hours (or days) behind a successful
 * sync — this is what turns that lag into something the UI can show.
 */
export interface BalanceStaleness {
  /** "bank reported Jul 21" — null when the balance is fresh enough to hide. */
  label: string | null
  /** True past STALE_BALANCE_DAYS, so the caller can warn rather than whisper. */
  isStale: boolean
}

/** Below this the bank's lag is normal overnight batching, not worth showing. */
const REPORTED_HINT_MS = 24 * 60 * 60 * 1000
/** Past this the balance is old enough that the number itself is suspect. */
const STALE_BALANCE_MS = 3 * 24 * 60 * 60 * 1000

export function describeBalanceAge(
  balanceDateIso: string | null,
  syncedAtIso: string,
): BalanceStaleness {
  if (!balanceDateIso) return { label: null, isStale: false }

  const balanceDate = new Date(balanceDateIso)
  const syncedAt = new Date(syncedAtIso)
  if (Number.isNaN(balanceDate.getTime()) || Number.isNaN(syncedAt.getTime())) {
    return { label: null, isStale: false }
  }

  const lagMs = syncedAt.getTime() - balanceDate.getTime()
  if (lagMs < REPORTED_HINT_MS) return { label: null, isStale: false }

  return {
    label: `bank reported ${shortDay(balanceDate)}`,
    isStale: lagMs >= STALE_BALANCE_MS,
  }
}
