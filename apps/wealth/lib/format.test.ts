import { describe, expect, it } from "vitest"
import { describeBalanceAge } from "./format"

const SYNCED_AT = "2026-07-30T21:37:33.000Z"

/**
 * The label renders in the viewer's timezone, so the expected day is derived
 * the same way rather than hard-coded — otherwise these assertions pass in
 * America/Los_Angeles and fail in CI's UTC.
 */
function localDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

describe("describeBalanceAge", () => {
  it("hides the hint when the bank reported within a day of our sync", () => {
    // Happen Bank: 1.5h behind — normal, nothing worth surfacing.
    expect(describeBalanceAge("2026-07-30T20:20:34.000Z", SYNCED_AT)).toEqual({
      label: null,
      isStale: false,
    })
  })

  it("shows a muted hint once the bank is a full day behind", () => {
    // Capital One: ~21h behind stays quiet, 25h behind does not.
    expect(describeBalanceAge("2026-07-30T00:07:23.000Z", SYNCED_AT).label).toBeNull()

    const dayBehind = describeBalanceAge("2026-07-29T20:00:00.000Z", SYNCED_AT)
    expect(dayBehind.label).toBe(`bank reported ${localDay("2026-07-29T20:00:00.000Z")}`)
    expect(dayBehind.isStale).toBe(false)
  })

  it("flags as stale past three days", () => {
    // Marcus: 8 days behind while the sync itself succeeded.
    const marcus = describeBalanceAge("2026-07-22T04:24:31.000Z", SYNCED_AT)
    expect(marcus.label).toBe(`bank reported ${localDay("2026-07-22T04:24:31.000Z")}`)
    expect(marcus.isStale).toBe(true)
  })

  it("returns no hint for a missing or unparseable balance date", () => {
    expect(describeBalanceAge(null, SYNCED_AT).label).toBeNull()
    expect(describeBalanceAge("not-a-date", SYNCED_AT).label).toBeNull()
  })

  it("never reports a bank as behind when it is ahead of our sync", () => {
    expect(describeBalanceAge("2026-07-31T02:00:00.000Z", SYNCED_AT)).toEqual({
      label: null,
      isStale: false,
    })
  })
})
