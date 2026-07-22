import { describe, expect, it } from "vitest"
import { computeChangeChips, flowAdjustedIndex, indexTo100 } from "./changes"

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

describe("flowAdjustedIndex", () => {
  function day(perAccount: [string, number][]) {
    return {
      totalValue: perAccount.reduce((sum, [, value]) => sum + value, 0),
      perAccount: perAccount.map(([accountId, value]) => ({
        accountId,
        name: accountId,
        value,
      })),
    }
  }

  it("chains day-over-day returns from overlapping accounts", () => {
    const result = flowAdjustedIndex([
      day([["a", 100], ["b", 100]]),
      day([["a", 105], ["b", 105]]), // +5%
      day([["a", 110.25], ["b", 110.25]]), // +5% again
    ])
    expect(result[0]).toBe(100)
    expect(result[1]).toBeCloseTo(105)
    expect(result[2]).toBeCloseTo(110.25)
  })

  it("ignores a newly connected account until its second snapshot", () => {
    const result = flowAdjustedIndex([
      day([["a", 100]]),
      // Huge total jump from connecting "b" — but "a" is flat, so no return.
      day([["a", 100], ["b", 900]]),
      // "b" is now in the overlap; both flat.
      day([["a", 100], ["b", 900]]),
    ])
    expect(result).toEqual([100, 100, 100])
  })

  it("treats an account pricing from zero as a flow, not a return", () => {
    const result = flowAdjustedIndex([
      day([["a", 100], ["k401", 0]]),
      // 401(k) holdings finally synced: 0 → 500 sits out; "a" moved +2%.
      day([["a", 102], ["k401", 500]]),
    ])
    expect(result[1]).toBeCloseTo(102)
  })

  it("excludes outlier same-account moves as intra-account flows", () => {
    const result = flowAdjustedIndex([
      // Partial first sync: the account held only a sliver of its holdings.
      day([["a", 5131], ["b", 100]]),
      // "a" jumps 45× (rest of holdings landed) — a flow; "b" is real: +1%.
      day([["a", 234532], ["b", 101]]),
    ])
    expect(result[1]).toBeCloseTo(101)
  })

  it("carries the index flat when no usable overlap exists", () => {
    const result = flowAdjustedIndex([
      day([["a", 5131]]),
      // Sole account jumped past the outlier cap — nothing usable to chain.
      day([["a", 234532]]),
      day([["a", 236877.32]]), // +1% on the now-stable account
    ])
    expect(result[0]).toBe(100)
    expect(result[1]).toBe(100)
    expect(result[2]).toBeCloseTo(101)
  })

  it("starts the chain at the first snapshot with positive value", () => {
    const result = flowAdjustedIndex([
      day([["a", 0]]),
      day([["a", 100]]),
      day([["a", 102]]),
    ])
    expect(result[0]).toBeNull()
    expect(result[1]).toBe(100)
    expect(result[2]).toBeCloseTo(102)
  })

  it("returns all nulls for an all-zero history", () => {
    expect(flowAdjustedIndex([day([["a", 0]]), day([["a", 0]])])).toEqual([
      null,
      null,
    ])
  })
})
