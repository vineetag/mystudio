import { describe, expect, it } from "vitest"
import { computeChangeChips, indexTo100 } from "./changes"

const TODAY = "2026-07-08"

function snap(snapshotDate: string, totalValue: number) {
  return { snapshotDate, totalValue }
}

describe("computeChangeChips", () => {
  it("computes D/D, W/W, M/M against exact baselines", () => {
    const chips = computeChangeChips(
      110,
      [snap("2026-06-08", 100), snap("2026-07-01", 105), snap("2026-07-07", 110)],
      TODAY,
    )
    expect(chips).toEqual([
      { label: "D/D", abs: 0, pct: 0, baselineDate: "2026-07-07" },
      { label: "W/W", abs: 5, pct: (5 / 105) * 100, baselineDate: "2026-07-01" },
      { label: "M/M", abs: 10, pct: 10, baselineDate: "2026-06-08" },
    ])
  })

  it("falls back to the nearest earlier snapshot over weekends/gaps", () => {
    // No snapshot exactly 1 day back (target 07-07); Friday 07-03 serves as
    // the D/D baseline. It is AFTER the W/W target (07-01), so no W/W chip —
    // a baseline is never newer than its period.
    const chips = computeChangeChips(102, [snap("2026-07-03", 100)], TODAY)
    expect(chips.map((chip) => chip.label)).toEqual(["D/D"])
    expect(chips[0].baselineDate).toBe("2026-07-03")
    expect(chips[0].pct).toBe(2)
  })

  it("omits periods with no baseline yet — day one shows no chips", () => {
    expect(computeChangeChips(100, [], TODAY)).toEqual([])
    // Only today's own row exists: still nothing to compare against.
    expect(computeChangeChips(100, [snap(TODAY, 100)], TODAY)).toEqual([])
  })

  it("ignores zero-value baselines rather than dividing by zero", () => {
    expect(computeChangeChips(100, [snap("2026-07-07", 0)], TODAY)).toEqual([])
  })
})

describe("indexTo100", () => {
  it("indexes a series to 100 at its first known value", () => {
    const result = indexTo100([50, 55, null, 60])
    expect(result[0]).toBe(100)
    expect(result[1]).toBeCloseTo(110)
    expect(result[2]).toBeNull()
    expect(result[3]).toBeCloseTo(120)
  })

  it("skips leading nulls when picking the base", () => {
    expect(indexTo100([null, 200, 210])).toEqual([null, 100, 105])
  })

  it("returns all nulls when there is no usable base", () => {
    expect(indexTo100([null, null])).toEqual([null, null])
  })

  it("bases on the first positive value, plotting earlier zeros as 0", () => {
    expect(indexTo100([0, 10])).toEqual([0, 100])
  })
})
