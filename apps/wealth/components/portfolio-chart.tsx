"use client"

// Portfolio vs benchmark comparison, indexed to 100 at the range start so all
// three series share one axis. Inline SVG — no chart library (minimal-motion,
// no bundle weight). Palette validated for CVD + contrast on the paper surface.

import { useMemo, useRef, useState } from "react"
// Pure helpers/types only — server-only snapshot code stays behind the module
// index (same convention as modules/accounts: client files import leaf modules).
import { flowAdjustedIndex, indexTo100 } from "@/modules/snapshots/changes"
import type { Snapshot } from "@/modules/snapshots/types"
import { formatMoney } from "@/lib/format"

const RANGES = [
  { label: "1M", days: 31 },
  { label: "3M", days: 92 },
  { label: "1Y", days: 366 },
] as const

const SERIES = [
  { key: "portfolio", label: "Portfolio", color: "#008300" },
  { key: "spy", label: "S&P 500 (SPY)", color: "#2a78d6" },
  { key: "qqq", label: "Nasdaq 100 (QQQ)", color: "#eb6834" },
] as const

const WIDTH = 720
const HEIGHT = 280
const PAD = { top: 16, right: 12, bottom: 28, left: 44 }

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

interface ChartData {
  dates: string[]
  /** Indexed (base 100) series values, aligned to `dates`. */
  series: Record<(typeof SERIES)[number]["key"], (number | null)[]>
  /** Raw values for the tooltip (portfolio in $, benchmarks at their close). */
  raw: Record<(typeof SERIES)[number]["key"], (number | null)[]>
}

function buildChartData(snapshots: Snapshot[], rangeDays: number): ChartData {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - rangeDays)
  const visible = snapshots.filter(
    (snapshot) => snapshot.snapshotDate >= cutoff.toISOString().slice(0, 10),
  )

  const raw = {
    portfolio: visible.map((snapshot) => snapshot.totalValue),
    spy: visible.map((snapshot) => snapshot.spyClose),
    qqq: visible.map((snapshot) => snapshot.qqqClose),
  }
  return {
    dates: visible.map((snapshot) => snapshot.snapshotDate),
    series: {
      // Flow-adjusted: chained from per-account overlap so connecting a new
      // brokerage (or a 401(k) pricing from $0) doesn't chart as a return.
      portfolio: flowAdjustedIndex(visible),
      spy: indexTo100(raw.spy),
      qqq: indexTo100(raw.qqq),
    },
    raw,
  }
}

function lastKnownIndex(values: (number | null)[]): number {
  for (let index = values.length - 1; index >= 0; index--) {
    if (values[index] !== null) return index
  }
  return -1
}

function linePath(
  values: (number | null)[],
  x: (index: number) => number,
  y: (value: number) => number,
): string {
  let path = ""
  let penDown = false
  values.forEach((value, index) => {
    if (value === null) {
      penDown = false
      return
    }
    path += `${penDown ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`
    penDown = true
  })
  return path
}

export function PortfolioChart({
  snapshots,
  compact = false,
}: {
  snapshots: Snapshot[]
  /** Overview-tab variant: fixed 3M range, no toggles, shorter plot. */
  compact?: boolean
}) {
  const [rangeDays, setRangeDays] = useState<number>(RANGES[1].days)
  const height = compact ? 190 : HEIGHT
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const data = useMemo(() => buildChartData(snapshots, rangeDays), [snapshots, rangeDays])

  if (snapshots.length < 2) {
    return (
      <section className="rounded-lg border border-dashed border-rule p-6 text-sm text-ink/60">
        Performance vs S&amp;P 500 and Nasdaq appears here once two daily
        snapshots exist — history started today.
      </section>
    )
  }

  const allValues = SERIES.flatMap((series) =>
    data.series[series.key].filter((value): value is number => value !== null),
  )
  const min = Math.min(...allValues, 100)
  const max = Math.max(...allValues, 100)
  const span = Math.max(max - min, 2)
  const yMin = min - span * 0.08
  const yMax = max + span * 0.08

  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const x = (index: number) =>
    PAD.left + (data.dates.length === 1 ? innerW / 2 : (index / (data.dates.length - 1)) * innerW)
  const y = (value: number) => PAD.top + ((yMax - value) / (yMax - yMin)) * innerH

  // Drop edge ticks whose label would collide with the 100 baseline's —
  // with a tight range they can land within a text-height of each other.
  const yTicks = [yMin + span * 0.08, 100, yMax - span * 0.08]
    .map((value) => Math.round(value * 10) / 10)
    .filter((value) => value === 100 || Math.abs(y(value) - y(100)) > 14)
  const xTickIndexes = [...new Set([0, Math.floor((data.dates.length - 1) / 2), data.dates.length - 1])]

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || data.dates.length === 0) return
    const rect = svg.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * WIDTH
    const ratio = Math.min(Math.max((px - PAD.left) / innerW, 0), 1)
    setHoverIndex(Math.round(ratio * (data.dates.length - 1)))
  }

  const hover = hoverIndex !== null && hoverIndex < data.dates.length ? hoverIndex : null

  return (
    <section aria-label="Portfolio performance vs benchmarks">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium text-ink">
          Performance{" "}
          <span className="text-sm font-normal text-ink/50">
            indexed to 100 · deposits excluded
          </span>
        </h2>
        {!compact && (
        <div className="flex gap-1" role="group" aria-label="Chart range">
          {RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setRangeDays(range.days)}
              aria-pressed={rangeDays === range.days}
              className={`min-h-12 min-w-12 rounded-md px-3 text-sm ${
                rangeDays === range.days
                  ? "bg-ink text-paper"
                  : "border border-rule text-ink/70 hover:bg-ink/[0.04]"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-0.5 w-4 rounded"
              style={{ backgroundColor: series.color }}
            />
            <span className="text-ink/70">{series.label}</span>
          </span>
        ))}
      </div>

      <div className="mt-2 overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="h-auto w-full min-w-[28rem]"
          role="img"
          aria-label="Line chart comparing portfolio, SPY, and QQQ, indexed to 100 at the start of the selected range"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {/* Gridlines + y labels */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="#DBE2DA"
                strokeWidth={tick === 100 ? 1.5 : 1}
                strokeDasharray={tick === 100 ? undefined : "3 3"}
              />
              <text
                x={PAD.left - 6}
                y={y(tick) + 3.5}
                textAnchor="end"
                className="fill-ink/50 text-[11px] tabular-nums"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* X labels */}
          {xTickIndexes.map((index) => (
            <text
              key={index}
              x={x(index)}
              y={height - 8}
              textAnchor={index === 0 ? "start" : index === data.dates.length - 1 ? "end" : "middle"}
              className="fill-ink/50 text-[11px]"
            >
              {formatDay(data.dates[index])}
            </text>
          ))}

          {/* Series lines + direct end labels */}
          {SERIES.map((series) => {
            const values = data.series[series.key]
            const lastIndex = lastKnownIndex(values)
            const lastValue = lastIndex >= 0 ? values[lastIndex] : null
            return (
              <g key={series.key}>
                <path
                  d={linePath(values, x, y)}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={series.key === "portfolio" ? 2.5 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {lastValue !== null && (
                  <circle
                    cx={x(lastIndex)}
                    cy={y(lastValue)}
                    r={3}
                    fill={series.color}
                    stroke="#F7F8F6"
                    strokeWidth={2}
                  />
                )}
              </g>
            )
          })}

          {/* Crosshair */}
          {hover !== null && (
            <g pointerEvents="none">
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={height - PAD.bottom}
                stroke="#20281F"
                strokeOpacity={0.25}
              />
              {SERIES.map((series) => {
                const value = data.series[series.key][hover]
                return value === null ? null : (
                  <circle
                    key={series.key}
                    cx={x(hover)}
                    cy={y(value)}
                    r={4}
                    fill={series.color}
                    stroke="#F7F8F6"
                    strokeWidth={2}
                  />
                )
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Tooltip readout — rendered below the plot so it never collides with lines */}
      <div className="min-h-6 text-sm text-ink/70" aria-live="polite">
        {hover !== null && (
          <>
            <span className="font-medium text-ink">{formatDay(data.dates[hover])}</span>
            {SERIES.map((series) => {
              const indexed = data.series[series.key][hover]
              const raw = data.raw[series.key][hover]
              if (indexed === null) return null
              return (
                <span key={series.key} className="ml-4 whitespace-nowrap tabular-nums">
                  <span
                    aria-hidden
                    className="mr-1 inline-block h-2 w-2 rounded-full align-baseline"
                    style={{ backgroundColor: series.color }}
                  />
                  {indexed.toFixed(1)}
                  {raw !== null && series.key === "portfolio" && (
                    <span className="text-ink/50"> ({formatMoney(raw)})</span>
                  )}
                </span>
              )
            })}
          </>
        )}
      </div>

      {!compact && (
      <details className="mt-1 text-sm">
        <summary className="min-h-12 cursor-pointer py-3 text-ink/60">
          View as table
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="px-2 py-1.5 font-medium text-ink/60">Date</th>
                {SERIES.map((series) => (
                  <th key={series.key} className="px-2 py-1.5 text-right font-medium text-ink/60">
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.dates.map((date, index) => (
                <tr key={date} className="border-b border-rule/60">
                  <td className="px-2 py-1.5">{formatDay(date)}</td>
                  {SERIES.map((series) => (
                    <td key={series.key} className="px-2 py-1.5 text-right tabular-nums">
                      {data.series[series.key][index]?.toFixed(1) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      )}
    </section>
  )
}
