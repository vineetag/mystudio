import { runStructuredModel, SpendCapError } from "@/lib/ai"
import {
  SAFETY_CATEGORIES,
  decideAction,
  type CategoryScore,
  type SafetyAction,
  type SafetyCategory,
  type SafetyVerdict,
  type SeverityLevel,
} from "./policy"
import {
  SAFETY_SCHEMA,
  SAFETY_SYSTEM_PROMPT,
  buildSafetyUserContent,
} from "./prompt"
import { isSafetyEnabled } from "./config"

const ENABLED = isSafetyEnabled()
/**
 * If the screener itself fails (model/parse/transport error), do we allow or
 * block? Default "closed" (block) — for child safety we don't ship unscreened
 * content. Set STORY_SAFETY_FAIL_MODE=open to prefer availability.
 */
const FAIL_OPEN = process.env.STORY_SAFETY_FAIL_MODE === "open"

export interface ScreenInput {
  userId: string
  title: string
  content: string
}

export interface ScreenResult {
  action: SafetyAction
  /** Present when screening actually ran and parsed. */
  verdict?: SafetyVerdict
  /** Why we arrived at this action when no verdict is available. */
  reason?: "disabled" | "screening_unavailable"
}

const KNOWN = new Set<string>(SAFETY_CATEGORIES)

function clampLevel(n: unknown): SeverityLevel {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v) || v < 0) return 0
  return (v > 3 ? 3 : v) as SeverityLevel
}

/** Validate/normalize the model's raw JSON into a SafetyVerdict. */
function parseVerdict(raw: unknown): SafetyVerdict {
  const obj = (raw ?? {}) as Record<string, unknown>
  const rawScores = Array.isArray(obj.scores) ? obj.scores : []
  const scores: CategoryScore[] = rawScores
    .map((s) => s as Record<string, unknown>)
    .filter((s) => KNOWN.has(String(s.category)))
    .map((s) => ({
      category: String(s.category) as SafetyCategory,
      level: clampLevel(s.level),
    }))
  const concerns = Array.isArray(obj.concerns)
    ? obj.concerns.map(String).filter(Boolean)
    : []
  return {
    // Missing/invalid → treat as NOT appropriate (fail safe).
    ageAppropriate: obj.ageAppropriate === true,
    scores,
    concerns,
  }
}

/**
 * Screen a generated story for age-appropriateness BEFORE it's shown to a child.
 * This is a defense-in-depth layer on top of the strict generation prompt.
 *
 * Never throws for safety reasons — returns an action. It DOES rethrow
 * SpendCapError so the caller can surface the same "paused" message as
 * generation (a cost issue, not a safety verdict).
 */
export async function screenStory(input: ScreenInput): Promise<ScreenResult> {
  if (!ENABLED) return { action: "allow", reason: "disabled" }

  try {
    const raw = await runStructuredModel({
      userId: input.userId,
      system: SAFETY_SYSTEM_PROMPT,
      schema: SAFETY_SCHEMA,
      userContent: buildSafetyUserContent(input.title, input.content),
      maxTokens: 512,
    })
    const verdict = parseVerdict(raw)
    return { action: decideAction(verdict), verdict }
  } catch (err) {
    if (err instanceof SpendCapError) throw err // let the route map this to 503
    console.error("story-safety screening failed:", err)
    return {
      action: FAIL_OPEN ? "allow" : "block",
      reason: "screening_unavailable",
    }
  }
}

/** Friendly, specific message for a blocked story (per the clear-errors rule). */
export const UNSAFE_STORY_MESSAGE =
  "We held this story back because it didn't pass our kid-safety check. Please try generating again — a small change to your prompt usually does the trick."
