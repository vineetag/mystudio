import type { BankAccount } from "./types"

/**
 * Fabricated cash and liability accounts for demo mode. RLS keeps real
 * pt_bank_accounts rows owner-only (demo reads return []), so the demo
 * dashboard serves this fixture instead — no migration, no seeded rows,
 * and zero chance of real balances leaking into demo.
 *
 * Balances follow the SimpleFIN sign convention the UI already handles:
 * negative = owed (credit cards, loans).
 */

type DemoBankSeed = {
  institutionName: string
  accountName: string
  accountType: BankAccount["accountType"]
  balance: number
}

const DEMO_BANK_SEEDS: DemoBankSeed[] = [
  {
    institutionName: "Chase",
    accountName: "Total Checking",
    accountType: "checking",
    balance: 8425.19,
  },
  {
    institutionName: "Chase",
    accountName: "Sapphire Preferred",
    accountType: "credit_card",
    balance: -2314.62,
  },
  {
    institutionName: "Ally Bank",
    accountName: "Online Savings",
    accountType: "savings",
    balance: 32750.0,
  },
  {
    institutionName: "American Express",
    accountName: "Blue Cash Everyday",
    accountType: "credit_card",
    balance: -876.4,
  },
  {
    institutionName: "SoFi",
    accountName: "Personal Loan",
    accountType: "loan",
    balance: -11200.0,
  },
]

/**
 * Demo bank accounts with fresh-looking timestamps — computed per call so
 * "as of" always reads as a recent sync, never a stale baked date.
 */
export function getDemoBankAccounts(): BankAccount[] {
  const now = Date.now()
  return DEMO_BANK_SEEDS.map((seed, index) => ({
    id: `demo-bank-${index}`,
    simplefinAccountId: `demo/${index}`,
    institutionName: seed.institutionName,
    accountName: seed.accountName,
    accountType: seed.accountType,
    currency: "USD",
    balance: seed.balance,
    availableBalance: null,
    // Stagger a little so the fixture doesn't look machine-stamped.
    balanceDate: new Date(now - (index + 2) * 47 * 60 * 1000).toISOString(),
    lastSyncedAt: new Date(now - 35 * 60 * 1000).toISOString(),
    isHidden: false,
    createdAt: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
  }))
}
