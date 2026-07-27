import { describe, expect, it } from "vitest"
import { buildDemoSnapshots } from "./demo-data"
import { computeChangeChips } from "./changes"

describe("buildDemoSnapshots", () => {
  it("returns an empty series for a non-positive anchor", () => {
    expect(buildDemoSnapshots(0)).toEqual([])
    expect(buildDemoSnapshots(-5)).toEqual([])
  })

  it("is deterministic for the same anchor", () => {
    expect(buildDemoSnapshots(250_000)).toEqual(buildDemoSnapshots(250_000))
  })

  it("ends yesterday, just under the anchor value", () => {
    const series = buildDemoSnapshots(100_000)
    const last = series[series.length - 1]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    expect(last.snapshotDate).toBe(yesterday)
    expect(last.totalValue).toBeGreaterThan(90_000)
    expect(last.totalValue).toBeLessThan(100_000)
  })

  it("has no nulls and strictly increasing dates", () => {
    const series = buildDemoSnapshots(100_000, 30)
    expect(series).toHaveLength(30)
    for (let i = 0; i < series.length; i++) {
      expect(series[i].spyClose).not.toBeNull()
      expect(series[i].qqqClose).not.toBeNull()
      expect(series[i].perAccount).toHaveLength(1)
      if (i > 0) {
        expect(series[i].snapshotDate > series[i - 1].snapshotDate).toBe(true)
      }
    }
  })

  it("yields plausible change chips against the anchor", () => {
    const anchor = 150_000
    const series = buildDemoSnapshots(anchor)
    const today = new Date().toISOString().slice(0, 10)
    const chips = computeChangeChips(anchor, series, today)
    expect(chips.map((chip) => chip.label)).toEqual(["D/D", "W/W", "M/M"])
    const dd = chips[0]
    expect(Math.abs(dd.pct)).toBeLessThan(2)
  })
})
