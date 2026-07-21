"use client"

// Allocation donut — value split by sector or by asset class. Inline SVG, no
// chart library (same call as components/portfolio-chart: minimal motion, no
// bundle weight).
//
// Identity is never color-alone: the legend is always present and carries the
// label, dollar value and share for every slice, which also satisfies the
// relief rule for the palette's lower-contrast hues.

import { useState } from "react"
import type { Allocation } from "@/modules/analyzer"
import { seriesColor } from "@/components/analyzer/palette"
import { formatMoney } from "@/lib/format"

const SIZE = 220
const RADIUS = 100
const INNER_RADIUS = 62
// 2px surface gap between neighbouring segments, per the mark spec.
const GAP_DEGREES = 1.2

/**
 * Coordinates are rounded to 3 decimals (sub-thousandth of a viewBox unit —
 * invisible) so the server and client render byte-identical path strings. Full
 * precision lets last-digit float drift through and React flags it as a
 * hydration mismatch.
 */
function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function polar(angleDegrees: number, radius: number): [number, number] {
  // -90 so the first slice starts at 12 o'clock and runs clockwise.
  const radians = ((angleDegrees - 90) * Math.PI) / 180
  return [
    round(SIZE / 2 + radius * Math.cos(radians)),
    round(SIZE / 2 + radius * Math.sin(radians)),
  ]
}

function annulusPath(startDegrees: number, endDegrees: number): string {
  const [outerStartX, outerStartY] = polar(startDegrees, RADIUS)
  const [outerEndX, outerEndY] = polar(endDegrees, RADIUS)
  const [innerEndX, innerEndY] = polar(endDegrees, INNER_RADIUS)
  const [innerStartX, innerStartY] = polar(startDegrees, INNER_RADIUS)
  const largeArc = endDegrees - startDegrees > 180 ? 1 : 0

  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}`,
    `L ${innerEndX} ${innerEndY}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}`,
    "Z",
  ].join(" ")
}

export function AllocationDonut({ allocation }: { allocation: Allocation }) {
  const [active, setActive] = useState<string | null>(null)

  // A lone slice is a full ring: the arc path degenerates at 360°, so draw it
  // as two circles instead.
  const single = allocation.slices.length === 1

  let cursor = 0
  const arcs = allocation.slices.map((slice, index) => {
    const sweep = (slice.pct / 100) * 360
    const start = cursor
    cursor += sweep
    // Never let the gap eat a hairline slice entirely.
    const end = Math.max(start + sweep - GAP_DEGREES, start + sweep * 0.35)
    return {
      slice,
      color: seriesColor(index, slice.label),
      path: annulusPath(start, end),
    }
  })

  const hovered = allocation.slices.find((slice) => slice.label === active) ?? null

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-52 w-52 shrink-0"
        role="img"
        aria-label={`Allocation across ${allocation.slices.length} buckets. Values listed beside the chart.`}
      >
        {single ? (
          <>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill={arcs[0].color} />
            <circle cx={SIZE / 2} cy={SIZE / 2} r={INNER_RADIUS} fill="#ffffff" />
          </>
        ) : (
          arcs.map(({ slice, color, path }) => (
            <path
              key={slice.label}
              d={path}
              fill={color}
              opacity={active === null || active === slice.label ? 1 : 0.35}
              onMouseEnter={() => setActive(slice.label)}
              onMouseLeave={() => setActive(null)}
            />
          ))
        )}

        {/* Center readout: the hovered slice, or the charted total at rest. */}
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 6}
          textAnchor="middle"
          className="fill-ink text-[15px] font-semibold tabular-nums"
        >
          {formatMoney(hovered ? hovered.value : allocation.total)}
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 12}
          textAnchor="middle"
          className="fill-ink/60 text-[11px]"
        >
          {hovered ? `${hovered.pct.toFixed(1)}%` : "charted"}
        </text>
      </svg>

      <ul className="flex w-full flex-col gap-1.5">
        {allocation.slices.map((slice, index) => (
          <li
            key={slice.label}
            className="flex min-h-8 items-center gap-2 text-sm"
            onMouseEnter={() => setActive(slice.label)}
            onMouseLeave={() => setActive(null)}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: seriesColor(index, slice.label) }}
            />
            <span className="min-w-0 flex-1 truncate text-ink/80">{slice.label}</span>
            <span className="shrink-0 tabular-nums text-ink">
              {formatMoney(slice.value)}
            </span>
            <span className="w-14 shrink-0 text-right tabular-nums text-ink/60">
              {slice.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
