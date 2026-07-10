// Module boundary — import account functionality from here only.
// (Client components import server actions from ./actions and UI labels
// from ./labels directly — this index pulls in server-only queries.)

export type { Account, AccountType, AccountSource } from "./types"
export { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_OPTIONS } from "./labels"
export {
  listOwnerAccountsWithHoldings,
  listViewerAccountsWithHoldings,
  rowToAccount,
  rowToHolding,
} from "./queries"
export type { AccountWithHoldings } from "./queries"
