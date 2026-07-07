import { describe, expect, it } from "vitest"
import { shouldRefundClaimedSlot } from "./generation-quota"

describe("shouldRefundClaimedSlot", () => {
  it("refunds a claimed slot before a chargeable model attempt starts", () => {
    expect(
      shouldRefundClaimedSlot({ chargeableAttemptStarted: false }),
    ).toBe(true)
  })

  it("does not refund once a chargeable model attempt has started", () => {
    expect(
      shouldRefundClaimedSlot({ chargeableAttemptStarted: true }),
    ).toBe(false)
  })
})
