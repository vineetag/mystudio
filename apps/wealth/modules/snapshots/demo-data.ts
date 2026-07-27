// Fabricated snapshot history for demo mode — pure and client-importable
// (leaf module, like ./changes). Real snapshots are owner-only, so demo
// viewers would otherwise never see the performance chart or change chips.

import type { Snapshot } from "./types"

/**
 * Deterministic PRNG (mulberry32). A fixed seed means every demo visit
 * renders the identical curve — no flicker across reloads, nothing random
 * to confuse a returning viewer.
 */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DEMO_SEED = 0x0f01_10c4

/** Daily return with slight upward drift; vol ≈ ±volPct. */
function dailyReturn(rand: () => number, volPct: number, driftPct: number): number {
  return 1 + (driftPct + (rand() - 0.5) * 2 * volPct) / 100
}

function isoDaysAgo(daysAgo: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

/**
 * Build a demo snapshot series ending yesterday, anchored so the final
 * value sits just under `endValue` (the live-derived demo portfolio total).
 * computeChangeChips(endValue, series, today) then yields a small, plausible
 * "Today" chip, and the chart, chips, and hero number all agree.
 */
export function buildDemoSnapshots(endValue: number, days = 190): Snapshot[] {
  if (endValue <= 0) return []

  const rand = mulberry32(DEMO_SEED)

  // Generate the three walks forward from arbitrary starting levels…
  const portfolio: number[] = [1]
  const spy: number[] = [500]
  const qqq: number[] = [480]
  for (let i = 1; i < days; i++) {
    portfolio.push(portfolio[i - 1] * dailyReturn(rand, 0.8, 0.06))
    spy.push(spy[i - 1] * dailyReturn(rand, 0.6, 0.04))
    qqq.push(qqq[i - 1] * dailyReturn(rand, 0.7, 0.05))
  }

  // …then scale the portfolio so yesterday closes 0.3% below the anchor
  // (as if today were a modest up day).
  const scale = (endValue * 0.997) / portfolio[days - 1]

  return portfolio.map((raw, i) => {
    const totalValue = Math.round(raw * scale * 100) / 100
    return {
      snapshotDate: isoDaysAgo(days - i),
      totalValue,
      perAccount: [{ accountId: "demo", name: "Demo portfolio", value: totalValue }],
      spyClose: Math.round(spy[i] * 100) / 100,
      qqqClose: Math.round(qqq[i] * 100) / 100,
    }
  })
}
