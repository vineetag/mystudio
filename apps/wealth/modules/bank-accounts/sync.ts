import "server-only"

import { createServiceClient } from "@/lib/db"
import { fetchSimpleFinAccounts, type SimpleFinAccount } from "./simplefin"
import type { BankAccountType, BankSyncReport } from "./types"

/** Refresh balances at most every 6 hours (daily cron + on-visit top-ups). */
export const BANK_SYNC_TTL_MS = 6 * 60 * 60 * 1000

/**
 * Best-effort type guess — SimpleFIN has no native type field, and returns
 * every linked account (credit cards and loans included, not just deposit
 * accounts). Name signals first; a negative balance is how SimpleFIN reports
 * money owed, so it falls back to credit_card. Applied only when a row is
 * first inserted — the owner's manual correction in the UI is never
 * overwritten by a re-sync.
 */
export function guessAccountType(
  accountName: string,
  balance: number,
): BankAccountType {
  if (/mortgage|loan/i.test(accountName)) return "loan"
  if (/card|credit/i.test(accountName)) return "credit_card"
  if (/sav/i.test(accountName)) return "savings"
  if (balance < 0) return "credit_card"
  return "checking"
}

export interface BankAccountRow {
  simplefin_account_id: string
  institution_name: string
  account_name: string
  currency: string
  balance: number
  available_balance: number | null
  balance_date: string | null
  last_synced_at: string
}

function toBalance(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Map SimpleFIN accounts to pt_bank_accounts rows. Accounts without a usable
 * id or balance are skipped with a reason (reported alongside SimpleFIN's own
 * errors array so nothing fails silently).
 */
export function mapSimpleFinAccounts(
  accounts: SimpleFinAccount[],
  syncedAt: string = new Date().toISOString(),
): { rows: BankAccountRow[]; skipped: string[] } {
  const rows: BankAccountRow[] = []
  const skipped: string[] = []

  for (const account of accounts ?? []) {
    const id = typeof account?.id === "string" ? account.id.trim() : ""
    if (!id) {
      skipped.push(`${account?.name ?? "unnamed account"}: no SimpleFIN account id`)
      continue
    }
    const balance = toBalance(account.balance)
    if (balance === null) {
      skipped.push(`${account.name ?? id}: unreadable balance "${account.balance}"`)
      continue
    }
    const balanceDate =
      typeof account["balance-date"] === "number"
        ? new Date(account["balance-date"] * 1000).toISOString()
        : null

    rows.push({
      simplefin_account_id: id,
      institution_name: account.org?.name?.trim() || account.org?.domain || "Unknown bank",
      account_name: account.name?.trim() || "Unnamed account",
      currency: account.currency?.trim() || "USD",
      balance,
      available_balance: toBalance(account["available-balance"]),
      balance_date: balanceDate,
      last_synced_at: syncedAt,
    })
  }

  return { rows, skipped }
}

/** A pt_bank_accounts row as the reconciler needs to see it. */
export interface ExistingBankAccountRow {
  id: string
  simplefin_account_id: string
  institution_name: string
  account_name: string
  currency: string
  account_type: BankAccountType
  is_hidden: boolean
  disconnected_at: string | null
}

export interface BankAccountUpdate {
  id: string
  patch: Omit<BankAccountRow, "simplefin_account_id"> & {
    simplefin_account_id: string
    disconnected_at: null
  }
  /** True when the row was re-keyed to a new SimpleFIN id (reconnect). */
  relinked: boolean
}

/** A stale row whose account is already live under a different row. */
export interface BankAccountSupersede {
  staleId: string
  liveId: string
  /** Owner settings carried over from the stale row before it is deleted. */
  patch: { account_type?: BankAccountType; is_hidden?: boolean }
}

export interface BankReconciliation {
  inserts: (BankAccountRow & { account_type: BankAccountType })[]
  updates: BankAccountUpdate[]
  supersedes: BankAccountSupersede[]
  disconnects: { id: string; label: string }[]
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Stable identity for a bank account across SimpleFIN account ids. SimpleFIN
 * mints a new id every time a bank is unlinked and re-linked, so the id alone
 * cannot tell "new account" from "same account, reconnected". Institution +
 * account name + currency can: the name carries the masked account number
 * ("Marcus Saving (8462)"), which is what makes it unique within a bank.
 */
export function accountIdentityKey(row: {
  institution_name: string
  account_name: string
  currency: string
}): string {
  return [
    normalize(row.institution_name),
    normalize(row.account_name),
    normalize(row.currency),
  ].join("|")
}

function toPatch(row: BankAccountRow): BankAccountUpdate["patch"] {
  return { ...row, disconnected_at: null }
}

/**
 * Settings the stale row should hand to the live row before being deleted.
 * An owner correction on the live row always wins — the old type is adopted
 * only while the live row still carries the automatic guess. A hidden stale
 * row keeps the account hidden: re-linking a bank should not silently pull a
 * deliberately hidden account back into net worth.
 */
function inheritedSettings(
  stale: ExistingBankAccountRow,
  live: ExistingBankAccountRow,
  liveFeedRow: BankAccountRow,
): BankAccountSupersede["patch"] {
  const patch: BankAccountSupersede["patch"] = {}
  const liveIsUntouched =
    live.account_type ===
    guessAccountType(liveFeedRow.account_name, liveFeedRow.balance)
  if (liveIsUntouched && stale.account_type !== live.account_type) {
    patch.account_type = stale.account_type
  }
  if (stale.is_hidden && !live.is_hidden) patch.is_hidden = true
  return patch
}

/**
 * Work out what the feed means for the rows already stored, in four buckets:
 *
 * - update   — same SimpleFIN id, refresh the balance.
 * - relink   — id gone, but exactly one stored row has the same identity and
 *              is itself absent from the feed: the account was reconnected, so
 *              re-key that row rather than insert a twin. Keeps the row id,
 *              created_at, account_type and is_hidden.
 * - supersede — a stored row is absent while another stored row is live under
 *              the same identity. This is the duplicate a pre-fix reconnect
 *              already created; the stale row is deleted after handing its
 *              owner settings over.
 * - disconnect — absent with nothing replacing it. Flagged, never deleted.
 *
 * `canDisconnect` gates the last bucket only — supersede stays on regardless,
 * since it rests on a live row being present, not on an absence. SimpleFIN
 * returns a partial account
 * set when an institution errors, and treating that as a removal would drop
 * live accounts out of net worth. Callers pass false unless the feed came back
 * clean and non-empty. Ambiguous identities (two rows sharing one key) fall
 * back to insert / leave-alone rather than guessing.
 */
export function reconcileBankAccounts(
  existing: ExistingBankAccountRow[],
  rows: BankAccountRow[],
  options: { canDisconnect: boolean },
): BankReconciliation {
  const inserts: BankReconciliation["inserts"] = []
  const updates: BankAccountUpdate[] = []
  const supersedes: BankAccountSupersede[] = []
  const disconnects: BankReconciliation["disconnects"] = []

  const byAccountId = new Map(existing.map((row) => [row.simplefin_account_id, row]))
  /** Existing row ids the feed accounted for, by id match or relink. */
  const claimed = new Set<string>()
  /** Identity → the live row under it, plus how many live rows share it. */
  const liveByKey = new Map<
    string,
    { row: ExistingBankAccountRow; feedRow: BankAccountRow }
  >()
  const liveKeyCounts = new Map<string, number>()

  function markLive(
    key: string,
    row: ExistingBankAccountRow,
    feedRow: BankAccountRow,
  ) {
    liveByKey.set(key, { row, feedRow })
    liveKeyCounts.set(key, (liveKeyCounts.get(key) ?? 0) + 1)
  }

  const unmatchedFeedRows: BankAccountRow[] = []
  for (const row of rows) {
    const match = byAccountId.get(row.simplefin_account_id)
    if (!match) {
      unmatchedFeedRows.push(row)
      continue
    }
    claimed.add(match.id)
    updates.push({ id: match.id, patch: toPatch(row), relinked: false })
    markLive(accountIdentityKey(row), match, row)
  }

  // Relink candidates: stored rows the feed did not name by id.
  const candidatesByKey = new Map<string, ExistingBankAccountRow[]>()
  for (const row of existing) {
    if (claimed.has(row.id)) continue
    const key = accountIdentityKey(row)
    const bucket = candidatesByKey.get(key)
    if (bucket) bucket.push(row)
    else candidatesByKey.set(key, [row])
  }

  for (const row of unmatchedFeedRows) {
    const key = accountIdentityKey(row)
    const candidates = candidatesByKey.get(key) ?? []
    if (candidates.length === 1) {
      const target = candidates[0]
      claimed.add(target.id)
      candidatesByKey.delete(key)
      updates.push({ id: target.id, patch: toPatch(row), relinked: true })
      markLive(key, target, row)
      continue
    }
    inserts.push({
      ...row,
      account_type: guessAccountType(row.account_name, row.balance),
    })
  }

  for (const row of existing) {
    if (claimed.has(row.id)) continue
    const key = accountIdentityKey(row)
    const live = liveByKey.get(key)
    if (live && live.row.id !== row.id && liveKeyCounts.get(key) === 1) {
      supersedes.push({
        staleId: row.id,
        liveId: live.row.id,
        patch: inheritedSettings(row, live.row, live.feedRow),
      })
      continue
    }
    if (options.canDisconnect && row.disconnected_at === null) {
      disconnects.push({
        id: row.id,
        label: `${row.account_name} at ${row.institution_name}`,
      })
    }
  }

  return { inserts, updates, supersedes, disconnects }
}

/**
 * Persist the warnings from a sync so the dashboard can show them on page
 * load, not just in the response to a manual sync. A failure to write health
 * must never fail the sync itself — the balances are the point.
 */
async function recordSyncHealth(
  service: ReturnType<typeof createServiceClient>,
  errors: string[],
): Promise<void> {
  const { error } = await service
    .from("pt_bank_sync_health")
    .upsert({ id: true, errors, synced_at: new Date().toISOString() })
  if (error) {
    console.error(`Couldn't record bank sync health: ${error.message}`)
  }
}

/**
 * Pull balances from SimpleFIN and reconcile them into pt_bank_accounts.
 * Matching is by SimpleFIN account id first, then by stable identity so a
 * disconnect/reconnect re-keys the existing row instead of creating a
 * duplicate (see reconcileBankAccounts). New accounts get a type guess;
 * existing rows keep their (possibly owner-corrected) account_type and
 * is_hidden untouched. SimpleFIN's errors array is returned, logged, and
 * persisted — never swallowed. It is the only signal that a connection has
 * gone stale: bad connections keep serving cached balances, so nothing else
 * throws.
 */
export async function syncBankAccounts(): Promise<BankSyncReport> {
  const service = createServiceClient()
  const accountSet = await fetchSimpleFinAccounts()

  if (accountSet.errors.length > 0) {
    // SimpleFIN uses this for stale-connection and rate-limit warnings.
    console.error(`SimpleFIN reported errors: ${accountSet.errors.join(" | ")}`)
  }

  const { rows, skipped } = mapSimpleFinAccounts(accountSet.accounts)
  if (skipped.length > 0) {
    console.error(`SimpleFIN sync skipped accounts: ${skipped.join(" | ")}`)
  }

  const report: BankSyncReport = {
    accounts: rows.length,
    inserted: 0,
    updated: 0,
    relinked: 0,
    merged: 0,
    disconnected: 0,
    simplefinErrors: [...accountSet.errors, ...skipped],
  }
  // Written before the writes below so a warning survives even if one throws —
  // a failing sync is exactly when the owner needs to see why.
  await recordSyncHealth(service, report.simplefinErrors)

  if (rows.length === 0) return report

  const { data: existing, error: existingError } = await service
    .from("pt_bank_accounts")
    .select(
      "id, simplefin_account_id, institution_name, account_name, currency, account_type, is_hidden, disconnected_at",
    )
  if (existingError) {
    throw new Error(`Couldn't read existing bank accounts: ${existingError.message}`)
  }

  // A partial feed (some institution errored) must never read as "the account
  // was removed" — only a clean, non-empty response can retire a row.
  const canDisconnect = accountSet.errors.length === 0 && skipped.length === 0
  const plan = reconcileBankAccounts(
    (existing ?? []) as ExistingBankAccountRow[],
    rows,
    { canDisconnect },
  )

  if (plan.disconnects.length > 0) {
    // Money leaving the dashboard always needs a stated reason.
    report.simplefinErrors.push(
      ...plan.disconnects.map(
        (entry) =>
          `${entry.label} is no longer part of your SimpleFIN connection — it's been removed from the dashboard and from net worth.`,
      ),
    )
    await recordSyncHealth(service, report.simplefinErrors)
  }

  if (plan.inserts.length > 0) {
    const { error } = await service.from("pt_bank_accounts").insert(plan.inserts)
    if (error) throw new Error(`Couldn't insert bank accounts: ${error.message}`)
    report.inserted = plan.inserts.length
  }

  // Per-row updates (not a bulk upsert) so account_type and is_hidden are
  // never part of the write for existing rows.
  for (const update of plan.updates) {
    const { error } = await service
      .from("pt_bank_accounts")
      .update(update.patch)
      .eq("id", update.id)
    if (error) {
      throw new Error(
        `Couldn't update bank account ${update.patch.simplefin_account_id}: ${error.message}`,
      )
    }
    if (update.relinked) report.relinked++
    else report.updated++
  }

  // Settings first, then drop the duplicate — an interrupted merge leaves the
  // stale row in place rather than losing the owner's corrections.
  for (const supersede of plan.supersedes) {
    if (Object.keys(supersede.patch).length > 0) {
      const { error } = await service
        .from("pt_bank_accounts")
        .update(supersede.patch)
        .eq("id", supersede.liveId)
      if (error) {
        throw new Error(
          `Couldn't carry settings to the reconnected account: ${error.message}`,
        )
      }
    }
    const { error } = await service
      .from("pt_bank_accounts")
      .delete()
      .eq("id", supersede.staleId)
    if (error) {
      throw new Error(`Couldn't remove the duplicate bank account: ${error.message}`)
    }
    report.merged++
  }

  if (plan.disconnects.length > 0) {
    const { error } = await service
      .from("pt_bank_accounts")
      .update({ disconnected_at: new Date().toISOString() })
      .in(
        "id",
        plan.disconnects.map((entry) => entry.id),
      )
    if (error) {
      throw new Error(`Couldn't flag disconnected bank accounts: ${error.message}`)
    }
    report.disconnected = plan.disconnects.length
  }

  return report
}
