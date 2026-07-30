import { describe, expect, it } from "vitest"
import {
  accountIdentityKey,
  guessAccountType,
  mapSimpleFinAccounts,
  reconcileBankAccounts,
  type BankAccountRow,
  type ExistingBankAccountRow,
} from "./sync"
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

function feedRow(overrides: Partial<BankAccountRow> = {}): BankAccountRow {
  return {
    simplefin_account_id: "ACT-1",
    institution_name: "Marcus by Goldman Sachs",
    account_name: "Marcus Saving (8462)",
    currency: "USD",
    balance: 60503.88,
    available_balance: null,
    balance_date: null,
    last_synced_at: SYNCED_AT,
    ...overrides,
  }
}

function storedRow(
  overrides: Partial<ExistingBankAccountRow> = {},
): ExistingBankAccountRow {
  return {
    id: "row-1",
    simplefin_account_id: "ACT-1",
    institution_name: "Marcus by Goldman Sachs",
    account_name: "Marcus Saving (8462)",
    currency: "USD",
    account_type: "savings",
    is_hidden: false,
    disconnected_at: null,
    ...overrides,
  }
}

describe("accountIdentityKey", () => {
  it("ignores case and whitespace differences from the bank", () => {
    expect(
      accountIdentityKey({
        institution_name: " Marcus by  Goldman Sachs ",
        account_name: "Marcus Saving (8462)",
        currency: "usd",
      }),
    ).toBe(
      accountIdentityKey({
        institution_name: "MARCUS BY GOLDMAN SACHS",
        account_name: "marcus saving (8462)",
        currency: "USD",
      }),
    )
  })

  it("separates accounts that differ only by masked number", () => {
    expect(
      accountIdentityKey({
        institution_name: "First Bank",
        account_name: "Checking (1111)",
        currency: "USD",
      }),
    ).not.toBe(
      accountIdentityKey({
        institution_name: "First Bank",
        account_name: "Checking (2222)",
        currency: "USD",
      }),
    )
  })
})

describe("reconcileBankAccounts", () => {
  it("updates a row whose SimpleFIN id is unchanged", () => {
    const plan = reconcileBankAccounts([storedRow()], [feedRow()], {
      canDisconnect: true,
    })
    expect(plan.inserts).toEqual([])
    expect(plan.disconnects).toEqual([])
    expect(plan.updates).toHaveLength(1)
    expect(plan.updates[0]).toMatchObject({ id: "row-1", relinked: false })
    expect(plan.updates[0].patch.balance).toBe(60503.88)
  })

  it("re-keys the existing row when a reconnect gives the account a new id", () => {
    const plan = reconcileBankAccounts(
      [storedRow({ account_type: "checking", is_hidden: true })],
      [feedRow({ simplefin_account_id: "ACT-NEW" })],
      { canDisconnect: true },
    )
    expect(plan.inserts).toEqual([])
    expect(plan.supersedes).toEqual([])
    expect(plan.disconnects).toEqual([])
    expect(plan.updates).toHaveLength(1)
    expect(plan.updates[0]).toMatchObject({ id: "row-1", relinked: true })
    // The re-keyed row keeps the owner's type and hidden flag — the patch
    // carries neither.
    expect(plan.updates[0].patch.simplefin_account_id).toBe("ACT-NEW")
    expect(plan.updates[0].patch).not.toHaveProperty("account_type")
    expect(plan.updates[0].patch).not.toHaveProperty("is_hidden")
  })

  it("clears the disconnected flag when a flagged account reappears", () => {
    const plan = reconcileBankAccounts(
      [storedRow({ disconnected_at: "2026-07-01T00:00:00.000Z" })],
      [feedRow({ simplefin_account_id: "ACT-NEW" })],
      { canDisconnect: true },
    )
    expect(plan.updates[0].patch.disconnected_at).toBeNull()
  })

  it("folds a duplicate left by an earlier reconnect into the live row", () => {
    const stale = storedRow({
      id: "row-old",
      simplefin_account_id: "ACT-OLD",
      account_type: "savings",
      is_hidden: true,
    })
    // The live row was inserted by a pre-fix sync, so it still carries the
    // automatic guess for its name/balance.
    const live = storedRow({
      id: "row-new",
      simplefin_account_id: "ACT-NEW",
      account_type: "savings",
    })
    const plan = reconcileBankAccounts(
      [stale, live],
      [feedRow({ simplefin_account_id: "ACT-NEW" })],
      { canDisconnect: true },
    )
    expect(plan.inserts).toEqual([])
    expect(plan.disconnects).toEqual([])
    expect(plan.supersedes).toEqual([
      { staleId: "row-old", liveId: "row-new", patch: { is_hidden: true } },
    ])
  })

  it("carries an owner-corrected type over, but never overwrites one", () => {
    const stale = storedRow({ id: "row-old", simplefin_account_id: "ACT-OLD" })
    const untouchedLive = storedRow({
      id: "row-new",
      simplefin_account_id: "ACT-NEW",
      // guessAccountType("Marcus Saving (8462)", …) === "savings"
      account_type: "savings",
    })
    const feed = [feedRow({ simplefin_account_id: "ACT-NEW" })]

    const adopted = reconcileBankAccounts(
      [{ ...stale, account_type: "checking" }, untouchedLive],
      feed,
      { canDisconnect: true },
    )
    expect(adopted.supersedes[0].patch).toEqual({ account_type: "checking" })

    const correctedLive = { ...untouchedLive, account_type: "checking" as const }
    const kept = reconcileBankAccounts(
      [{ ...stale, account_type: "loan" }, correctedLive],
      feed,
      { canDisconnect: true },
    )
    expect(kept.supersedes[0].patch).toEqual({})
  })

  it("inserts a genuinely new account with a type guess", () => {
    const plan = reconcileBankAccounts(
      [storedRow()],
      [
        feedRow(),
        feedRow({
          simplefin_account_id: "ACT-2",
          account_name: "Venture X (1478)",
          balance: -1204.36,
        }),
      ],
      { canDisconnect: true },
    )
    expect(plan.inserts).toHaveLength(1)
    expect(plan.inserts[0]).toMatchObject({
      simplefin_account_id: "ACT-2",
      account_type: "credit_card",
    })
    expect(plan.disconnects).toEqual([])
  })

  /** A second, unrelated account — no identity overlap with storedRow(). */
  function otherStoredRow(
    overrides: Partial<ExistingBankAccountRow> = {},
  ): ExistingBankAccountRow {
    return storedRow({
      id: "row-2",
      simplefin_account_id: "ACT-2",
      institution_name: "First Bank",
      account_name: "Everyday Checking (1111)",
      account_type: "checking",
      ...overrides,
    })
  }

  it("flags an account the feed dropped, with a readable label", () => {
    const plan = reconcileBankAccounts([storedRow(), otherStoredRow()], [feedRow()], {
      canDisconnect: true,
    })
    expect(plan.disconnects).toEqual([
      { id: "row-2", label: "Everyday Checking (1111) at First Bank" },
    ])
  })

  it("never flags a missing account when the feed came back dirty", () => {
    const plan = reconcileBankAccounts([storedRow(), otherStoredRow()], [feedRow()], {
      canDisconnect: false,
    })
    expect(plan.disconnects).toEqual([])
    expect(plan.supersedes).toEqual([])
  })

  it("still folds a duplicate on a dirty feed — the live twin is proof, not absence", () => {
    const plan = reconcileBankAccounts(
      [storedRow({ id: "row-old", simplefin_account_id: "ACT-OLD", is_hidden: true }), storedRow({ id: "row-new", simplefin_account_id: "ACT-NEW" })],
      [feedRow({ simplefin_account_id: "ACT-NEW" })],
      { canDisconnect: false },
    )
    expect(plan.supersedes).toEqual([
      { staleId: "row-old", liveId: "row-new", patch: { is_hidden: true } },
    ])
  })

  it("does not re-flag a row that is already disconnected", () => {
    const plan = reconcileBankAccounts(
      [storedRow(), otherStoredRow({ disconnected_at: "2026-07-01T00:00:00.000Z" })],
      [feedRow()],
      { canDisconnect: true },
    )
    expect(plan.disconnects).toEqual([])
  })

  it("inserts rather than guessing when two stored rows share an identity", () => {
    const plan = reconcileBankAccounts(
      [
        storedRow({ id: "row-a", simplefin_account_id: "ACT-A" }),
        storedRow({ id: "row-b", simplefin_account_id: "ACT-B" }),
      ],
      [feedRow({ simplefin_account_id: "ACT-NEW" })],
      { canDisconnect: true },
    )
    expect(plan.updates).toEqual([])
    expect(plan.inserts).toHaveLength(1)
    // Both stale rows are retired rather than silently merged into a row the
    // reconciler cannot prove is theirs.
    expect(plan.disconnects.map((entry) => entry.id)).toEqual(["row-a", "row-b"])
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
