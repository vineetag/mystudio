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
    expect(guessAccountType("High-Yield Savings")).toBe("savings")
    expect(guessAccountType("emergency saving fund")).toBe("savings")
  })

  it("defaults everything else to checking", () => {
    expect(guessAccountType("Everyday Checking")).toBe("checking")
    expect(guessAccountType("Premier Account")).toBe("checking")
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
