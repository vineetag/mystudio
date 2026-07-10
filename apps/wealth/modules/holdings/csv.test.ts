import { describe, expect, it } from "vitest"
import { parseHoldingsCsv } from "./csv"

const HEADER = "account,symbol,quantity,avg_cost"

describe("parseHoldingsCsv", () => {
  it("parses valid rows, normalizing symbols to uppercase", () => {
    const result = parseHoldingsCsv(
      `${HEADER}\nFidelity 401k,goog,10,142.50\nSchwab Taxable,BRK.B,2,`,
    )
    expect(result.fileError).toBeNull()
    expect(result.rejects).toEqual([])
    expect(result.rows).toEqual([
      { line: 2, accountName: "Fidelity 401k", symbol: "GOOG", quantity: 10, avgCost: 142.5 },
      { line: 3, accountName: "Schwab Taxable", symbol: "BRK.B", quantity: 2, avgCost: null },
    ])
  })

  it("accepts any column order via the header", () => {
    const result = parseHoldingsCsv("symbol,avg_cost,account,quantity\nAAPL,10,Roth,1")
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ accountName: "Roth", symbol: "AAPL", quantity: 1, avgCost: 10 })
  })

  it("rejects the file when header columns are missing", () => {
    const result = parseHoldingsCsv("account,symbol,quantity\nA,GOOG,1")
    expect(result.fileError).toContain("avg_cost")
    expect(result.rows).toEqual([])
  })

  it("reports the empty file", () => {
    expect(parseHoldingsCsv("  \n \n").fileError).toBe("The file is empty.")
  })

  it("rejects bad rows individually without blocking valid ones", () => {
    const result = parseHoldingsCsv(
      [
        HEADER,
        "Roth,GOOG,10,100", // valid
        ",MSFT,1,10", // empty account
        "Roth,TOOLONGSYMBOL,1,10", // bad symbol
        "Roth,AAPL,-5,10", // bad quantity
        "Roth,AAPL,abc,10", // non-numeric quantity
        "Roth,NVDA,1,-3", // negative avg cost
      ].join("\n"),
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].symbol).toBe("GOOG")
    expect(result.rejects.map((reject) => reject.line)).toEqual([3, 4, 5, 6, 7])
    expect(result.rejects[0].reason).toBe("Account name is empty.")
  })

  it("keeps the last occurrence of a duplicate (account, symbol) in the file", () => {
    const result = parseHoldingsCsv(`${HEADER}\nRoth,GOOG,10,100\nRoth,GOOG,20,200`)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ quantity: 20, avgCost: 200 })
  })

  it("handles quoted fields containing commas", () => {
    const result = parseHoldingsCsv(`${HEADER}\n"Fidelity, BrokerageLink",VTI,3,220`)
    expect(result.rows[0].accountName).toBe("Fidelity, BrokerageLink")
  })

  it("skips blank lines and handles CRLF", () => {
    const result = parseHoldingsCsv(`${HEADER}\r\n\r\nRoth,GOOG,1,10\r\n`)
    expect(result.rows).toHaveLength(1)
    expect(result.rejects).toEqual([])
  })
})
