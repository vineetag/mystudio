// Module boundary — import bank-account functionality from here only.
// (Client components import server actions from ./actions directly — this
// index pulls in server-only sync code. Same convention as modules/accounts.)

export { isSimpleFinConfigured } from "./simplefin"
export { getBankAccounts } from "./queries"
export { getDemoBankAccounts } from "./demo-data"
export { syncBankAccounts, BANK_SYNC_TTL_MS } from "./sync"
export { isLiabilityType } from "./types"
export type { BankAccount, BankAccountType, BankSyncReport } from "./types"
