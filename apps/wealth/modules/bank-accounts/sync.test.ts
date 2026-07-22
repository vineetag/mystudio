import { describe, expect, it } from "vitest"
import { guessAccountType, mapSimpleFinAccounts } from "./sync"
import { parseAccessUrl } from "./simplefin"
import type { SimpleFinAccount } from "./simplefin"

const SYNCED_AT = "2026-07-21T12:00:00.000Z"

function sfAccount(overrides: Partial<SimpleFinAccount> = {}): SimpleFinAccount {
  return {
    id: "ACT-123",
    name: "Everyday Checking",
    currency: "USD",
    balance: "1204.36",
    "available-balance": "1100.00",
    "balance-date": 1752969600, // 2025-07-20T00:00:00Z
    org: { name: "First Bank", domain: "firstbank.example" },
    ...overrides,
  }
}

describe("guessAccountType", () => {
  it("guesses savings when the name mentions saving(s)", () => {
    expect(guessAccountType("High-Yield Savings", 100)).toBe("savings")
    expect(guessAccountType("emergency saving fund", 100)).toBe("savings")
  })

  it("guesses loan for mortgage/loan names, before any balance signal", () => {
    expect(guessAccountType("Mortgage - 4480 (4480)", -400000)).toBe("loan")
    expect(guessAccountType("Auto Loan", 12000)).toBe("loan")
  })

  it("guesses credit_card from the name or a negative balance", () => {
    expect(guessAccountType("Freedom Credit Card", 0)).toBe("credit_card")
    // SimpleFIN reports owed balances as negative.
    expect(guessAccountType("Venture X (1478)", -1204.36)).toBe("credit_card")
  })

  it("defaults everything else to checking", () => {
    expect(guessAccountType("Everyday Checking", 100)).toBe("checking")
    expect(guessAccountType("Premier Account", 100)).toBe("checking")
  })
})

describe("mapSimpleFinAccounts", () => {
  it("maps balances, dates, and institution name", () => {
    const { rows, skipped } = mapSimpleFinAccounts([sfAccount()], SYNCED_AT)
    expect(skipped).toEqual([])
    expect(rows).toEqual([
      {
        simplefin_account_id: "ACT-123",
        institution_name: "First Bank",
        account_name: "Everyday Checking",
        currency: "USD",
        balance: 1204.36,
        available_balance: 1100,
        balance_date: "2025-07-20T00:00:00.000Z",
        last_synced_at: SYNCED_AT,
      },
    ])
  })

  it("falls back to the org domain, then a placeholder, for the institution", () => {
    const [byDomain] = mapSimpleFinAccounts(
      [sfAccount({ org: { domain: "firstbank.example" } })],
      SYNCED_AT,
    ).rows
    expect(byDomain.institution_name).toBe("firstbank.example")

    const [noOrg] = mapSimpleFinAccounts([sfAccount({ org: undefined })], SYNCED_AT).rows
    expect(noOrg.institution_name).toBe("Unknown bank")
  })

  it("tolerates a missing balance-date and available-balance", () => {
    const { rows } = mapSimpleFinAccounts(
      [sfAccount({ "balance-date": undefined, "available-balance": undefined })],
      SYNCED_AT,
    )
    expect(rows[0].balance_date).toBeNull()
    expect(rows[0].available_balance).toBeNull()
  })

  it("skips accounts with no id or an unreadable balance, with a reason", () => {
    const { rows, skipped } = mapSimpleFinAccounts(
      [
        sfAccount({ id: "  " }),
        sfAccount({ id: "ACT-2", balance: "not-a-number" }),
        sfAccount({ id: "ACT-3" }),
      ],
      SYNCED_AT,
    )
    expect(rows.map((row) => row.simplefin_account_id)).toEqual(["ACT-3"])
    expect(skipped).toHaveLength(2)
    expect(skipped[0]).toContain("no SimpleFIN account id")
    expect(skipped[1]).toContain("unreadable balance")
  })
})

describe("parseAccessUrl", () => {
  it("splits credentials into a Basic auth header and strips them from the URL", () => {
    const { baseUrl, authorization } = parseAccessUrl(
      "https://user:pass@beta-bridge.simplefin.org/simplefin",
    )
    expect(baseUrl).toBe("https://beta-bridge.simplefin.org/simplefin")
    expect(authorization).toBe(
      `Basic ${Buffer.from("user:pass").toString("base64")}`,
    )
  })

  it("decodes percent-encoded credentials before encoding to base64", () => {
    const { authorization } = parseAccessUrl(
      "https://us%40er:p%23ss@bridge.example/simplefin",
    )
    expect(authorization).toBe(
      `Basic ${Buffer.from("us@er:p#ss").toString("base64")}`,
    )
  })

  it("rejects URLs without embedded credentials", () => {
    expect(() => parseAccessUrl("https://bridge.example/simplefin")).toThrow(
      /must embed credentials/,
    )
  })

  it("rejects garbage that is not a URL", () => {
    expect(() => parseAccessUrl("not a url")).toThrow(/not a valid URL/)
  })
})
