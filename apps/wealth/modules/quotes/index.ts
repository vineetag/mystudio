// Module boundary — import quote functionality from here only.

export type { Quote, QuoteView } from "./types"
export { getQuotes, type GetQuotesOptions } from "./engine"
export { QUOTE_TTL_MS } from "./cache"
