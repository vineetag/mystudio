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

/** "as of 12:42 PM" for today, "as of Jul 3, 12:42 PM" otherwise. */
export function formatAsOf(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
  if (sameDay) return `as of ${time}`
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `as of ${day}, ${time}`
}
