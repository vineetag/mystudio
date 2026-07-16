// Module boundary — import SnapTrade functionality from here only.
// (Client components import server actions from ./actions directly — this
// index pulls in server-only client/sync code. Same convention as
// modules/accounts.)

export { isSnapTradeConfigured } from "./client"
export { listConnections } from "./queries"
export { syncSnapTradeHoldings, syncAllSnapTradeUsers } from "./sync"
export { getOrRegisterStUser } from "./users"
export type { ConnectionStatus, SnapTradeConnection, SyncReport } from "./types"
