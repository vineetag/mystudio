"use client"

// Position-size treemap — one tile per ticker, area proportional to value.
// Answers "what actually moves this portfolio?" faster than a sorted table.
//
// Layout comes from the pure `squarify` helper; this file only draws. Tiles are
// colored by a single-hue sequential ramp keyed to size (magnitude, not
// identity — the ticker label carries identity), so the eye reads the ranking
// rather than eight unrelated hues.

import { useState } from "react"
import { squarify, type PositionSize } from "@/modules/analyzer"
import { formatMoney } from "@/lib/format"

const WIDTH = 800
const HEIGHT = 420
const GAP = 2

/** One hue, light → dark by rank. Darkest = largest position. */
const RAMP = ["#8fbdf0", "#6ba3e4", "#4a8bd8", "#2a78d6", "#1f5fab", "#174781"]

// SVG text has no ellipsis of its own, so long names are cut to fit. 11px in
// this stack averages ~5.6px per character; the estimate is deliberately
// conservative so a name is never wider than the tile it sits in.
const CHAR_WIDTH = 5.6
const TEXT_INSET = 16

function fitText(text: string, width: number): string | null {
  const maxChars = Math.floor((width - TEXT_INSET) / CHAR_WIDTH)
  // Below this a name is more stub than label — drop it and let the hover
  // readout carry the full string.
  if (maxChars < 8) return null
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars - 1).trimEnd()}…`
}

function rampColor(rank: number, count: number): string {
  if (count <= 1) return RAMP[RAMP.length - 1]
  // Largest (rank 0) gets the darkest step.
  const position = 1 - rank / (count - 1)
  return RAMP[Math.min(RAMP.length - 1, Math.round(position * (RAMP.length - 1)))]
}

export function PositionTreemap({ items }: { items: PositionSize[] }) {
  const [active, setActive] = useState<string | null>(null)

  const tiles = squarify(
    items.map((item) => ({ key: item.symbol, value: item.value, item })),
    WIDTH,
    HEIGHT,
  )

  return (
    <div className="flex flex-col gap-2">
      {/* Below ~600px the tiles shrink past the point where their labels are
          legible, so the chart scrolls inside its own container rather than the
          page scrolling sideways. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full min-w-[600px]"
          role="img"
          aria-label={`Treemap of ${items.length} positions sized by market value. The same figures are listed in the holdings table on the dashboard.`}
        >
          {tiles.map((tile, rank) => {
            const position = tile.item.item
            const width = Math.max(0, tile.width - GAP)
            const height = Math.max(0, tile.height - GAP)
            // Only label tiles with room — a clipped ticker is worse than none.
            // The value line runs ~17 characters at 11px (~115px), so it needs
            // a good deal more width than the ticker alone; the hover readout
            // below covers every tile too small for any of the three lines.
            const showSymbol = width > 44 && height > 26
            const showValue = width > 124 && height > 44
            // The name is the first line to go: it's the least precise of the
            // three and the only one that has to be truncated to fit.
            const name =
              showValue && height > 66 && position.companyName
                ? fitText(position.companyName, width)
                : null

            return (
              <g
                key={tile.item.key}
                onMouseEnter={() => setActive(position.symbol)}
                onMouseLeave={() => setActive(null)}
              >
                <rect
                  x={tile.x}
                  y={tile.y}
                  width={width}
                  height={height}
                  rx={3}
                  fill={rampColor(rank, tiles.length)}
                  opacity={active === null || active === position.symbol ? 1 : 0.5}
                />
                {showSymbol && (
                  <text
                    x={tile.x + 8}
                    y={tile.y + 20}
                    className="fill-white text-[13px] font-semibold"
                  >
                    {position.symbol}
                  </text>
                )}
                {name && (
                  <text
                    x={tile.x + 8}
                    y={tile.y + 36}
                    className="fill-white/70 text-[11px]"
                  >
                    {name}
                  </text>
                )}
                {showValue && (
                  <text
                    x={tile.x + 8}
                    // Value sits below the name when there's one, otherwise it
                    // takes the name's line.
                    y={tile.y + (name ? 53 : 38)}
                    className="fill-white/85 text-[11px] tabular-nums"
                  >
                    {formatMoney(position.value)} · {position.pct.toFixed(1)}%
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Readout for tiles too small to label in place — hover anywhere. */}
      <p className="min-h-5 text-sm text-ink/70" aria-live="polite">
        {active
          ? (() => {
              const position = items.find((item) => item.symbol === active)!
              return `${position.symbol}${position.companyName ? ` · ${position.companyName}` : ""} — ${formatMoney(position.value)} (${position.pct.toFixed(1)}%)`
            })()
          : "Hover a tile for its value."}
      </p>
    </div>
  )
}
