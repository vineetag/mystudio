"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, ChevronsUpDown, ChevronUp } from "lucide-react"
import type { ConsolidatedRow, PositionRow } from "@/modules/portfolio"
import { BrokerLogo } from "@/components/broker-logo"
import {
  formatAsOf,
  formatMoney,
  formatQuantity,
  formatSignedMoney,
  formatSignedPct,
} from "@/lib/format"
import {
  GAIN_TEXT,
  HOLDINGS_COLUMNS,
  LOSS_TEXT,
  sortRows,
  type HoldingDisplayRow,
  type SortDir,
  type SortState,
} from "./columns"
import { SymbolBadge } from "./symbol-badge"

/** Broker identity for one account — shown next to the account name in the
 * consolidated per-account breakdown. Keyed by account id. */
export interface AccountBrokerMeta {
  broker: string
  brokerLogoUrl: string | null
}

const CELL = "px-3 py-2.5 tabular-nums"
const HEADER_CELL = "px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink/60"

function alignClass(align: "left" | "right"): string {
  return align === "right" ? "text-right" : "text-left"
}

function signedClass(value: number): string {
  return value === 0 ? "text-ink/60" : value > 0 ? GAIN_TEXT : LOSS_TEXT
}

function SortCaret({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    // Faint two-way caret marks the header as sortable without shouting.
    return <ChevronsUpDown className="h-3 w-3 text-ink/25" aria-hidden />
  }
  return dir === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-moss" aria-hidden />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-moss" aria-hidden />
  )
}

function HeaderRow({
  leadingCell,
  sort,
  onSort,
}: {
  leadingCell?: boolean
  sort: SortState
  onSort: (key: string) => void
}) {
  return (
    <thead>
      <tr className="border-b border-rule">
        {leadingCell && <th className="w-8" />}
        {HOLDINGS_COLUMNS.map((column) => {
          const sortable = Boolean(column.sortAccessor)
          const active = sortable && sort.key === column.key
          return (
            <th
              key={column.key}
              aria-sort={
                active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
              }
              className={`${HEADER_CELL} ${alignClass(column.align)}`}
            >
              {sortable ? (
                <button
                  type="button"
                  onClick={() => onSort(column.key)}
                  className={`inline-flex min-h-8 cursor-pointer items-center gap-1 transition-colors ${
                    column.align === "right" ? "flex-row-reverse" : ""
                  } ${active ? "text-ink" : "hover:text-ink"}`}
                >
                  <span>{column.header}</span>
                  <SortCaret active={active} dir={sort.dir} />
                </button>
              ) : (
                column.header
              )}
            </th>
          )
        })}
      </tr>
    </thead>
  )
}

/* ------------------------------------------------------------------ */
/* Mobile cards — tables collapse to these below md.                   */
/* ------------------------------------------------------------------ */

function CardFigure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-ink/50">{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  )
}

function HoldingCardBody({ row }: { row: HoldingDisplayRow }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <CardFigure label="Qty">{formatQuantity(row.quantity)}</CardFigure>
      <CardFigure label="Avg cost">
        {row.avgCost === null ? (
          <span className="w-fit rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            no cost basis
          </span>
        ) : (
          formatMoney(row.avgCost)
        )}
      </CardFigure>
      <CardFigure label="Price">
        {row.price === null ? (
          <span className="text-ink/40">unavailable</span>
        ) : (
          <>
            {formatMoney(row.price)}
            <span className="ml-1.5 text-xs text-ink/40">
              {row.fetchedAt && formatAsOf(row.fetchedAt)}
              {row.isStaleQuote && (
                <span className="ml-1 rounded bg-amber-100 px-1 py-px font-medium text-amber-800">
                  stale
                </span>
              )}
            </span>
          </>
        )}
      </CardFigure>
      <CardFigure label="Gain/loss">
        {row.gainLoss === null ? (
          <span className="text-ink/40">—</span>
        ) : (
          <span className={signedClass(row.gainLoss)}>
            {formatSignedMoney(row.gainLoss)}
            {row.gainLossPct !== null && (
              <span className="ml-1 text-xs">({formatSignedPct(row.gainLossPct)})</span>
            )}
          </span>
        )}
      </CardFigure>
      {row.dividendYield !== null && (
        <CardFigure label="Div yield">
          {row.dividendYield.toFixed(2)}%
          {row.projectedAnnualIncome !== null && (
            <span className="ml-1.5 text-xs text-ink/40">
              {formatMoney(row.projectedAnnualIncome)}/yr
            </span>
          )}
        </CardFigure>
      )}
    </div>
  )
}

function CardHeader({ title, value }: { title: React.ReactNode; value: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-semibold">{title}</span>
      <span className="font-medium tabular-nums">
        {value === null ? <span className="text-ink/40">—</span> : formatMoney(value)}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Per-account view                                                    */
/* ------------------------------------------------------------------ */

export function PositionsTable({
  positions,
  sort,
  onSort,
}: {
  positions: PositionRow[]
  sort: SortState
  onSort: (key: string) => void
}) {
  const sorted = useMemo(() => sortRows(positions, sort), [positions, sort])
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[50rem] text-sm">
          <HeaderRow sort={sort} onSort={onSort} />
          <tbody>
            {sorted.map((position) => (
              <tr key={position.holdingId} className="border-b border-rule/60">
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
      <ul className="flex flex-col gap-2 md:hidden">
        {sorted.map((position) => (
          <li key={position.holdingId} className="rounded-lg border border-rule bg-white/40 p-3">
            <CardHeader
              title={
                <SymbolBadge
                  symbol={position.symbol}
                  companyName={position.companyName}
                  logoDomain={position.logoDomain}
                />
              }
              value={position.value}
            />
            <HoldingCardBody row={position} />
          </li>
        ))}
      </ul>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Consolidated view — expandable per-account breakdown                */
/* ------------------------------------------------------------------ */

export function ConsolidatedTable({
  rows,
  accountMeta,
  sort,
  onSort,
}: {
  rows: ConsolidatedRow[]
  accountMeta: Map<string, AccountBrokerMeta>
  sort: SortState
  onSort: (key: string) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort])

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
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[52rem] text-sm">
          <HeaderRow leadingCell sort={sort} onSort={onSort} />
          <tbody>
            {sorted.map((row) => (
              <DesktopRowGroup
                key={row.symbol}
                row={row}
                accountMeta={accountMeta}
                isExpanded={expanded.has(row.symbol)}
                onToggle={() => toggle(row.symbol)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {sorted.map((row) => (
          <MobileRowGroup
            key={row.symbol}
            row={row}
            accountMeta={accountMeta}
            isExpanded={expanded.has(row.symbol)}
            onToggle={() => toggle(row.symbol)}
          />
        ))}
      </ul>
    </>
  )
}

function DesktopRowGroup({
  row,
  accountMeta,
  isExpanded,
  onToggle,
}: {
  row: ConsolidatedRow
  accountMeta: Map<string, AccountBrokerMeta>
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-rule/60 hover:bg-ink/[0.04]"
        onClick={onToggle}
      >
        <td className="pl-2">
          <button
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${row.symbol} account breakdown`}
            aria-expanded={isExpanded}
            className="flex min-h-10 min-w-8 items-center justify-center"
          >
            <ChevronRight
              className={`h-4 w-4 text-ink/40 transition-transform ${isExpanded ? "rotate-90" : ""}`}
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
        row.positions.map((position, index) => {
          const meta = accountMeta.get(position.accountId)
          return (
            <tr
              key={position.holdingId}
              className={`bg-ink/[0.03] ${
                // The breakdown closes like a ledger entry: a double rule.
                index === row.positions.length - 1
                  ? "border-b-[3px] border-double border-ink/30"
                  : "border-b border-rule/60"
              }`}
            >
              <td />
              <td className={`${CELL} pl-6 text-left text-ink/70`}>
                {/* Smaller than the 28px holding logo so the breakdown reads
                    as subordinate detail, not another holding row. */}
                <span className="flex items-center gap-2">
                  {meta && (
                    <BrokerLogo broker={meta.broker} logoUrl={meta.brokerLogoUrl} size={20} />
                  )}
                  <span className="min-w-0 truncate">{position.accountName}</span>
                </span>
              </td>
              {HOLDINGS_COLUMNS.slice(1).map((column) => (
                <td key={column.key} className={`${CELL} ${alignClass(column.align)}`}>
                  {column.render(position)}
                </td>
              ))}
            </tr>
          )
        })}
    </>
  )
}

function MobileRowGroup({
  row,
  accountMeta,
  isExpanded,
  onToggle,
}: {
  row: ConsolidatedRow
  accountMeta: Map<string, AccountBrokerMeta>
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <li className="rounded-lg border border-rule bg-white/40 p-3">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <SymbolBadge
              symbol={row.symbol}
              companyName={row.companyName}
              logoDomain={row.logoDomain}
            />
            <span className="text-xs font-normal text-ink/50">
              {row.positions.length} {row.positions.length === 1 ? "account" : "accounts"}
            </span>
          </span>
        }
        value={row.value}
      />
      <HoldingCardBody row={row} />
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="mt-3 flex min-h-10 w-full items-center justify-center gap-1 rounded-md border border-rule text-sm text-ink/70"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
        />
        {isExpanded ? "Hide accounts" : "Show accounts"}
      </button>
      {isExpanded && (
        <ul className="mt-2 flex flex-col divide-y divide-rule/60 border-b-[3px] border-double border-ink/30">
          {row.positions.map((position) => {
            const meta = accountMeta.get(position.accountId)
            return (
              <li
                key={position.holdingId}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 text-ink/70">
                  {meta && (
                    <BrokerLogo broker={meta.broker} logoUrl={meta.brokerLogoUrl} size={20} />
                  )}
                  <span className="min-w-0 truncate">{position.accountName}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatQuantity(position.quantity)} ·{" "}
                  {position.value === null ? "—" : formatMoney(position.value)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
