import type { ReactNode } from "react"
import type { PositionRow } from "@/modules/portfolio"
import {
  formatAsOf,
  formatMoney,
  formatQuantity,
  formatSignedMoney,
  formatSignedPct,
} from "@/lib/format"
import { SymbolBadge } from "./symbol-badge"

/**
 * The fields a table row must expose. Both PositionRow and ConsolidatedRow
 * satisfy this structurally, so one column config drives every holdings table.
 */
export type HoldingDisplayRow = Pick<
  PositionRow,
  | "symbol"
  | "companyName"
  | "logoDomain"
  | "isCrypto"
  | "quantity"
  | "avgCost"
  | "missingCostBasis"
  | "price"
  | "fetchedAt"
  | "isStaleQuote"
  | "value"
  | "gainLoss"
  | "gainLossPct"
  | "dividendYield"
  | "projectedAnnualIncome"
>

export interface HoldingsColumn {
  key: string
  header: string
  align: "left" | "right"
  render: (row: HoldingDisplayRow) => ReactNode
  /** Value used to sort by this column. Omit to make the column unsortable. */
  sortAccessor?: (row: HoldingDisplayRow) => number | string | null
}

// Restrained gain/loss shades (deliberately not Tailwind's default 500s).
export const GAIN_TEXT = "text-gain"
export const LOSS_TEXT = "text-loss"

export type SortDir = "asc" | "desc"
export interface SortState {
  key: string
  dir: SortDir
}

/** The dashboard's default order: largest position value first (unpriced last). */
export const DEFAULT_SORT: SortState = { key: "value", dir: "desc" }

function signedClass(value: number): string {
  return value === 0 ? "text-ink/70" : value > 0 ? GAIN_TEXT : LOSS_TEXT
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-ink/40">{children}</span>
}

/**
 * Column order and content for every holdings table (per-account and
 * consolidated). Adding a field = adding an entry here — no table refactor.
 */
export const HOLDINGS_COLUMNS: HoldingsColumn[] = [
  {
    key: "symbol",
    header: "Symbol",
    align: "left",
    render: (row) => (
      <SymbolBadge
        symbol={row.symbol}
        companyName={row.companyName}
        logoDomain={row.logoDomain}
      />
    ),
    sortAccessor: (row) => row.symbol,
  },
  {
    key: "quantity",
    header: "Qty",
    align: "right",
    render: (row) => formatQuantity(row.quantity, row.isCrypto),
    sortAccessor: (row) => row.quantity,
  },
  {
    key: "avgCost",
    header: "Avg cost",
    align: "right",
    sortAccessor: (row) => row.avgCost,
    render: (row) =>
      row.avgCost === null ? (
        <span className="whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
          no cost basis
        </span>
      ) : (
        formatMoney(row.avgCost)
      ),
  },
  {
    key: "price",
    header: "Price",
    align: "right",
    sortAccessor: (row) => row.price,
    render: (row) =>
      row.price === null ? (
        <Muted>unavailable</Muted>
      ) : (
        <span className="inline-flex flex-col items-end">
          <span>{formatMoney(row.price)}</span>
          <span className="whitespace-nowrap text-xs text-ink/40">
            {row.fetchedAt && formatAsOf(row.fetchedAt)}
            {row.isStaleQuote && (
              <span className="ml-1 rounded bg-amber-100 px-1 py-px font-medium text-amber-800">
                stale
              </span>
            )}
          </span>
        </span>
      ),
  },
  {
    key: "value",
    header: "Value",
    align: "right",
    sortAccessor: (row) => row.value,
    render: (row) => (row.value === null ? <Muted>—</Muted> : formatMoney(row.value)),
  },
  {
    key: "gainLoss",
    header: "Gain/loss $",
    align: "right",
    sortAccessor: (row) => row.gainLoss,
    render: (row) =>
      row.gainLoss === null ? (
        <Muted>—</Muted>
      ) : (
        <span className={signedClass(row.gainLoss)}>{formatSignedMoney(row.gainLoss)}</span>
      ),
  },
  {
    key: "gainLossPct",
    header: "Gain/loss %",
    align: "right",
    sortAccessor: (row) => row.gainLossPct,
    render: (row) =>
      row.gainLossPct === null ? (
        <Muted>—</Muted>
      ) : (
        <span className={signedClass(row.gainLossPct)}>
          {formatSignedPct(row.gainLossPct)}
        </span>
      ),
  },
  {
    key: "dividend",
    header: "Div yield",
    align: "right",
    sortAccessor: (row) => row.dividendYield,
    render: (row) =>
      row.dividendYield === null ? (
        <Muted>—</Muted>
      ) : (
        <span className="inline-flex flex-col items-end">
          <span>{row.dividendYield.toFixed(2)}%</span>
          {row.projectedAnnualIncome !== null && (
            <span className="whitespace-nowrap text-xs text-ink/40">
              {formatMoney(row.projectedAnnualIncome)}/yr
            </span>
          )}
        </span>
      ),
  },
]

/** Columns the user can sort by, in table order — drives the mobile sort menu. */
export const SORTABLE_COLUMNS = HOLDINGS_COLUMNS.filter((column) => column.sortAccessor)

/**
 * Sort rows by the active column. Nulls ("unavailable") always sink to the
 * bottom regardless of direction, so a descending sort never buries real data
 * under blanks. Returns a new array; the input is untouched.
 */
export function sortRows<T extends HoldingDisplayRow>(rows: T[], sort: SortState): T[] {
  const column = HOLDINGS_COLUMNS.find((candidate) => candidate.key === sort.key)
  const accessor = column?.sortAccessor
  if (!accessor) return rows

  const direction = sort.dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = accessor(a)
    const bv = accessor(b)
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv)) * direction
    }
    return (av - bv) * direction
  })
}
