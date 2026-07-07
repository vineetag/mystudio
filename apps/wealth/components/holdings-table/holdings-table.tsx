"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import type { ConsolidatedRow, PositionRow } from "@/modules/portfolio"
import { HOLDINGS_COLUMNS } from "./columns"

const CELL = "px-3 py-2.5 tabular-nums"
const HEADER_CELL = "px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500"

function alignClass(align: "left" | "right"): string {
  return align === "right" ? "text-right" : "text-left"
}

function HeaderRow({ leadingCell }: { leadingCell?: boolean }) {
  return (
    <thead>
      <tr className="border-b border-neutral-200">
        {leadingCell && <th className="w-8" />}
        {HOLDINGS_COLUMNS.map((column) => (
          <th key={column.key} className={`${HEADER_CELL} ${alignClass(column.align)}`}>
            {column.header}
          </th>
        ))}
      </tr>
    </thead>
  )
}

/** Flat table for a single account's positions. */
export function PositionsTable({ positions }: { positions: PositionRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm">
        <HeaderRow />
        <tbody>
          {positions.map((position) => (
            <tr key={position.holdingId} className="border-b border-neutral-100">
              {HOLDINGS_COLUMNS.map((column) => (
                <td key={column.key} className={`${CELL} ${alignClass(column.align)}`}>
                  {column.render(position)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Consolidated per-ticker table; each row expands into its account breakdown. */
export function ConsolidatedTable({ rows }: { rows: ConsolidatedRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(symbol: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(symbol)) {
        next.delete(symbol)
      } else {
        next.add(symbol)
      }
      return next
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] text-sm">
        <HeaderRow leadingCell />
        <tbody>
          {rows.map((row) => {
            const isExpanded = expanded.has(row.symbol)
            return (
              <RowGroup
                key={row.symbol}
                row={row}
                isExpanded={isExpanded}
                onToggle={() => toggle(row.symbol)}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RowGroup({
  row,
  isExpanded,
  onToggle,
}: {
  row: ConsolidatedRow
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50"
        onClick={onToggle}
      >
        <td className="pl-2">
          <button
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${row.symbol} account breakdown`}
            aria-expanded={isExpanded}
            className="flex min-h-10 min-w-8 items-center justify-center"
          >
            <ChevronRight
              className={`h-4 w-4 text-neutral-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>
        </td>
        {HOLDINGS_COLUMNS.map((column) => (
          <td key={column.key} className={`${CELL} ${alignClass(column.align)}`}>
            {column.render(row)}
          </td>
        ))}
      </tr>
      {isExpanded &&
        row.positions.map((position) => (
          <tr key={position.holdingId} className="border-b border-neutral-100 bg-neutral-50/60">
            <td />
            <td className={`${CELL} pl-6 text-left text-neutral-600`}>
              {position.accountName}
            </td>
            {HOLDINGS_COLUMNS.slice(1).map((column) => (
              <td key={column.key} className={`${CELL} ${alignClass(column.align)}`}>
                {column.render(position)}
              </td>
            ))}
          </tr>
        ))}
    </>
  )
}
