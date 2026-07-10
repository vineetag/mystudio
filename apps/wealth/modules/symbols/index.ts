// Module boundary — import symbol metadata from here only.
// (Client components import the URL helper from ./logo-url and the server
// action from ./actions directly — this index pulls in server-only code.)

export { getSymbols } from "./engine"
export type { GetSymbolsOptions } from "./engine"
export type { SymbolInfo } from "./types"
