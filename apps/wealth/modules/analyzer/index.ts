// Module boundary — import visual-analyzer derivation from here only.
// Everything here is pure and client-safe (no server-only imports).

export {
  allocationBySector,
  allocationByAssetClass,
  positionSizes,
  tickerAccountBars,
  incomeBreakdown,
  foldSlices,
  OTHER,
  UNCLASSIFIED,
} from "./derive"
export type {
  Slice,
  Allocation,
  PositionSize,
  AccountSegment,
  TickerAccountBar,
  IncomeBar,
  IncomeBreakdown,
} from "./derive"
export { squarify } from "./treemap"
export type { TreemapInput, TreemapTile } from "./treemap"
