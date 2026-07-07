import type { ReactNode } from "react"
import type { PositionRow } from "@/modules/portfolio"
import {
  formatAsOf,
  formatMoney,
  formatQuantity,
  formatSignedMoney,
  formatSignedPct,
} from "@/lib/format"

/**
 * The fields a table row must expose. Both PositionRow and ConsolidatedRow
 * satisfy this structurally, so one column config drives every holdings table.
 */
export type HoldingDisplayRow = Pick<
  PositionRow,
  | "symbol"
  | "quantity"
  | "avgCost"
  | "missingCostBasis"
  | "price"
  | "fetchedAt"
  | "isStaleQuote"
  | "value"
  | "gainLoss"
  | "gainLossPct"
>

export interface HoldingsColumn {
  key: string
  header: string
  align: "left" | "right"
  render: (row: HoldingDisplayRow) => ReactNode
}

// Restrained gain/loss shades (deliberately not Tailwind's default 500s).
export const GAIN_TEXT = "text-gain"
export const LOSS_TEXT = "text-loss"

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
    render: (row) => <span className="font-semibold">{row.symbol}</span>,
  },
  {
    key: "quantity",
    header: "Qty",
    align: "right",
    render: (row) => formatQuantity(row.quantity),
  },
  {
    key: "avgCost",
    header: "Avg cost",
    align: "right",
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
    render: (row) => (row.value === null ? <Muted>—</Muted> : formatMoney(row.value)),
  },
  {
    key: "gainLoss",
    header: "Gain/loss $",
    align: "right",
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
    render: (row) =>
      row.gainLossPct === null ? (
        <Muted>—</Muted>
      ) : (
        <span className={signedClass(row.gainLossPct)}>
          {formatSignedPct(row.gainLossPct)}
        </span>
      ),
  },
]
