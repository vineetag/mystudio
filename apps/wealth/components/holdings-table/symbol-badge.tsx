"use client"

import { useState } from "react"
import { symbolLogoUrl } from "@/modules/symbols/logo-url"

/** First 1–2 alphanumerics of a ticker, for the monogram fallback tile. */
function monogram(symbol: string): string {
  return symbol.replace(/[^A-Z0-9]/gi, "").slice(0, 2) || "?"
}

function LogoTile({
  symbol,
  companyName,
  logoDomain,
  px,
}: {
  symbol: string
  companyName: string | null
  logoDomain: string | null
  px: number
}) {
  const src = symbolLogoUrl(symbol, logoDomain, px * 2)
  const [failed, setFailed] = useState(false)

  // Generic mark for funds/unknowns (or when logo.dev isn't configured).
  if (!src || failed) {
    return (
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-md border border-rule bg-moss/10 text-[0.65rem] font-semibold text-moss"
        style={{ width: px, height: px }}
      >
        {monogram(symbol)}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo.dev CDN, plain <img> avoids remotePatterns config
    <img
      src={src}
      alt={companyName ? `${companyName} logo` : `${symbol} logo`}
      width={px}
      height={px}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md border border-rule bg-white object-contain p-0.5"
      style={{ width: px, height: px }}
    />
  )
}

/**
 * A holding's identity cell: logo tile + bold ticker with the official company
 * name beneath. The name is muted and truncates; the logo falls back to a moss
 * monogram tile for funds logo.dev can't resolve.
 */
export function SymbolBadge({
  symbol,
  companyName,
  logoDomain,
  size = 28,
}: {
  symbol: string
  companyName: string | null
  logoDomain: string | null
  size?: number
}) {
  return (
    <span className="flex items-center gap-2.5 text-left">
      <LogoTile symbol={symbol} companyName={companyName} logoDomain={logoDomain} px={size} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-semibold">{symbol}</span>
        {companyName && (
          <span className="truncate text-xs font-normal text-ink/50">{companyName}</span>
        )}
      </span>
    </span>
  )
}
