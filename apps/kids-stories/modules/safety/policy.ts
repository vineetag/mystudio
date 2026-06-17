/**
 * Story-safety policy — PURE logic, no AI, no I/O. This is the agent's
 * rulebook: what we screen for and where the line is. Keeping it pure makes the
 * decision unit-testable and cheap to reason about, separate from the model call.
 */

/** Categories the screener evaluates. Tuned for a 3–9 year-old audience. */
export const SAFETY_CATEGORIES = [
  "violence",
  "scary_peril",
  "sexual_or_romance",
  "death_or_grief",
  "hate_or_discrimination",
  "unsafe_behavior", // e.g. encouraging kids to do dangerous things
  "frightening_imagery",
  "mature_themes",
] as const

export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number]

/** Severity per category: 0 none, 1 mild, 2 concerning, 3 severe. */
export type SeverityLevel = 0 | 1 | 2 | 3

export interface CategoryScore {
  category: SafetyCategory
  level: SeverityLevel
}

export interface SafetyVerdict {
  /** The model's own holistic call. */
  ageAppropriate: boolean
  /** Per-category severity scores. */
  scores: CategoryScore[]
  /** Short human-readable concerns, for logging/admin review. */
  concerns: string[]
}

export type SafetyAction = "allow" | "block"

/**
 * Any single category at or above this level blocks the story. Level 2
 * ("concerning") is the line — we'd rather over-block kids' content than ship
 * something a parent would object to.
 */
export const BLOCK_AT_LEVEL: SeverityLevel = 2

/**
 * Decide allow/block from a verdict. Blocks if the model flagged it OR any
 * category crosses the threshold — defense in depth against an over-generous
 * `ageAppropriate: true`.
 */
export function decideAction(verdict: SafetyVerdict): SafetyAction {
  if (!verdict.ageAppropriate) return "block"
  const crosses = verdict.scores.some((s) => s.level >= BLOCK_AT_LEVEL)
  return crosses ? "block" : "allow"
}
