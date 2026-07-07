// Pure CSV parsing + per-row validation for holdings import.
// Format: header row `account,symbol,quantity,avg_cost` (any column order),
// account = existing account name, avg_cost may be empty (no cost basis).

import {
  normalizeSymbol,
  validateAvgCost,
  validateQuantity,
  validateSymbol,
} from "./validate"

export interface CsvHoldingRow {
  /** 1-based line number in the file, for the rejects report. */
  line: number
  accountName: string
  symbol: string
  quantity: number
  avgCost: number | null
}

export interface CsvReject {
  line: number
  raw: string
  reason: string
}

export interface CsvParseResult {
  rows: CsvHoldingRow[]
  rejects: CsvReject[]
  /** Fatal file-level error (bad/missing header) — no rows were parsed. */
  fileError: string | null
}

const REQUIRED_COLUMNS = ["account", "symbol", "quantity", "avg_cost"] as const

/** Minimal CSV line splitter with double-quote support ("a,b" stays one field). */
function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current)
      current = ""
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields.map((field) => field.trim())
}

export function parseHoldingsCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => line.trim().length > 0)

  if (headerIndex === -1) {
    return { rows: [], rejects: [], fileError: "The file is empty." }
  }

  const header = splitCsvLine(lines[headerIndex]).map((column) =>
    column.toLowerCase(),
  )
  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column))
  if (missing.length > 0) {
    return {
      rows: [],
      rejects: [],
      fileError: `Header row is missing required column(s): ${missing.join(", ")}. Expected: account, symbol, quantity, avg_cost.`,
    }
  }

  const columnIndex = Object.fromEntries(
    REQUIRED_COLUMNS.map((column) => [column, header.indexOf(column)]),
  ) as Record<(typeof REQUIRED_COLUMNS)[number], number>

  const rows: CsvHoldingRow[] = []
  const rejects: CsvReject[] = []

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const raw = lines[i]
    if (raw.trim().length === 0) continue
    const line = i + 1

    const fields = splitCsvLine(raw)
    const accountName = fields[columnIndex.account] ?? ""
    const symbol = normalizeSymbol(fields[columnIndex.symbol] ?? "")
    const quantityRaw = fields[columnIndex.quantity] ?? ""
    const avgCostRaw = fields[columnIndex.avg_cost] ?? ""

    if (accountName.length === 0) {
      rejects.push({ line, raw, reason: "Account name is empty." })
      continue
    }

    const symbolError = validateSymbol(symbol)
    if (symbolError) {
      rejects.push({ line, raw, reason: symbolError })
      continue
    }

    const quantity = Number(quantityRaw)
    if (quantityRaw.length === 0 || validateQuantity(quantity)) {
      rejects.push({
        line,
        raw,
        reason: `Quantity "${quantityRaw}" must be a number greater than 0.`,
      })
      continue
    }

    const avgCost = avgCostRaw.length === 0 ? null : Number(avgCostRaw)
    if (validateAvgCost(avgCost)) {
      rejects.push({
        line,
        raw,
        reason: `Average cost "${avgCostRaw}" must be a number of 0 or more, or empty for no cost basis.`,
      })
      continue
    }

    // Duplicate (account, symbol) within the file: keep the last occurrence.
    const duplicateIndex = rows.findIndex(
      (row) => row.accountName === accountName && row.symbol === symbol,
    )
    if (duplicateIndex !== -1) rows.splice(duplicateIndex, 1)

    rows.push({ line, accountName, symbol, quantity, avgCost })
  }

  return { rows, rejects, fileError: null }
}
