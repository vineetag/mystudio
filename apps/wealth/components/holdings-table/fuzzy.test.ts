import { describe, expect, it } from "vitest"
import { editDistance, fieldMatchesToken, matchesTokens } from "./fuzzy"

describe("editDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(editDistance("apple", "apple", 2)).toBe(0)
  })

  it("counts single insert / delete / substitute as 1", () => {
    expect(editDistance("aple", "apple", 2)).toBe(1)
    expect(editDistance("apples", "apple", 2)).toBe(1)
    expect(editDistance("appli", "apple", 2)).toBe(1)
  })

  it("counts an adjacent transposition as 1, not 2", () => {
    expect(editDistance("mircosoft", "microsoft", 2)).toBe(1)
  })

  it("caps at maxDistance + 1 when strings are far apart", () => {
    expect(editDistance("apple", "fidelity", 2)).toBe(3)
    expect(editDistance("ab", "abcdef", 1)).toBe(2)
  })
})

describe("fieldMatchesToken", () => {
  it("keeps plain substring matching", () => {
    expect(fieldMatchesToken("Apple Inc.", "app")).toBe(true)
    expect(fieldMatchesToken("AAPL", "aapl")).toBe(true)
  })

  it("matches a one-typo word", () => {
    expect(fieldMatchesToken("Fidelity Brokerage", "fidelty")).toBe(true)
    expect(fieldMatchesToken("Vanguard 500 Index Fund", "vangard")).toBe(true)
  })

  it("matches a transposition typo", () => {
    expect(fieldMatchesToken("Microsoft Corporation", "mircosoft")).toBe(true)
  })

  it("matches a typo in a partially typed word via the prefix rule", () => {
    expect(fieldMatchesToken("Fidelity Brokerage", "fidle")).toBe(true)
  })

  it("never fuzzy-matches tokens under 3 characters", () => {
    expect(fieldMatchesToken("VT", "vo")).toBe(false)
  })

  it("rejects unrelated words", () => {
    expect(fieldMatchesToken("Apple Inc.", "tesla")).toBe(false)
    expect(fieldMatchesToken("Charles Schwab", "fidelity")).toBe(false)
  })
})

describe("matchesTokens", () => {
  const fields = ["AAPL", "Apple Inc.", "Roth IRA", "Fidelity"]

  it("requires every token to match some field", () => {
    expect(matchesTokens(["apple", "fidelity"], fields)).toBe(true)
    expect(matchesTokens(["apple", "schwab"], fields)).toBe(false)
  })

  it("tolerates typos across different fields", () => {
    expect(matchesTokens(["aple", "fidelty"], fields)).toBe(true)
  })

  it("skips null fields", () => {
    expect(matchesTokens(["apple"], [null, "Apple Inc."])).toBe(true)
    expect(matchesTokens(["apple"], [null])).toBe(false)
  })
})
