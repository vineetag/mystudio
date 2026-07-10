// Pure validation shared by manual entry and CSV import.

const SYMBOL_PATTERN = /^[A-Z0-9.\-]{1,12}$/

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase()
}

/** Returns an error message, or null when valid. */
export function validateSymbol(symbol: string): string | null {
  if (!SYMBOL_PATTERN.test(symbol)) {
    return `Symbol "${symbol}" is invalid — use 1–12 letters, digits, dots, or dashes (e.g. GOOG, BRK.B).`
  }
  return null
}

export function validateQuantity(quantity: number): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be a number greater than 0."
  }
  return null
}

/** Avg cost is nullable: 401k transfers arrive without a cost basis. */
export function validateAvgCost(avgCost: number | null): string | null {
  if (avgCost === null) return null
  if (!Number.isFinite(avgCost) || avgCost < 0) {
    return "Average cost must be a number of 0 or more, or left empty for no cost basis."
  }
  return null
}
