// Module boundary — import AI analysis functionality from here only.
// (Client components import server actions from ./actions and the pure
// pricing/type helpers from ./pricing and ./types directly — this index pulls
// in server-only queries.)

export type {
  Analysis,
  Budget,
  PromptKey,
  PromptTemplate,
  RunEstimate,
} from "./types"
export { isPromptKey } from "./types"
export {
  DEFAULT_TIER,
  MODELS,
  MODEL_TIERS,
  costUsd,
  estimateCost,
  estimateTokens,
  isModelTier,
} from "./pricing"
export type { CostEstimate, ModelSpec, ModelTier } from "./pricing"
export { renderTemplate, templateVars, TEMPLATE_VARS } from "./template"
export {
  buildHoldingContext,
  buildPortfolioContext,
  buildResearchContext,
} from "./context"
export { demoAnalysis } from "./demo"
export { getPromptTemplate, listPromptTemplates } from "./prompts"
export {
  currentMonth,
  countRecentRuns,
  getBudget,
  listAnalyses,
  RATE_LIMIT_PER_HOUR,
} from "./budget"
