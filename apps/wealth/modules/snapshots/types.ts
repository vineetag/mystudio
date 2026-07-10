/** One account's value inside a snapshot — denormalized so history survives renames/deletes. */
export interface SnapshotAccountValue {
  accountId: string
  name: string
  value: number
}

export interface Snapshot {
  /** Calendar date, YYYY-MM-DD (one row per day). */
  snapshotDate: string
  totalValue: number
  perAccount: SnapshotAccountValue[]
  /** Benchmark ETF closes captured with the snapshot; null if unavailable that day. */
  spyClose: number | null
  qqqClose: number | null
}

/** One period-over-period change chip (D/D, W/W, M/M). */
export interface ChangeChip {
  /** e.g. "D/D" */
  label: string
  /** Absolute dollar change vs the baseline snapshot. */
  abs: number
  /** Percent change vs the baseline snapshot. */
  pct: number
  /** The baseline snapshot's date (transparency for gappy history). */
  baselineDate: string
}
