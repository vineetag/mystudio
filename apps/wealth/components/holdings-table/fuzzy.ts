/**
 * Typo-tolerant matching for the holdings search box. Pure functions — no
 * dependency on React or the table components, so they're unit-testable.
 *
 * Matching rules, in order:
 * 1. Substring match always wins (exact behavior the search always had).
 * 2. Tokens of 3+ characters also match a field when they're within edit
 *    distance of one of the field's words, or of that word's prefix — so a
 *    partially typed word with a typo ("fidle" → "fidelity") still hits.
 *    Allowed edits: 1 for tokens of 3–5 chars, 2 for 6+.
 *
 * Distance is optimal string alignment (Damerau-Levenshtein): insert, delete,
 * substitute, or transpose adjacent characters, each costing 1 — transposition
 * matters because it's the most common real typo ("mircosoft").
 */

/** Tokens shorter than this never fuzzy-match — too noisy ("VO" ≈ "VT"). */
const FUZZY_MIN_TOKEN_LENGTH = 3

/**
 * Edit distance between `a` and `b`, capped at `maxDistance`: returns
 * `maxDistance + 1` as soon as the true distance is known to exceed the cap,
 * skipping the rest of the table.
 */
export function editDistance(a: string, b: string, maxDistance: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1

  // Rolling rows of the DP table; prevPrev enables the transposition case.
  let prevPrev: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)

  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(
        prev[j] + 1, // delete from a
        current[j - 1] + 1, // insert into a
        prev[j - 1] + substitutionCost,
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1) // transpose
      }
      current[j] = value
      if (value < rowMin) rowMin = value
    }
    if (rowMin > maxDistance) return maxDistance + 1
    prevPrev = prev
    prev = current
  }
  return Math.min(prev[b.length], maxDistance + 1)
}

/** Case-insensitive match of one search token against one field's text. */
export function fieldMatchesToken(field: string, token: string): boolean {
  const haystack = field.toLowerCase()
  if (haystack.includes(token)) return true
  if (token.length < FUZZY_MIN_TOKEN_LENGTH) return false

  const maxEdits = token.length >= 6 ? 2 : 1
  for (const word of haystack.split(/[^a-z0-9]+/)) {
    if (word.length === 0) continue
    if (editDistance(token, word, maxEdits) <= maxEdits) return true
    // Prefix comparison: a mid-word typo while still typing the word.
    if (
      word.length > token.length &&
      editDistance(token, word.slice(0, token.length), maxEdits) <= maxEdits
    ) {
      return true
    }
  }
  return false
}

/**
 * Every whitespace-separated token must match at least one field, so
 * "apple fidelity" finds the AAPL position held at Fidelity while a token
 * with no match anywhere filters the row out. Tokens must be lowercase.
 */
export function matchesTokens(tokens: string[], fields: (string | null)[]): boolean {
  return tokens.every((token) =>
    fields.some((field) => field !== null && fieldMatchesToken(field, token)),
  )
}
