/** Per-ticker metadata: official name + logo domain, shared across live/demo. */
export interface SymbolInfo {
  symbol: string
  /** Official company/fund name; null until resolved or entered by the owner. */
  name: string | null
  /** Resolved company domain (drives the higher-quality logo image). */
  domain: string | null
  /** 'logodev' = auto-resolved (refreshable); 'manual' = owner-entered (kept). */
  nameSource: "logodev" | "manual"
}
