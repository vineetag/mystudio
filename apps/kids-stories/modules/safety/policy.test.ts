import { describe, expect, it } from "vitest"
import {
  BLOCK_AT_LEVEL,
  CORROBORATE_AT_LEVEL,
  SAFETY_CATEGORIES,
  decideAction,
  type CategoryScore,
  type SafetyVerdict,
  type SeverityLevel,
} from "./policy"

/** Build a verdict, defaulting to a clean (all-zero) wholesome story. */
function verdict(overrides: Partial<SafetyVerdict> = {}): SafetyVerdict {
  return {
    ageAppropriate: true,
    scores: SAFETY_CATEGORIES.map((category) => ({ category, level: 0 })),
    concerns: [],
    ...overrides,
  }
}

/** Override a single category's level on an otherwise-clean verdict. */
function withScore(
  category: CategoryScore["category"],
  level: SeverityLevel,
  ageAppropriate = true,
): SafetyVerdict {
  return verdict({
    ageAppropriate,
    scores: SAFETY_CATEGORIES.map((c) => ({
      category: c,
      level: c === category ? level : 0,
    })),
  })
}

describe("decideAction", () => {
  it("allows a wholesome, all-zero story", () => {
    expect(decideAction(verdict())).toBe("allow")
  })

  it("allows mild, resolved tension (level 1)", () => {
    expect(decideAction(withScore("scary_peril", 1))).toBe("allow")
  })

  it("allows a lone, uncorroborated ageAppropriate:false (cautious small model)", () => {
    // Flagged false but every category is 0–1 → treat as over-caution, allow.
    expect(decideAction(verdict({ ageAppropriate: false }))).toBe("allow")
    expect(
      decideAction(withScore("scary_peril", 1, /* ageAppropriate */ false)),
    ).toBe("allow")
  })

  it("does NOT block on a level-2 score alone when the model says appropriate", () => {
    // Level 2 only corroborates a false flag; on its own it should not block.
    expect(decideAction(withScore("mature_themes", 2))).toBe("allow")
  })

  it("blocks when ageAppropriate:false is corroborated by a level-2 score", () => {
    expect(
      decideAction(withScore("death_or_grief", 2, /* ageAppropriate */ false)),
    ).toBe("block")
  })

  it("blocks any severe (level 3) category even if the model says appropriate", () => {
    expect(decideAction(withScore("violence", 3))).toBe("block")
  })

  it("blocks a severe (level 3) category regardless of the flag", () => {
    expect(
      decideAction(withScore("frightening_imagery", 3, /* ageAppropriate */ false)),
    ).toBe("block")
  })

  it("allows when scores array is empty and flag is true", () => {
    expect(decideAction(verdict({ scores: [] }))).toBe("allow")
  })

  it("allows when flagged false but scores array is empty (no corroboration)", () => {
    expect(decideAction(verdict({ ageAppropriate: false, scores: [] }))).toBe(
      "allow",
    )
  })

  it("keeps the documented threshold constants in sync with the logic", () => {
    expect(BLOCK_AT_LEVEL).toBe(3)
    expect(CORROBORATE_AT_LEVEL).toBe(2)
  })
})
