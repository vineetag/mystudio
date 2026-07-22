"use client"

import { useState } from "react"
import { domainLogoUrl } from "@/modules/symbols/logo-url"

/**
 * Brokerage logo tile. Resolution order, official-only — we never fabricate a
 * broker's mark:
 *   1. logo.dev image for the broker's known website domain — covers the big
 *      brokerages (Fidelity, Schwab, Vanguard, E*Trade, …) and is our preferred
 *      source in both live and demo modes.
 *   2. SnapTrade's own logo URL (live connected accounts), for brokers not in
 *      the domain map.
 *   3. A bundled official brand mark (Simple Icons) for brokers that publish one.
 *   4. A clean initials tile on moss — the never-wrong fallback.
 *
 * Failed image loads cascade to the next source automatically.
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

/**
 * Broker name (normalized) → the broker's own website domain, used to fetch
 * an official logo via logo.dev. Keys must be lowercase alphanumeric (see
 * brokerKey). Extend freely — a wrong-domain miss just falls through to the
 * initials tile.
 */
const BROKER_DOMAINS: Record<string, string> = {
  fidelity: "fidelity.com",
  fidelityinvestments: "fidelity.com",
  schwab: "schwab.com",
  charlesschwab: "schwab.com",
  vanguard: "vanguard.com",
  etrade: "etrade.com",
  robinhood: "robinhood.com",
  tdameritrade: "tdameritrade.com",
  merrill: "ml.com",
  merrilledge: "ml.com",
  merrilllynch: "ml.com",
  interactivebrokers: "interactivebrokers.com",
  ibkr: "interactivebrokers.com",
  webull: "webull.com",
  sofi: "sofi.com",
  sofiinvest: "sofi.com",
  m1: "m1.com",
  m1finance: "m1.com",
  public: "public.com",
  tastytrade: "tastytrade.com",
  wealthfront: "wealthfront.com",
  betterment: "betterment.com",
  chase: "chase.com",
  jpmorgan: "jpmorgan.com",
  jpmorganchase: "jpmorgan.com",
  morganstanley: "morganstanley.com",
  wellsfargo: "wellsfargo.com",
  ally: "ally.com",
  allyinvest: "ally.com",
  allybank: "ally.com",
  acorns: "acorns.com",
  stash: "stash.com",
  tradestation: "tradestation.com",
  firstrade: "firstrade.com",
  citi: "citi.com",
  citibank: "citi.com",
  hsa: "hsabank.com",
  hsabank: "hsabank.com",
  // Banks and credit unions — pt_bank_accounts institutions render through
  // the same tile, so SimpleFIN institution names resolve here too.
  bankofamerica: "bankofamerica.com",
  bofa: "bankofamerica.com",
  capitalone: "capitalone.com",
  capitalonebank: "capitalone.com",
  americanexpress: "americanexpress.com",
  amex: "americanexpress.com",
  discover: "discover.com",
  discoverbank: "discover.com",
  usbank: "usbank.com",
  pnc: "pnc.com",
  pncbank: "pnc.com",
  truist: "truist.com",
  marcus: "marcus.com",
  marcusbygoldmansachs: "marcus.com",
  goldmansachs: "goldmansachs.com",
  synchrony: "synchrony.com",
  synchronybank: "synchrony.com",
  navyfederal: "navyfederal.org",
  navyfederalcreditunion: "navyfederal.org",
  usaa: "usaa.com",
  td: "td.com",
  tdbank: "td.com",
  fifththird: "53.com",
  fifththirdbank: "53.com",
  regions: "regions.com",
  regionsbank: "regions.com",
  keybank: "key.com",
  huntington: "huntington.com",
  huntingtonbank: "huntington.com",
  citizens: "citizensbank.com",
  citizensbank: "citizensbank.com",
  santander: "santanderbank.com",
  bmo: "bmo.com",
  chime: "chime.com",
  varo: "varomoney.com",
  currentbank: "current.com",
  axos: "axosbank.com",
  axosbank: "axosbank.com",
  lendingclub: "lendingclub.com",
  barclays: "barclays.com",
  barclaysus: "barclays.com",
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
  // Image sources in preference order; onError advances to the next one.
  const domain = BROKER_DOMAINS[brokerKey(broker)]
  const candidates = [
    domain ? domainLogoUrl(domain, Math.max(size, 64)) : null,
    logoUrl ?? null,
  ].filter((url): url is string => url !== null)

  const [failedCount, setFailedCount] = useState(0)
  const currentUrl = candidates[failedCount]
  const box = { width: size, height: size }

  // 1–2. logo.dev by broker domain, then SnapTrade logo.
  if (currentUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- broker CDN, plain <img> avoids remotePatterns config
      <img
        key={currentUrl}
        src={currentUrl}
        alt={`${broker} logo`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailedCount((count) => count + 1)}
        className={`${TILE} object-contain p-0.5`}
        style={box}
      />
    )
  }

  // 3. Bundled official brand mark.
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

  // 4. Initials tile — clean and never wrong.
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
