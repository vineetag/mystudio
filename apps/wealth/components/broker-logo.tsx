"use client"

import { useState } from "react"

/**
 * Brokerage logo tile. Resolution order, official-only — we never fabricate a
 * broker's mark:
 *   1. SnapTrade's own logo URL (live connected accounts).
 *   2. A bundled official brand mark (Simple Icons) for brokers that publish one.
 *   3. A clean initials tile on moss — used for demo/manual brokers whose brands
 *      don't license an icon (Fidelity, Schwab, Vanguard, E*Trade, …).
 *
 * Of the demo brokers only Robinhood ships an official Simple Icons mark; drop
 * more official SVG paths into BRAND_MARKS as you obtain them from brand kits.
 */

interface BrandMark {
  title: string
  /** Rendered monochrome for a consistent ledger look. */
  color: string
  /** Official 24×24 Simple Icons path. */
  path: string
}

const BRAND_MARKS: Record<string, BrandMark> = {
  robinhood: {
    title: "Robinhood",
    color: "#0F1111",
    path: "M2.84 24h.53c.096 0 .192-.048.224-.128C7.591 13.696 11.94 8.656 14.67 5.638c.112-.128.064-.225-.096-.225h-4.88a.55.55 0 0 0-.45.225L5.746 9.972c-.514.642-.642 1.236-.642 2.086v4.43c-1.14 3.194-1.862 5.361-2.392 7.32-.032.125.016.192.129.192M20.447.646c-.754-.802-4.157-.834-5.73-.224a3 3 0 0 0-.786.465 41 41 0 0 0-3.323 3.178c-.112.113-.064.225.097.225h5.409c.497 0 .786.289.786.786v6.1c0 .16.128.208.225.064l3.258-4.254c.53-.69.69-.898.835-1.861.192-1.413.08-3.58-.77-4.479m-6.982 16.18 2.231-3.676a.7.7 0 0 0 .064-.29V6.73c0-.16-.112-.225-.224-.097-3.355 3.74-5.971 7.672-8.395 12.407-.06.12.016.225.16.177l5.009-1.54c.565-.174.882-.402 1.155-.852",
  },
}

function brokerKey(broker: string): string {
  return broker.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/** 1–2 letter monogram for the fallback tile (e.g. "E*Trade" → "ET"). */
function initials(broker: string): string {
  const words = broker.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "•"
  const first = words[0][0] ?? ""
  const second = words.length > 1 ? words[1][0] : (words[0][1] ?? "")
  return (first + second).toUpperCase()
}

const TILE = "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-rule bg-white"

export function BrokerLogo({
  broker,
  logoUrl,
  size = 28,
}: {
  broker: string
  logoUrl?: string | null
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const box = { width: size, height: size }

  // 1. Official SnapTrade logo.
  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- broker CDN, plain <img> avoids remotePatterns config
      <img
        src={logoUrl}
        alt={`${broker} logo`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${TILE} object-contain p-0.5`}
        style={box}
      />
    )
  }

  // 2. Bundled official brand mark.
  const mark = BRAND_MARKS[brokerKey(broker)]
  if (mark) {
    return (
      <span className={TILE} style={box} role="img" aria-label={`${broker} logo`}>
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill={mark.color} aria-hidden>
          <path d={mark.path} />
        </svg>
      </span>
    )
  }

  // 3. Initials tile — clean and never wrong.
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-md border border-rule bg-moss/10 text-[0.62rem] font-semibold text-moss"
      style={box}
    >
      {initials(broker)}
    </span>
  )
}
