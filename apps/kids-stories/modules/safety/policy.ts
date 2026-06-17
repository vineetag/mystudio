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
 * Any single category at or above this level blocks the story. Level 3
 * ("severe") is the hard line. We deliberately do NOT block on level 2 alone:
 * a small Haiku screener over-scores ordinary, resolved bedtime tension (a lost
 * teddy, a dark forest) as "concerning", which false-positived wholesome
 * stories. Level 2 still matters — but only as corroboration below.
 */
export const BLOCK_AT_LEVEL: SeverityLevel = 3

/**
 * Level at which a category corroborates the model's holistic `ageAppropriate:
 * false` call. A bare flag with everything scored 0–1 is treated as the
 * screener being over-cautious, not a real problem.
 */
export const CORROBORATE_AT_LEVEL: SeverityLevel = 2

/**
 * Decide allow/block from a verdict. Blocks if:
 *  - any category is severe (>= BLOCK_AT_LEVEL), OR
 *  - the model flagged it AND at least one category corroborates (>= level 2).
 * This keeps real protection while ignoring a lone, uncorroborated
 * `ageAppropriate: false` that a cautious small model tends to emit on gentle
 * content.
 */
export function decideAction(verdict: SafetyVerdict): SafetyAction {
  if (verdict.scores.some((s) => s.level >= BLOCK_AT_LEVEL)) return "block"
  if (
    !verdict.ageAppropriate &&
    verdict.scores.some((s) => s.level >= CORROBORATE_AT_LEVEL)
  ) {
    return "block"
  }
  return "allow"
}
